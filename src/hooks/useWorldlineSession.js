/**
 * Custom Hook: useWorldlineSession
 *
 * Fetches Client Session credentials from your backend
 * and manages the Worldline SDK Session lifecycle
 */

import { useState, useEffect } from 'react'
import { Session } from 'onlinepayments-sdk-client-js'

/**
 * Fetch session credentials from your backend
 * Your backend will use PSPID to create a Client Session via Worldline Server API
 * and return the credentials to the frontend
 */
async function fetchSessionCredentials(paymentContext = {}) {
  const defaultContext = {
    countryCode: 'AU',
    currencyCode: 'AUD',
    amount: 10000,
  }

  const context = { ...defaultContext, ...paymentContext }

  try {
    console.log('Fetching session credentials from backend...')

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const response = await fetch(`${apiUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    })

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    console.log('Session credentials received:', {
      clientSessionId: data.clientSessionId,
      customerId: data.customerId,
      clientApiUrl: data.clientApiUrl,
      assetUrl: data.assetUrl,
    })

    return data
  } catch (err) {
    console.error('Failed to fetch session credentials:', err)
    throw new Error('Could not initialize payment session: ' + err.message)
  }
}

/**
 * useWorldlineSession Hook
 *
 * Usage:
 * const { session, loading, error, paymentProducts } = useWorldlineSession({
 *   countryCode: 'AU',
 *   currencyCode: 'AUD',
 *   amount: 10000
 * })
 *
 * @param {Object} paymentContext - Optional payment context
 * @returns {Object} { session, loading, error, paymentProducts, retry }
 */
export function useWorldlineSession(paymentContext = {}) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentProducts, setPaymentProducts] = useState([])

  const initializeSession = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Get credentials from backend
      const credentials = await fetchSessionCredentials(paymentContext)

      // 2. Initialize SDK Session with credentials
      const newSession = new Session({
        clientSessionId: credentials.clientSessionId,
        customerId: credentials.customerId,
        clientApiUrl: credentials.clientApiUrl,
        assetUrl: credentials.assetUrl,
      })

      setSession(newSession)

      // 3. Load available payment products
      try {
        const context = {
          countryCode: paymentContext.countryCode || 'AU',
          amountOfMoney: {
            amount: paymentContext.amount || 10000,
            currencyCode: paymentContext.currencyCode || 'AUD',
          },
          isRecurring: false,
        }

        console.log('Loading payment products...')
        const products = await newSession.getBasicPaymentItems(context)
        console.log('Payment products loaded:', products.basicPaymentProducts)

        setPaymentProducts(products.basicPaymentProducts || [])
      } catch (err) {
        console.warn('Could not load payment products:', err.message)
        // Don't fail - product loading might not be required
      }
    } catch (err) {
      console.error('Session initialization failed:', err)
      setError(err.message)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  // Initialize session on mount or when context changes
  useEffect(() => {
    initializeSession()
  }, [])

  return {
    session,
    loading,
    error,
    paymentProducts,
    retry: initializeSession,
  }
}

export default useWorldlineSession
