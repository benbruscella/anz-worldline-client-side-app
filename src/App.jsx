import { useState, useEffect } from 'react'
import CardForm from './components/CardForm'
import PaymentHistory from './components/PaymentHistory'
import PaymentStatus from './components/PaymentStatus'
import * as localStorage from './utils/localStorage'

function App() {
  const [tokenHistory, setTokenHistory] = useState([])
  const [currentToken, setCurrentToken] = useState(null)

  // Load saved card from localStorage on mount
  useEffect(() => {
    const card = localStorage.load()
    if (card) {
      setCurrentToken(card)
      // Also populate token history with the loaded card
      setTokenHistory([{
        id: card.createdAt,
        token: JSON.stringify(card, null, 2),
        timestamp: new Date(card.createdAt).toLocaleString(),
      }])
      console.log('Loaded card from localStorage')
    }
  }, [])

  const handleTokenGenerated = (tokenJsonString) => {
    const newToken = {
      id: Date.now(),
      token: tokenJsonString,
      timestamp: new Date().toLocaleString(),
    }
    setTokenHistory([newToken, ...tokenHistory])

    // Also update currentToken so the charge form appears immediately
    const card = localStorage.load()
    if (card) {
      setCurrentToken(card)
    }
  }

  const handleTokenCleared = () => {
    setCurrentToken(null)
    setTokenHistory([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ANZ Worldline Payment Integration
          </h1>
          <p className="text-gray-600">
            Demo application showing SDK integration for payment processing
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <CardForm
              onTokenGenerated={handleTokenGenerated}
              currentToken={currentToken}
              onTokenCleared={handleTokenCleared}
            />
          </div>

          {/* Payment History & Charge Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <PaymentHistory
              tokenHistory={tokenHistory}
              currentToken={currentToken}
              onTokenCleared={handleTokenCleared}
            />
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      <PaymentStatus />
    </div>
  )
}

export default App
