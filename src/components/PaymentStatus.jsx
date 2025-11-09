import { useState, useEffect } from 'react'

export default function PaymentStatus({ onClose }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if returning from 3D Secure
    const params = new URLSearchParams(window.location.search)
    const paymentId = params.get('paymentId')
    const returnStatus = params.get('status')

    if (paymentId && returnStatus) {
      setStatus({
        paymentId,
        status: returnStatus,
        source: '3DS_RETURN'
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Check if we have a flag indicating we should show the modal
      const shouldShowModal = sessionStorage.getItem('showPaymentStatus')

      if (shouldShowModal === 'true') {
        const lastPaymentId = sessionStorage.getItem('lastPaymentId')
        const lastPaymentStatus = sessionStorage.getItem('lastPaymentStatus')

        if (lastPaymentId) {
          setStatus({
            paymentId: lastPaymentId,
            status: lastPaymentStatus,
            source: 'SESSION'
          })
        }

        // Clear the flag so modal doesn't show on refresh
        sessionStorage.removeItem('showPaymentStatus')
      }
    }
  }, [])

  const getStatusColor = (paymentStatus) => {
    switch (paymentStatus?.toUpperCase()) {
      case 'SUCCEEDED':
        return 'green'
      case 'PENDING':
        return 'yellow'
      case 'FAILED':
      case 'DECLINED':
        return 'red'
      default:
        return 'blue'
    }
  }

  const getStatusIcon = (paymentStatus) => {
    switch (paymentStatus?.toUpperCase()) {
      case 'SUCCEEDED':
        return '✓'
      case 'PENDING':
        return '⏳'
      case 'FAILED':
      case 'DECLINED':
        return '✗'
      default:
        return 'ℹ'
    }
  }

  const statusColor = status ? getStatusColor(status.status) : 'gray'

  if (!status) {
    return null
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50`}>
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-4 mb-4`}>
          <div className={`text-${statusColor}-700`}>
            <div className="text-3xl mb-2">{getStatusIcon(status.status)}</div>
            <h3 className="text-lg font-bold mb-1">
              {status.status?.toUpperCase() === 'SUCCEEDED' ? 'Payment Successful' :
               status.status?.toUpperCase() === 'FAILED' ? 'Payment Failed' :
               status.status?.toUpperCase() === 'DECLINED' ? 'Payment Declined' :
               status.status?.toUpperCase() === 'PENDING' ? 'Payment Pending' :
               'Payment Status'}
            </h3>
            <p className="text-sm">
              {status.status?.toUpperCase() === 'SUCCEEDED' ? 'Your payment has been processed successfully.' :
               status.status?.toUpperCase() === 'FAILED' ? 'There was an issue processing your payment.' :
               status.status?.toUpperCase() === 'DECLINED' ? 'Your payment was declined by the card issuer.' :
               status.status?.toUpperCase() === 'PENDING' ? 'Your payment is pending. You will receive confirmation shortly.' :
               'Your payment status has been updated.'}
            </p>
          </div>
        </div>

        <div className={`bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200`}>
          <div className="text-sm text-gray-600 mb-1">Payment ID</div>
          <div className="font-mono text-sm text-gray-900 break-all">{status.paymentId}</div>
        </div>

        <div className={`bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200`}>
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <div className={`font-semibold text-${statusColor}-700`}>
            {status.status?.toUpperCase()}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              sessionStorage.removeItem('lastPaymentId')
              sessionStorage.removeItem('lastPaymentStatus')
              setStatus(null)
              if (onClose) onClose()
            }}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            New Payment
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(status.paymentId)
            }}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            Copy ID
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          {status.source === '3DS_RETURN' ? '3D Secure authentication completed' : 'Payment processed'}
        </p>
      </div>
    </div>
  )
}
