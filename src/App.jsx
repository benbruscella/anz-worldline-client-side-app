import { useState } from 'react'
import PaymentForm from './components/PaymentForm'
import TokenLog from './components/TokenLog'

function App() {
  const [tokens, setTokens] = useState([])

  const handleTokenGenerated = (token) => {
    const newToken = {
      id: Date.now(),
      token,
      timestamp: new Date().toLocaleString(),
    }
    setTokens([newToken, ...tokens])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Worldline Payment Integration
          </h1>
          <p className="text-gray-600">
            Demo application showing SDK integration for payment processing
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Payment Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <PaymentForm onTokenGenerated={handleTokenGenerated} />
          </div>

          {/* Token Log Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <TokenLog tokens={tokens} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
