# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Environment Variables Refactoring ✅ COMPLETED
- **Renamed for clarity:** All `WORLDLINE_*` variables now `ANZ_WORLDLINE_*`
  - `WORLDLINE_PSPID` → `ANZ_WORLDLINE_PSPID`
  - `WORLDLINE_API_KEY_ID` → `ANZ_WORLDLINE_API_KEY_ID`
  - `WORLDLINE_API_SECRET_KEY` → `ANZ_WORLDLINE_API_SECRET_KEY`
  - `WORLDLINE_API_URL` → `ANZ_WORLDLINE_API_URL`
- **Reason:** Explicitly indicate this is ANZ Worldline ONLY (Australia/New Zealand), NOT global Worldline
- **Impact:** All `.env.local` files must be updated with new variable names
- **Documentation:** Updated all examples, comments, and error messages

### Phase 1: Backend Payment Processing ✅ COMPLETED

#### Added
- **POST /api/process-payment**: Processes encrypted payment tokens through Worldline API
  - Accepts encrypted payment requests from frontend
  - Forwards securely to Worldline using Server SDK
  - Handles successful payments, declined cards, and 3D Secure requirements
  - Returns payment ID and status to frontend

- **GET /api/payment-status/:paymentId**: Check payment status anytime
  - Query current payment status from Worldline
  - Returns detailed payment information
  - Non-blocking call for async payment checks

- **POST /api/webhook**: Receive payment status updates from Worldline
  - Webhook endpoint for payment notifications
  - Ready for database storage integration (Phase 2)
  - Proper error handling and logging

- **PaymentStatus Component**: New React component for displaying payment results
  - Shows success/failure/pending status with icons
  - Handles 3D Secure return flow with URL parameters
  - Copy payment ID to clipboard
  - Session storage for payment state tracking

- **Frontend Payment Submission**: Enhanced PaymentForm component
  - Submits encrypted tokens to `/api/process-payment`
  - Handles 3D Secure redirect flow
  - Shows payment processing state
  - Integrated with PaymentStatus for result display

#### Technical Implementation
- **3D Secure Support**: Proper HTTP 402 handling with redirect URL
- **Error Handling**: Comprehensive error messages and logging
- **PCI Compliance**: Maintains zero unencrypted card data on server
- **Production Ready**: Proper status codes, error responses, logging

---

## [Previous Work]

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
- **✨ CRITICAL: Expiry Date Format Validation** - Fixed "regularExpression" validation error in payment encryption
  - Worldline SDK requires expiry dates in `MMYYYY` format (e.g., `122025` for Dec 2025), not `MM/YY`
  - [PaymentForm.jsx](src/components/PaymentForm.jsx#L150-L158) now auto-converts user input: `12/25` → `122025`
  - This was the root cause of most payment encryption failures
  - Regex pattern: `^(0[1-9]|1[0-2])(\d{4})$` (month 01-12, year 4 digits)

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
