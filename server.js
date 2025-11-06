/**
 * Worldline Payment Backend Server
 * Creates Worldline Client Sessions for frontend payment encryption
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
app.use(cors())
app.use(express.json())

const WORLDLINE_PSPID = process.env.WORLDLINE_PSPID
const WORLDLINE_API_KEY_ID = process.env.WORLDLINE_API_KEY_ID
const WORLDLINE_API_SECRET_KEY = process.env.WORLDLINE_API_SECRET_KEY

// Initialize SDK client once at startup
const client = init({
  apiKeyId: WORLDLINE_API_KEY_ID,
  secretApiKey: WORLDLINE_API_SECRET_KEY,
  host: 'payment.preprod.anzworldline-solutions.com.au',
  scheme: 'https',
  port: 443,
  integrator: 'WorldlinePaymentApp/1.0',
  enableLogging: true
})

// ============================================================================
// POST /api/session - Create Worldline Client Session
// ============================================================================

app.post('/api/session', async (req, res) => {
  try {
    if (!WORLDLINE_PSPID || !WORLDLINE_API_KEY_ID || !WORLDLINE_API_SECRET_KEY) {
      return res.status(500).json({
        error: 'Missing credentials',
        message: 'WORLDLINE_PSPID, WORLDLINE_API_KEY_ID, or WORLDLINE_API_SECRET_KEY not configured in .env.local'
      })
    }

    console.log('Creating session for PSPID:', WORLDLINE_PSPID)

    // Create session using SDK
    const sdkResponse = await client.sessions.createSession(WORLDLINE_PSPID, {})

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

const PORT = process.env.SERVER_PORT || 3000

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`)
  console.log(`   POST /api/session - Create Worldline Client Session\n`)
})

