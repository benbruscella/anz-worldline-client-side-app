export default function TokenLog({ tokens }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Token Log
      </h2>

      {tokens.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No tokens generated yet. Submit the payment form to generate tokens.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {tokens.map((item) => (
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
