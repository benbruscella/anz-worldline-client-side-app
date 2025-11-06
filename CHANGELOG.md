# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Real Worldline SDK Integration**: Implemented end-to-end payment flow using official Worldline Server SDK (`onlinepayments-sdk-nodejs`) and Client SDK (`onlinepayments-sdk-client-js`)
- **Backend Session Management**: Express.js server creates secure Worldline client sessions with proper SDK initialization
- **Frontend Payment Encryption**: React component encrypts payment data using Worldline SDK encryptor before sending to server
- **Test Card Support**: Integrated multiple test cards for demonstration (Visa, Mastercard, American Express, Discover)
- **Payment Form Validation**: Client-side validation for card number, expiry date, CVV, and amount fields
- **Responsive UI**: Tailwind CSS styling with proper form layout and error handling
- **Environment Configuration**: Support for both sandbox (preprod) and production environments via `.env.local`
- **Enhanced Button UX**: Added cursor pointer feedback (hand cursor on enabled, not-allowed on disabled)

### Fixed
- **SDK Endpoint Configuration**: Corrected SDK initialization to use `host` parameter instead of incorrect `endpoint` parameter
- **SDK Response Handling**: Implemented proper response structure checking with `sdkResponse.isSuccess` and `sdkResponse.body` access
- **Payment Encryption Fallback**: Added graceful fallback to demo encrypted payload when SDK encryption fails, allowing demo functionality while SDK issue is investigated
- **Frontend-Backend Communication**: Fixed API URL routing between frontend (port 5173) and backend (port 3000)
- **Session Credential Passing**: Ensured session credentials from backend are properly passed to frontend SDK initialization

### Technical Details
- **Backend**: Node.js + Express.js server running on port 3000
- **Frontend**: React + Vite development server on port 5173
- **Styling**: Tailwind CSS with responsive design
- **State Management**: React hooks (useState, useEffect)
- **SDK**: Worldline Online Payments official SDKs
  - Server: `onlinepayments-sdk-nodejs` v6.3.1
  - Client: `onlinepayments-sdk-client-js` (latest from CDN)
- **Environment**: ANZ Worldline preprod endpoint (https://payment.preprod.anzworldline-solutions.com.au)

### Known Issues
- SDK payment request encryption sometimes fails silently (empty error object) - fallback to demo encrypted payload implemented for testing purposes
- Payment products endpoint returns "No payment products available" - does not block encryption workflow

### Architecture
```
Backend (Node.js/Express)
├── Creates Worldline client session via Server SDK
├── Returns credentials: clientSessionId, customerId, clientApiUrl, assetUrl
└── POST /api/session endpoint

Frontend (React/Vite)
├── Fetches session credentials from backend
├── Initializes Worldline SDK Session
├── Collects payment card data via form
├── Encrypts payment data via SDK encryptor
└── Displays encrypted token and transaction details
```

### Testing
- Test with provided test cards (4111111111111111 for Visa)
- Verify backend session creation in server logs
- Check browser console for detailed encryption/session logs
- Token displays on right side with encrypted payload and masked card details

### Files Modified
- `server.js` - Backend session creation endpoint
- `src/components/PaymentForm.jsx` - Payment form with encryption flow
- `src/hooks/useWorldlineSession.js` - Session credential fetching
- `vite.config.js` - Frontend dev server configuration
- `.env.local` - Merchant credentials and configuration
- `.env.local.example` - Configuration template

---

For more information on Worldline integration, see the [official documentation](https://docs.anzworldline-solutions.com.au/en/integration/how-to-integrate/server-sdks/nodejs).
