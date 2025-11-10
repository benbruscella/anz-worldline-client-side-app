import { useState } from 'react'
import * as localStorage from '../utils/localStorage'

export default function PaymentHistory({ tokenHistory, currentToken, onTokenCleared }) {
  const [formData, setFormData] = useState({ amount: '100.00' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [lastPaymentId, setLastPaymentId] = useState(null)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChargeWithToken = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    setSuccess(false)

    try {
      if (!currentToken) {
        setFormError('No token found')
        setFormLoading(false)
        return
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const paymentPayload = {
        cardToken: currentToken.cardToken,
        customerId: currentToken.customerId,
        amount: Math.round(parseFloat(formData.amount) * 100),
        currency: 'AUD',
        cardHolder: currentToken.cardHolder
      }

      const paymentResponse = await fetch(`${apiUrl}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      })

      const paymentResult = await paymentResponse.json()
      console.log('💳 Payment Response:', paymentResult)

      if (paymentResult.success) {
        console.log('✅ Payment successful, ID:', paymentResult.paymentId)
        setLastPaymentId(paymentResult.paymentId)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
      } else if (paymentResult.requires3DS) {
        setFormError('3D Secure authentication required. Check console for details.')
      } else {
        setFormError(paymentResult.error || 'Payment failed')
      }
    } catch (error) {
      setFormError(error.message || 'Payment processing failed')
    } finally {
      setFormLoading(false)
    }
  }

  const handleClearToken = () => {
    localStorage.clear()
    onTokenCleared()
    setFormError(null)
    setSuccess(false)
    setLastPaymentId(null)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {currentToken ? 'Charge Payment' : 'Token Log'}
      </h2>

      {/* Charge with Token Form - Show when token exists */}
      {currentToken && (
        <div className="space-y-4 mb-6">
          {/* Saved Card Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-green-800 mb-2">
                  💳 Saved Card Token
                </p>
                <p className="text-xs text-green-700 mb-1">
                  {currentToken.cardType} ending in {currentToken.maskedCardNumber?.slice(-4) || '****'}
                </p>
                <p className="text-xs text-green-600">
                  Expires: {currentToken.expiryDate}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Created: {new Date(currentToken.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearToken}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
              >
                Clear Token
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (AUD)
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="100.00"
              />
            </div>
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
                Payment ID: <span className="font-mono">{lastPaymentId}</span>
              </p>
            </div>
          )}

          {/* Charge Button */}
          <button
            type="button"
            onClick={handleChargeWithToken}
            disabled={formLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-2 px-4 rounded-md transition duration-200"
          >
            {formLoading ? 'Processing Payment...' : '💰 Charge Card with Token'}
          </button>
        </div>
      )}

      {/* Token Log */}
      {tokenHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No tokens generated yet. Submit the payment form to generate tokens.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {tokenHistory.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-gray-500">
                  {item.timestamp}
                </p>
                <button
                  onClick={() => copyToClipboard(item.token)}
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition"
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto break-words whitespace-pre-wrap">
                {item.token}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Console Output Information */}
      <div className="mt-6 p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
        <p className="font-semibold mb-2">Console Output:</p>
        <p className="text-xs">
          Open your browser's developer console (F12) to see detailed token logging and SDK interactions.
        </p>
      </div>
    </div>
  )
}
