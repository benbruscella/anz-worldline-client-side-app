import { useState, useEffect } from 'react'
import { PaymentRequest } from 'onlinepayments-sdk-client-js'
import { useWorldlineSession } from '../hooks/useWorldlineSession'
import { testCards, getTestCard } from '../utils/testCards'
import * as localStorage from '../utils/localStorage'

export default function CardForm({ onTokenGenerated, currentToken, onTokenCleared }) {
  const paymentContext = {
    countryCode: import.meta.env.VITE_COUNTRY_CODE || 'AU',
    currencyCode: import.meta.env.VITE_CURRENCY_CODE || 'AUD',
    amount: parseInt(import.meta.env.VITE_AMOUNT || '6767'),
  }

  // Use the custom hook to initialize Worldline session
  const { session, loading, error: sessionError, paymentProducts, retry } = useWorldlineSession(paymentContext)

  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [useTestCard, setUseTestCard] = useState(true)
  const [selectedTestCard, setSelectedTestCard] = useState(testCards[0])
  const [formData, setFormData] = useState({
    cardNumber: testCards[0].number,
    expiryDate: testCards[0].expiry,
    cvv: testCards[0].cvv,
    cardHolder: testCards[0].holder,
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

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // **SCENARIO 2: Token Generation Handler**
  // Encrypts card data and stores the encrypted payload as a reusable token in localStorage
  const handleTokenize = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

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

      // Create PaymentRequest object with card details to generate a card token
      const paymentRequest = new PaymentRequest()
      paymentRequest.setPaymentProductId(1)

      // Try to get payment product
      let paymentProduct
      try {
        paymentProduct = await session.getPaymentProduct(1)
        if (paymentProduct) {
          paymentRequest.setPaymentProduct(paymentProduct)
        }
      } catch (productErr) {
        console.warn('Could not get payment product:', productErr.message)
      }

      // Set field values
      const cleanCardNumber = formData.cardNumber.replace(/\s/g, '')
      let expiryDate = formData.expiryDate
      if (expiryDate && expiryDate.includes('/')) {
        const [month, year] = expiryDate.split('/')
        const fullYear = year.length === 2 ? `20${year}` : year
        expiryDate = `${month}${fullYear}`
      }

      paymentRequest.setValue('cardNumber', cleanCardNumber)
      paymentRequest.setValue('cvv', formData.cvv)
      paymentRequest.setValue('expiryDate', expiryDate)
      paymentRequest.setValue('cardholderName', formData.cardHolder)

      // **SCENARIO 1: SDK Validation**
      if (!paymentRequest.isValid()) {
        const validationErrors = paymentRequest.getErrorMessageIds()
        console.error('❌ SDK Validation failed:', validationErrors)
        const errorMessages = validationErrors.map(errorId => {
          const errorMap = {
            'luhn': 'Invalid card number (failed checksum)',
            'expirationDate': 'Card expired or invalid expiration date',
            'regularExpression': 'Invalid format detected',
            'length': 'Field length is incorrect',
            'range': 'Value is outside the allowed range',
            'required': 'This field is required'
          }
          return errorMap[errorId] || `Validation error: ${errorId}`
        })
        throw new Error(`Payment validation failed: ${errorMessages.join(', ')}`)
      }

      console.log('✅ SDK validation passed - encrypting...')

      // Encrypt the card details to generate a reusable card token
      const encryptor = session.getEncryptor()
      if (!encryptor) {
        throw new Error('Encryptor not available. Session may not be properly initialized.')
      }

      let cardToken
      try {
        cardToken = await Promise.race([
          encryptor.encrypt(paymentRequest),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Encryption timeout')), 5000))
        ])

        if (!cardToken) {
          throw new Error('Encryptor returned empty result')
        }

        console.log('✅ Card token generated')
      } catch (encryptError) {
        const errorMsg = encryptError?.message || encryptError?.toString?.() || 'Unknown encryption error'
        console.error('❌ Encryption failed:', errorMsg)
        throw new Error(`Payment encryption failed: ${errorMsg}`)
      }

      // Save token to localStorage with metadata
      const tokenData = {
        cardToken: cardToken,
        maskedCardNumber: maskCardNumber(formData.cardNumber),
        cardType: detectCardType(formData.cardNumber),
        cardHolder: formData.cardHolder,
        expiryDate: formData.expiryDate,
        paymentProductId: 1,
        customerId: session.customerId,
        createdAt: new Date().toISOString()
      }

      if (localStorage.save(tokenData)) {
        onTokenGenerated(JSON.stringify(tokenData, null, 2))
      } else {
        throw new Error('Failed to save card')
      }
    } catch (err) {
      console.error('❌ Tokenization error:', err?.message || err)
      const errorMsg = err?.message || (Array.isArray(err) ? err.join(', ') : err?.toString?.() || 'Failed to create token')
      setFormError(errorMsg)
    } finally {
      setFormLoading(false)
    }
  }



  const detectCardType = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\D/g, '')
    if (/^4/.test(cleanNumber)) return 'VISA'
    if (/^5[1-5]/.test(cleanNumber)) return 'MASTERCARD'
    if (/^3[47]/.test(cleanNumber)) return 'AMEX'
    if (/^6011/.test(cleanNumber)) return 'DISCOVER'
    return 'UNKNOWN'
  }

  const maskCardNumber = (cardNumber) => {
    const digits = cardNumber.replace(/\s/g, '')
    return digits.slice(-4).padStart(digits.length, '*')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Card Details
      </h2>

      <div className="space-y-4">
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
            disabled={!!currentToken}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${currentToken ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${fieldErrors.cardHolder ? 'border-red-500' : 'border-gray-300'
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
            disabled={!!currentToken}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${currentToken ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${fieldErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
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
              disabled={!!currentToken}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${currentToken ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${fieldErrors.expiryDate ? 'border-red-500' : 'border-gray-300'
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
              disabled={!!currentToken}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${currentToken ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${fieldErrors.cvv ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="123"
            />
            {fieldErrors.cvv && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.cvv}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {formError && !storedToken && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
            ⚠️ {formError}
          </div>
        )}

        {/* Generate Token Button */}
        <button
          type="button"
          onClick={handleTokenize}
          disabled={formLoading || loading || !session || !!currentToken}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-2 px-4 rounded-md transition duration-200"
        >
          {currentToken ? '✅ Token Generated' : formLoading ? 'Creating Token...' : loading ? 'Initializing Session...' : !session ? 'Session Failed' : '🔐 Generate & Save Card Token'}
        </button>
      </div>
    </div>
  )
}
