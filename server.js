/**
 * ANZ Worldline Payment Backend Server
 * Creates ANZ Worldline Client Sessions for frontend payment encryption
 * Uses official OnlinePayments SDK for secure authentication
 *
 * Run: npm run server
 * Server: http://localhost:3000
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { init } from 'onlinepayments-sdk-nodejs'

dotenv.config({ path: '.env.local' })

const app = express()

// CORS Configuration
const CORS_ORIGIN = process.env.CORS_ORIGIN
const corsOptions = CORS_ORIGIN
  ? {
      origin: CORS_ORIGIN.split(',').map(origin => origin.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    }
  : { origin: '*' } // Development: allow all origins

app.use(cors(corsOptions))
app.use(express.json())

const ANZ_WORLDLINE_PSPID = process.env.ANZ_WORLDLINE_PSPID
const ANZ_WORLDLINE_API_KEY_ID = process.env.ANZ_WORLDLINE_API_KEY_ID
const ANZ_WORLDLINE_API_SECRET_KEY = process.env.ANZ_WORLDLINE_API_SECRET_KEY
const ANZ_WORLDLINE_API_URL = process.env.ANZ_WORLDLINE_API_URL || 'https://payment.preprod.anzworldline-solutions.com.au'

// Parse API URL to extract host, scheme, and port
function parseApiUrl(urlString) {
  try {
    const url = new URL(urlString)
    return {
      scheme: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80)
    }
  } catch (error) {
    console.error('Invalid ANZ_WORLDLINE_API_URL:', urlString)
    throw new Error('Invalid ANZ_WORLDLINE_API_URL format')
  }
}

const apiUrlConfig = parseApiUrl(ANZ_WORLDLINE_API_URL)

// Initialize SDK client once at startup
const client = init({
  apiKeyId: ANZ_WORLDLINE_API_KEY_ID,
  secretApiKey: ANZ_WORLDLINE_API_SECRET_KEY,
  host: apiUrlConfig.host,
  scheme: apiUrlConfig.scheme,
  port: apiUrlConfig.port,
  integrator: 'ANZWorldlinePaymentApp/1.0',
  enableLogging: true
})

// ============================================================================
// POST /api/session - Create ANZ Worldline Client Session
// ============================================================================

app.post('/api/session', async (req, res) => {
  try {
    if (!ANZ_WORLDLINE_PSPID || !ANZ_WORLDLINE_API_KEY_ID || !ANZ_WORLDLINE_API_SECRET_KEY) {
      return res.status(500).json({
        error: 'Missing credentials',
        message: 'ANZ_WORLDLINE_PSPID, ANZ_WORLDLINE_API_KEY_ID, or ANZ_WORLDLINE_API_SECRET_KEY not configured in .env.local'
      })
    }

    console.log(`Creating session for PSPID: ${ANZ_WORLDLINE_PSPID}`)
    console.log(`Using API endpoint: ${apiUrlConfig.scheme}://${apiUrlConfig.host}:${apiUrlConfig.port}`)

    // Create session using SDK
    const sdkResponse = await client.sessions.createSession(ANZ_WORLDLINE_PSPID, {})

    console.log('SDK Response:', sdkResponse)

    // Check if session creation was successful
    if (sdkResponse.isSuccess) {
      console.log('✅ Session created successfully')
      res.json({
        clientSessionId: sdkResponse.body.clientSessionId,
        customerId: sdkResponse.body.customerId,
        clientApiUrl: sdkResponse.body.clientApiUrl,
        assetUrl: sdkResponse.body.assetUrl,
      })
    } else {
      console.error('❌ Session creation failed:', sdkResponse.status, sdkResponse.body)
      res.status(sdkResponse.status).json({
        error: 'Failed to create session',
        details: sdkResponse.body
      })
    }
  } catch (error) {
    console.error('❌ Session creation error:', error.message)
    console.error('Full error:', error)
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message || error.toString()
    })
  }
})

// ============================================================================
// POST /api/process-payment - Process Payment with Stored Token
// ============================================================================
// Uses the encrypted token (stored in localStorage) to process payment

app.post('/api/process-payment', async (req, res) => {
  try {
    const {
      cardToken,
      customerId,
      amount,
      currency,
      cardHolder
    } = req.body

    // Validate required fields
    if (!cardToken || !customerId || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'cardToken, customerId, amount, and currency are required'
      })
    }

    console.log(`Processing payment: ${currency} $${(amount / 100).toFixed(2)}`)

    // Create payment using SDK with encrypted card token
    const paymentResponse = await client.payments.createPayment(
      ANZ_WORLDLINE_PSPID,
      {
        encryptedCustomerInput: cardToken,
        order: {
          amountOfMoney: {
            amount: Math.round(amount),
            currencyCode: currency
          },
          customer: {
            merchantCustomerId: customerId
          }
        }
      }
    )

    // Handle successful payment
    if (paymentResponse.isSuccess) {
      // SDK returns class instances - use Object.assign to extract all properties
      const payment = paymentResponse.body.payment
      const paymentData = Object.assign({}, payment)

      const paymentId = paymentData.id
      const paymentStatus = paymentData.status

      console.log(`✅ Payment authorized: ${paymentId} (Status: ${paymentStatus})`)

      // Auto-capture the payment if it's in PENDING_CAPTURE status
      if (paymentStatus === 'PENDING_CAPTURE') {
        try {
          console.log(`⏳ Capturing payment: ${paymentId}`)
          // Capture with the full authorized amount
          const captureResponse = await client.payments.capturePayment(
            ANZ_WORLDLINE_PSPID,
            paymentId,
            {
              amount: paymentData.paymentOutput?.amountOfMoney?.amount
            }
          )

          if (captureResponse.isSuccess) {
            const capturedData = Object.assign({}, captureResponse.body)
            const capturedStatus = capturedData.status
            console.log(`✅ Payment captured: ${paymentId} (Status: ${capturedStatus})`)

            res.json({
              success: true,
              paymentId: paymentId,
              status: capturedStatus,
              cardNumber: capturedData.captureOutput?.cardPaymentMethodSpecificOutput?.card?.cardNumber || 'N/A'
            })
          } else {
            console.error('❌ Payment capture failed')
            res.json({
              success: true,
              paymentId: paymentId,
              status: 'AUTHORIZED_PENDING_CAPTURE',
              cardNumber: paymentData.cardPaymentMethodSpecificOutput?.card?.cardNumber || 'N/A',
              note: 'Payment authorized but capture pending'
            })
          }
        } catch (captureError) {
          console.error('❌ Capture error:', captureError.message)
          // Return success even if capture fails - payment is authorized
          res.json({
            success: true,
            paymentId: paymentId,
            status: 'AUTHORIZED_PENDING_CAPTURE',
            cardNumber: paymentData.cardPaymentMethodSpecificOutput?.card?.cardNumber || 'N/A'
          })
        }
      } else {
        res.json({
          success: true,
          paymentId: paymentId,
          status: paymentStatus,
          cardNumber: paymentData.cardPaymentMethodSpecificOutput?.card?.cardNumber || 'N/A'
        })
      }
    }
    // Handle 3D Secure requirement (HTTP 402)
    else if (paymentResponse.status === 402) {
      console.log('⚠️ 3D Secure authentication required')
      const redirectUrl = paymentResponse.body.payment?.authentication?.redirectUrl

      res.status(402).json({
        requires3DS: true,
        paymentId: paymentResponse.body.payment?.id,
        redirectUrl: redirectUrl,
        message: 'Customer authentication required'
      })
    }
    // Handle payment declined or other errors
    else {
      console.error('❌ Payment failed:', paymentResponse.status, paymentResponse.body)
      res.status(400).json({
        success: false,
        error: 'Payment declined or processing failed',
        status: paymentResponse.body.payment?.status || 'FAILED',
        statusCode: paymentResponse.body.payment?.statusOutput?.statusCode || paymentResponse.status
      })
    }
  } catch (error) {
    console.error('❌ Payment processing error:', error.message)
    console.error('Full error:', error)
    res.status(500).json({
      error: 'Payment processing failed',
      message: error.message || error.toString()
    })
  }
})


const PORT = process.env.SERVER_PORT || 3000

app.listen(PORT, () => {
  console.log(`\n🚀 ANZ Worldline Payment Server running on http://localhost:${PORT}`)
  console.log(`   POST /api/session - Create ANZ Worldline Client Session`)
  console.log(`   POST /api/process-payment - Process payment with encrypted token\n`)
})

