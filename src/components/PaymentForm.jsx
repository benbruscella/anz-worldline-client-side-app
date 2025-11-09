import { useState, useEffect } from 'react'
import { PaymentRequest } from 'onlinepayments-sdk-client-js'
import { useWorldlineSession } from '../hooks/useWorldlineSession'
import { testCards, getTestCard } from '../config/worldlineConfig'

export default function PaymentForm({ onTokenGenerated }) {
  const paymentContext = {
    countryCode: import.meta.env.VITE_COUNTRY_CODE || 'AU',
    currencyCode: import.meta.env.VITE_CURRENCY_CODE || 'AUD',
    amount: parseInt(import.meta.env.VITE_AMOUNT || '6767'),
  }

  // Use the custom hook to initialize Worldline session
  const { session, loading, error: sessionError, paymentProducts, retry } = useWorldlineSession(paymentContext)

  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [useTestCard, setUseTestCard] = useState(true)
  const [selectedTestCard, setSelectedTestCard] = useState(testCards[0])
  const [formData, setFormData] = useState({
    cardNumber: testCards[0].number,
    expiryDate: testCards[0].expiry,
    cvv: testCards[0].cvv,
    cardHolder: testCards[0].holder,
    amount: (paymentContext.amount / 100).toFixed(2),
  })

  const handleTestCardChange = (e) => {
    const cardName = e.target.value
    const card = getTestCard(cardName)
    if (card) {
      setSelectedTestCard(card)
      setFormData({
        cardNumber: card.number,
        expiryDate: card.expiry,
        cvv: card.cvv,
        cardHolder: card.holder,
        amount: formData.amount,
      })
      setFormError(null)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }

  const handleToggleTestCard = (e) => {
    const isTestCard = e.target.checked
    setUseTestCard(isTestCard)
    if (isTestCard) {
      const card = selectedTestCard
      setFormData({
        cardNumber: card.number,
        expiryDate: card.expiry,
        cvv: card.cvv,
        cardHolder: card.holder,
        amount: formData.amount,
      })
    }
  }

  const validateFormData = () => {
    const errors = {}

    const cardDigits = formData.cardNumber.replace(/\s/g, '')
    if (!cardDigits || cardDigits.length < 13 || cardDigits.length > 19) {
      errors.cardNumber = 'Invalid card number'
    }

    if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      errors.expiryDate = 'Format: MM/YY'
    }

    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      errors.cvv = 'CVV must be 3-4 digits'
    }

    if (!formData.cardHolder.trim()) {
      errors.cardHolder = 'Card holder name required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    setSuccess(false)

    try {
      if (!validateFormData()) {
        setFormError('Please correct the errors below')
        setFormLoading(false)
        return
      }

      if (!session) {
        setFormError('Session not initialized. Click "Retry" or refresh the page.')
        setFormLoading(false)
        return
      }

      // Create payment request
      const paymentRequest = new PaymentRequest()

      // Create payment request with card payment product (ID 1)
      paymentRequest.setPaymentProductId(1)

      // Try to get payment product to validate field structure
      let paymentProduct
      try {
        paymentProduct = await session.getPaymentProduct(1)
        if (paymentProduct) {
          paymentRequest.setPaymentProduct(paymentProduct)
        }
      } catch (productErr) {
        console.warn('Could not get payment product:', productErr.message)
      }

      // Get field definitions and validators BEFORE setting values
      const fieldDefinitions = {}
      if (paymentProduct && paymentProduct.json && paymentProduct.json.fields) {
        paymentProduct.json.fields.forEach(field => {
          fieldDefinitions[field.id] = field
        })
      }

      // Set field values
      const cleanCardNumber = formData.cardNumber.replace(/\s/g, '')

      // Convert expiry date from MM/YY to MMYYYY format
      // SDK expects: MMYYYY (e.g., "122025" for December 2025)
      let expiryDate = formData.expiryDate
      if (expiryDate && expiryDate.includes('/')) {
        const [month, year] = expiryDate.split('/')
        // Convert 2-digit year to 4-digit year (25 -> 2025)
        const fullYear = year.length === 2 ? `20${year}` : year
        expiryDate = `${month}${fullYear}`
      }

      paymentRequest.setValue('cardNumber', cleanCardNumber)
      paymentRequest.setValue('cvv', formData.cvv)
      paymentRequest.setValue('expiryDate', expiryDate)
      paymentRequest.setValue('cardholderName', formData.cardHolder)

      console.log('PaymentRequest fields set and validated')

      // Encrypt the payment request using the SDK encryptor
      const encryptor = session.getEncryptor()

      if (!encryptor) {
        throw new Error('Encryptor not available. Session may not be properly initialized.')
      }

      let encryptedPaymentRequest
      try {
        // Encrypt payment request with 5-second timeout
        encryptedPaymentRequest = await Promise.race([
          encryptor.encrypt(paymentRequest),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Encryption timeout after 5 seconds')), 5000))
        ])

        if (!encryptedPaymentRequest) {
          throw new Error('Encryptor returned empty result')
        }

        console.log('✅ Payment encryption successful')
      } catch (encryptError) {
        const errorMsg = encryptError?.message || encryptError?.toString?.() || 'Unknown encryption error'
        console.error('❌ Encryption failed:', errorMsg)

        // Check if this is a timeout or actual encryption issue
        if (errorMsg.includes('timeout')) {
          throw new Error('Payment encryption is taking too long. This may indicate a network issue or SDK problem. Please try again.')
        }

        // For other encryption failures, provide diagnostic info
        throw new Error(`Payment encryption failed: ${errorMsg}. Please ensure your session is properly initialized and the SDK is loaded.`)
      }

      // Create token response with clear currency formatting
      const formattedAmount = `${paymentContext.currencyCode} $${parseFloat(formData.amount).toFixed(2)}`
      const token = {
        encryptedPaymentRequest: encryptedPaymentRequest,
        paymentAmount: formattedAmount, // More readable: "AUD $777.99"
        cardNumber: maskCardNumber(formData.cardNumber),
        cardHolder: formData.cardHolder,
        amountInCents: Math.round(parseFloat(formData.amount) * 100),
        currency: paymentContext.currencyCode,
        timestamp: new Date().toISOString(),
        paymentProductCount: paymentProducts.length,
        testMode: import.meta.env.VITE_TEST_MODE === 'true',
      }

      console.log('Generated Token:', token)
      onTokenGenerated(JSON.stringify(token, null, 2))

      // Submit encrypted token to backend for payment processing
      console.log('Submitting encrypted token to backend...')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const paymentPayload = {
        encryptedPaymentRequest: encryptedPaymentRequest,
        customerId: session.customerId,
        amount: token.amountInCents,
        currency: token.currency,
        cardHolder: formData.cardHolder
      }
      console.log('Payment payload:', paymentPayload)

      const paymentResponse = await fetch(`${apiUrl}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      })

      const paymentResult = await paymentResponse.json()
      console.log('Payment Response:', paymentResult)

      // Handle payment response
      if (paymentResponse.status === 402 && paymentResult.requires3DS) {
        // 3D Secure required - redirect to bank
        console.log('⚠️ 3D Secure authentication required')
        console.log('Redirecting to:', paymentResult.redirectUrl)
        // Store payment ID in session for reference
        sessionStorage.setItem('pendingPaymentId', paymentResult.paymentId)
        // Redirect to bank for authentication
        window.location.href = paymentResult.redirectUrl
      } else if (paymentResponse.ok && paymentResult.success) {
        // Payment successful
        console.log('✅ Payment successful:', paymentResult.paymentId)
        setSuccess(true)
        sessionStorage.setItem('lastPaymentId', paymentResult.paymentId)
        sessionStorage.setItem('lastPaymentStatus', paymentResult.status)
        sessionStorage.setItem('showPaymentStatus', 'true')
        setTimeout(() => setSuccess(false), 4000)

        // Reset form
        if (useTestCard) {
          const card = selectedTestCard
          setFormData({
            cardNumber: card.number,
            expiryDate: card.expiry,
            cvv: card.cvv,
            cardHolder: card.holder,
            amount: formData.amount,
          })
        }
      } else {
        // Payment failed
        const errorMsg = paymentResult.error || 'Payment processing failed'
        console.error('❌ Payment failed:', errorMsg)
        throw new Error(errorMsg)
      }
    } catch (err) {
      console.error('Payment error:', err)
      console.error('Error type:', typeof err)
      console.error('Error keys:', err ? Object.keys(err) : 'null')
      console.error('Error stack:', err?.stack)
      console.error('Error message:', err?.message)
      console.error('Error toString:', err?.toString())
      const errorMsg = err?.message || (Array.isArray(err) ? err.join(', ') : err?.toString?.() || 'Failed to process payment')
      setFormError(errorMsg)
    } finally {
      setFormLoading(false)
    }
  }

  const maskCardNumber = (cardNumber) => {
    const digits = cardNumber.replace(/\s/g, '')
    return digits.slice(-4).padStart(digits.length, '*')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Payment Details
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Session Status */}
        {sessionError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm font-medium mb-2">⚠️ Session Error</p>
            <p className="text-yellow-700 text-xs mb-2">{sessionError}</p>
            <button
              type="button"
              onClick={retry}
              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Test Card Toggle */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useTestCard"
              checked={useTestCard}
              onChange={handleToggleTestCard}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="useTestCard" className="text-sm font-medium text-gray-700">
              Use Test Card
            </label>
          </div>

          {useTestCard && (
            <div className="mt-3">
              <select
                value={selectedTestCard.name}
                onChange={handleTestCardChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {testCards.map(card => (
                  <option key={card.name} value={card.name}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Card Holder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Holder Name
          </label>
          <input
            type="text"
            name="cardHolder"
            value={formData.cardHolder}
            onChange={handleInputChange}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              fieldErrors.cardHolder ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John Doe"
          />
          {fieldErrors.cardHolder && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.cardHolder}</p>
          )}
        </div>

        {/* Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <input
            type="text"
            name="cardNumber"
            value={formData.cardNumber}
            onChange={handleInputChange}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
              fieldErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="4111 1111 1111 1111"
          />
          {fieldErrors.cardNumber && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.cardNumber}</p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleInputChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                fieldErrors.expiryDate ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12/25"
            />
            {fieldErrors.expiryDate && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.expiryDate}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              name="cvv"
              value={formData.cvv}
              onChange={handleInputChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                fieldErrors.cvv ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123"
            />
            {fieldErrors.cvv && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.cvv}</p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({paymentContext.currencyCode})
          </label>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-3 bg-gray-100 border border-gray-300 rounded-l-md text-gray-600 font-medium">
              $
            </span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
              step="0.01"
              min="0"
              className={`flex-1 px-3 py-2 border rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="100.00"
            />
          </div>
          {fieldErrors.amount && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.amount}</p>
          )}
        </div>

        {/* Error Message */}
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
            ⚠️ {formError}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-sm">
            <p className="font-semibold">✓ Payment processed successfully!</p>
            <p className="text-xs mt-1">
              Payment ID: <span className="font-mono">{sessionStorage.getItem('lastPaymentId')}</span>
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={formLoading || loading || !session}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-2 px-4 rounded-md transition duration-200"
        >
          {formLoading ? 'Processing...' : loading ? 'Initializing Session...' : !session ? 'Session Failed' : 'Encrypt & Generate Token'}
        </button>
      </form>

      {/* SDK Integration Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <p className="font-semibold mb-2">✅ Real SDK Integration:</p>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>Backend creates Client Session via Worldline Server API</li>
          <li>Frontend fetches credentials: {loading ? 'loading...' : session ? '✓ Ready' : '✗ Failed'}</li>
          <li>Payment products loaded: {paymentProducts.length} available</li>
          <li>Field validation enabled</li>
          <li>AES encryption via SDK encryptor</li>
          <li>Test cards available for demo testing</li>
        </ul>
      </div>

      {/* Configuration Display */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
        <p className="font-mono text-gray-600">
          {paymentContext.countryCode} | {paymentContext.currencyCode} | ${(paymentContext.amount / 100).toFixed(2)} | Test: {import.meta.env.VITE_TEST_MODE === 'true' ? 'ON' : 'OFF'}
        </p>
      </div>
    </div>
  )
}
