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
// POST /api/process-payment - Process Payment with Worldline
// ============================================================================

app.post('/api/process-payment', async (req, res) => {
  try {
    const {
      encryptedPaymentRequest,
      customerId,
      amount,
      currency,
      cardHolder
    } = req.body

    // Validate required fields
    if (!encryptedPaymentRequest || !customerId || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'encryptedPaymentRequest, customerId, amount, and currency are required'
      })
    }

    console.log(`Processing payment: ${currency} $${(amount / 100).toFixed(2)}`)

    // Create payment using SDK
    // The encryptedPaymentRequest should be passed as encryptedCustomerInput
    const paymentResponse = await client.payments.createPayment(
      ANZ_WORLDLINE_PSPID,
      {
        encryptedCustomerInput: encryptedPaymentRequest,
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

    console.log('Payment Response:', paymentResponse)

    // Handle successful payment
    if (paymentResponse.isSuccess) {
      const paymentStatus = paymentResponse.body.status
      console.log(`✅ Payment created: ${paymentResponse.body.id} (Status: ${paymentStatus})`)

      res.json({
        success: true,
        paymentId: paymentResponse.body.id,
        status: paymentStatus,
        cardNumber: paymentResponse.body.cardPaymentMethodSpecificOutput?.card?.cardNumber || 'N/A'
      })
    }
    // Handle 3D Secure requirement (HTTP 402)
    else if (paymentResponse.status === 402) {
      console.log('⚠️ 3D Secure authentication required')
      const redirectUrl = paymentResponse.body.authentication?.redirectUrl

      res.status(402).json({
        requires3DS: true,
        paymentId: paymentResponse.body.id,
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
        status: paymentResponse.body.status || 'FAILED',
        statusCode: paymentResponse.body.statusCode || paymentResponse.status
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

// ============================================================================
// GET /api/payment-status/:paymentId - Get Payment Status
// ============================================================================

app.get('/api/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params

    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId'
      })
    }

    console.log(`Checking payment status: ${paymentId}`)

    // Get payment status from ANZ Worldline
    const paymentResponse = await client.payments.getPayment(
      ANZ_WORLDLINE_PSPID,
      paymentId
    )

    if (paymentResponse.isSuccess) {
      const payment = paymentResponse.body
      console.log(`✅ Payment status: ${payment.status}`)

      res.json({
        paymentId: payment.id,
        status: payment.status,
        amount: payment.order?.amountOfMoney?.amount,
        currency: payment.order?.amountOfMoney?.currencyCode,
        createdAt: payment.createdDateUtc
      })
    } else {
      console.error('❌ Failed to get payment status:', paymentResponse.status)
      res.status(paymentResponse.status).json({
        error: 'Failed to get payment status',
        details: paymentResponse.body
      })
    }
  } catch (error) {
    console.error('❌ Payment status check error:', error.message)
    res.status(500).json({
      error: 'Failed to check payment status',
      message: error.message || error.toString()
    })
  }
})

// ============================================================================
// GET /api/payment-return - 3D Secure Return Handler
// ============================================================================

app.get('/api/payment-return', async (req, res) => {
  try {
    const { paymentId } = req.query

    if (!paymentId) {
      return res.json({
        error: true,
        message: 'Missing payment ID'
      })
    }

    console.log(`Processing 3DS return for payment: ${paymentId}`)

    // Get final payment status after 3DS authentication
    const paymentResponse = await client.payments.getPayment(
      ANZ_WORLDLINE_PSPID,
      paymentId
    )

    if (paymentResponse.isSuccess) {
      const status = paymentResponse.body.status
      console.log(`✅ 3DS return - Payment status: ${status}`)

      // Return payment result as JSON instead of redirect
      // Frontend can then update UI or redirect to payment result page
      res.json({
        success: true,
        paymentId: paymentId,
        status: status,
        message: 'Payment authentication completed'
      })
    } else {
      console.error('❌ Failed to get payment status after 3DS:', paymentResponse.status)
      res.status(400).json({
        success: false,
        error: 'Failed to get payment status after authentication',
        paymentId: paymentId
      })
    }
  } catch (error) {
    console.error('❌ 3DS return handler error:', error.message)
    res.status(500).json({
      success: false,
      error: 'Payment return handler error',
      message: error.message
    })
  }
})

// ============================================================================
// POST /api/webhook - Worldline Webhook Handler
// ============================================================================

app.post('/api/webhook', async (req, res) => {
  try {
    const { eventType, payment } = req.body

    // Validate webhook (in production, verify Worldline signature)
    // For now, accept all webhooks
    if (!payment || !payment.id) {
      return res.status(400).json({
        error: 'Invalid webhook payload'
      })
    }

    console.log(`Webhook received: ${eventType} for payment ${payment.id}`)
    console.log(`Payment status: ${payment.status}`)

    // TODO: Update database with payment status
    // Example: await updatePaymentStatus(payment.id, payment.status)

    res.json({
      received: true,
      paymentId: payment.id
    })
  } catch (error) {
    console.error('❌ Webhook processing error:', error.message)
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    })
  }
})

const PORT = process.env.SERVER_PORT || 3000

app.listen(PORT, () => {
  console.log(`\n🚀 ANZ Worldline Payment Server running on http://localhost:${PORT}`)
  console.log(`   POST /api/session - Create ANZ Worldline Client Session\n`)
})

