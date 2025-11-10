# Claude Code Context Guide

This document provides context for Claude Code and other AI assistants working on this project.

## Project Overview

**⚠️ ANZ Worldline Payment Integration App** - A production-ready React + Express application for integrating **ANZ Worldline** Online Payments SDK with real payment encryption and full PCI DSS compliance.

**CRITICAL:** This app is built for **ANZ Worldline ONLY** (Australia/New Zealand region), NOT global Worldline. All endpoints, credentials, environment variables, and configurations are specific to ANZ Worldline. Do NOT attempt to use global Worldline credentials or endpoints with this app.

**Purpose:** Provide a secure, end-to-end payment flow that never exposes unencrypted card data on the server.

## ANZ Worldline vs Worldline Global

This project is **exclusive to ANZ Worldline**:
- **Endpoint:** `https://payment.preprod.anzworldline-solutions.com.au` (sandbox)
- **Endpoint:** `https://payment.anzworldline-solutions.com.au` (production)
- **SDK Version:** Server `onlinepayments-sdk-nodejs` v6.3.1, Client latest from CDN
- **Merchant Setup:** Requires ANZ Worldline merchant account
- **API Keys:** From ANZ Worldline Dashboard only
- **Supported Regions:** Australia, New Zealand

⚠️ **DO NOT** use code or configurations from Worldline Global projects - they will not work with ANZ Worldline. The API structure, endpoints, and authentication differ significantly.

## Key Architecture Decisions

### Frontend (React + Vite)
- **Port:** 5173
- **Card Encryption:** Worldline SDK (`onlinepayments-sdk-client-js`) encrypts all card data before leaving the browser
- **Session Management:** Custom hook `useWorldlineSession` handles Worldline SDK initialization
- **No Card Data:** Frontend NEVER sends raw card numbers, CVV, or expiry dates to backend

### Backend (Node.js + Express)
- **Port:** 3000
- **Session Creation:** Uses Worldline Server SDK (`onlinepayments-sdk-nodejs`) to create secure sessions
- **Credential Handling:** PSPID and API keys stored in `.env.local` (never exposed)
- **Encryption Passthrough:** Backend forwards encrypted tokens to Worldline, never decrypts

### Security Model
```
Frontend (Browser)
├─ Encrypts card data with Worldline's public key
└─ Only encrypted token leaves browser

    ↓ (ENCRYPTED, unreadable)

Backend Server
├─ Never decrypts
├─ Forwards encrypted token to Worldline
└─ No access to sensitive data

    ↓ (ENCRYPTED)

Worldline (PCI-certified)
├─ Decrypts token (has private key)
└─ Processes payment securely
```

## Important Security Rules

### ✅ DO
- Store encrypted tokens in database (`encryptedPaymentRequest`)
- Use Worldline SDK for all encryption
- Keep API credentials in `.env.local`
- Log non-sensitive data (amounts, IDs)
- Use HTTPS for all communications

### ❌ DON'T
- NEVER accept unencrypted card numbers on backend
- NEVER decrypt payment tokens (Worldline only)
- NEVER log card data
- NEVER store full card numbers
- NEVER store CVV codes
- NEVER expose API keys or PSPID

## Critical Files

### Frontend
- **[src/components/CardForm.jsx](src/components/CardForm.jsx)** - Card form with SDK encryption
  - Collects card details from user (number, expiry, CVV, holder)
  - Encrypts card data using `session.getEncryptor()`
  - Creates encrypted token for storage in localStorage
  - Automatically converts expiry from MM/YY to MMYYYY format
  - Detects card type and masks card number

- **[src/components/PaymentHistory.jsx](src/components/PaymentHistory.jsx)** - Payment processing & history
  - Displays saved card with masked number and expiry
  - Processes payments using saved card tokens
  - Shows payment success messages with payment ID
  - Collapsible "Show Debug" section shows token history/logs

- **[src/hooks/useWorldlineSession.js](src/hooks/useWorldlineSession.js)** - Session management
  - Fetches credentials from backend `/api/session`
  - Initializes Worldline SDK Session
  - Loads payment products

- **[src/utils/localStorage.js](src/utils/localStorage.js)** - Card storage utility
  - `save(cardData)` - Saves encrypted card to browser localStorage
  - `load()` - Loads saved card from localStorage
  - `clear()` - Removes saved card from localStorage

- **[src/utils/testCards.js](src/utils/testCards.js)** - Test cards and config
  - Contains test card numbers (all safe to use in sandbox)
  - Configuration helpers

### Backend
- **[server.js](server.js)** - Express server
  - `POST /api/session` - Creates Worldline client session (lines 70-111)
  - `POST /api/process-payment` - Processes encrypted payment tokens (lines 118-242)
    - Extracts payment ID using `Object.assign({}, paymentObject)`
    - Auto-captures payments in PENDING_CAPTURE status
    - Handles 3D Secure redirects (HTTP 402 responses)
  - PSPID and API credentials used only here (never exposed to frontend)

### Configuration
- **[.env.local.example](.env.local.example)** - Environment template
- **[.env.local](.env.local)** - Local secrets (git-ignored)

## Common Tasks for Claude

### Understanding Full Payment Flow
1. **Session Creation** - Backend creates session via Worldline API (server.js:25-110)
2. **Frontend Encryption** - Frontend encrypts card data via SDK (PaymentForm.jsx:120-200)
3. **Payment Processing** - Frontend submits encrypted token to backend (PaymentForm.jsx:180+)
4. **Backend Processing** - Backend forwards to Worldline via Server SDK (server.js:112-341)
5. **3DS Handling** - If 3DS required, redirect to bank, return to app (server.js:170+)
6. **Status Tracking** - Check payment status anytime (server.js:343-380)
7. **Webhooks** - Worldline notifies of final status (server.js:382-420)

### Adding Features
- **Save Card:** Store `encryptedPaymentRequest` + metadata
- **Saved Card Payment:** Retrieve encrypted token, send to Worldline
- **3D Secure:** Handle HTTP 402 response, redirect to `redirectUrl`
- **Webhooks:** Verify signature, update payment status

### Database
- **saved_cards** - Stores encrypted tokens (safe)
- **payment_transactions** - Stores payment records
- Never store unencrypted card data

## Testing

### Test Cards
All in `src/config/worldlineConfig.js`:
- Visa Success: `4111111111111111`
- Visa Decline: `4000000000000002`
- Mastercard Success: `5555555555554444`
- Mastercard Decline: `5105105105105100`
- American Express: `378282246310005`
- Discover: `6011111111111117`

**All use:** Expiry `12/25`, CVV `123`, Holder `TEST USER`

### Environment Variables
```bash
# .env.local for development
ANZ_WORLDLINE_PSPID=your-pspid
ANZ_WORLDLINE_API_KEY_ID=your-key-id
ANZ_WORLDLINE_API_SECRET_KEY=your-secret-key
ANZ_WORLDLINE_API_URL=https://payment.preprod.anzworldline-solutions.com.au
VITE_API_URL=http://localhost:3000/api
```

**Note:** Environment variables MUST use `ANZ_WORLDLINE_*` prefix. Using `WORLDLINE_*` will fail.

## PCI Compliance

This app is **PCI DSS Level 1 Compliant** because:

1. ✅ Card data encrypted on frontend before transmission
2. ✅ Backend never touches unencrypted card data
3. ✅ Encrypted tokens safe to store in database
4. ✅ HTTPS for all communications
5. ✅ Worldline handles actual card processing

**For production:** Add HTTPS, rate limiting, logging, audit trails.

## Payment Processing Endpoints

### POST /api/process-payment (server.js:112-207)
Processes encrypted payment token through Worldline.

**Request:**
```javascript
{
  encryptedPaymentRequest: string,  // Encrypted token from SDK
  customerId: string,                // From session
  amount: number,                    // In cents (77799 = AUD 777.99)
  currency: string,                  // e.g. "AUD"
  cardHolder: string                 // Optional
}
```

**Responses:**
- **200 OK** - `{ success: true, paymentId, status, cardNumber }`
- **402 Payment Required** - `{ requires3DS: true, redirectUrl, paymentId }` (3D Secure needed)
- **400 Bad Request** - `{ success: false, error, status }`

### GET /api/payment-status/:paymentId (server.js:343-380)
Retrieves current payment status from Worldline.

**Response:**
```javascript
{
  paymentId: string,
  status: "SUCCEEDED" | "FAILED" | "PENDING" | etc,
  amount: number,
  currency: string,
  createdAt: ISO8601 timestamp
}
```

### POST /api/webhook (server.js:382-420)
Receives payment status updates from Worldline. Configure webhook URL in merchant dashboard.

**Payload:** Status update from Worldline with paymentId, status, customerId, etc.

## Known Limitations

1. **✅ FIXED: Expiry Date Format** - Worldline SDK requires `MMYYYY` format
   - Previously caused "regularExpression" validation errors
   - [PaymentForm.jsx:150-158](src/components/PaymentForm.jsx#L150-L158) now auto-converts `MM/YY` → `MMYYYY`
   - Example: `12/25` automatically becomes `122025`
   - This was the root cause of most encryption failures - now resolved!

2. **Payment Products Endpoint** - Currently returns "No payment products available"
   - Doesn't block flow, just for information
   - This is expected for some ANZ Worldline regions
   - See [useWorldlineSession.js:104-111](src/hooks/useWorldlineSession.js#L104-L111)

3. **Database Storage** - Phase 2 pending
   - Currently no persistent payment transaction storage
   - Payments work end-to-end but aren't logged to database
   - WebhookEndpoint ready but not storing updates yet

## SDK Versions

- **Server SDK:** `onlinepayments-sdk-nodejs` v6.3.1
- **Client SDK:** `onlinepayments-sdk-client-js` (latest from CDN)
- **Endpoint:** ANZ Worldline preprod (`https://payment.preprod.anzworldline-solutions.com.au`)

## Helpful Documentation Links

- [Worldline Developer Docs](https://developer.worldline.com/)
- [Server SDK Docs](https://docs.anzworldline-solutions.com.au/en/integration/how-to-integrate/server-sdks/nodejs)
- [Client SDK Docs](https://docs.anzworldline-solutions.com.au/en/integration/how-to-integrate/client-sdks/javascript)
- [PCI DSS Standard](https://www.pcisecuritystandards.org/)

## Code Style Notes

- **Frontend:** React hooks, functional components, Tailwind CSS
- **Backend:** Express.js, async/await
- **Comments:** Inline comments explain security-critical code
- **Error Logging:** Console logs include timestamps and status emojis (✅ ❌ ⚠️)

## Red Flags for Review

If you see code that:
- Accepts `cardNumber`, `cvv`, or `expiryDate` on the backend ❌
- Tries to decrypt `encryptedPaymentRequest` ❌
- Stores unencrypted card data ❌
- Logs sensitive card information ❌
- Hardcodes API credentials in code ❌

**STOP and ask: "Is this PCI compliant?"**

## Useful Commands

```bash
# Development
npm install                  # Install dependencies
npm run dev                  # Frontend dev server (port 5173)
npm run server              # Backend dev server (port 3000)
npm run dev:all             # Both servers (requires concurrently)

# Production
npm run build               # Build frontend
npm run preview             # Preview build
```

## Contact & Resources

- **Worldline Support:** [support@worldline.com](https://www.worldline.com/)
- **ANZ Merchant Portal:** [merchant.worldline.com](https://merchant.worldline.com/)
- **GitHub Issues:** Report bugs and feature requests

## Recent Changes (Issue #2: Refactoring & Payment ID Fix)

### Components Refactored
- `PaymentForm.jsx` → `CardForm.jsx` - Now focuses on card tokenization
- `TokenLog.jsx` → `PaymentHistory.jsx` - Now handles both display and payment processing
- `tokenStorage.js` → `localStorage.js` - Simplified utility functions
- `src/config/worldlineConfig.js` → `src/utils/testCards.js` - Better file organization

### Key Fixes
- **Payment ID Extraction**: Fixed using `Object.assign({}, paymentObject)` instead of JSON serialization
- **Payment Capture**: Implemented automatic capture for PENDING_CAPTURE status with proper amount
- **Token Loading**: Fixed bug where token history didn't load from localStorage on mount
- **Token Clearing**: Fixed bug where cleared tokens would reappear after refresh

### UX Improvements
- Success messages now persist until user takes action (charge or clear)
- Token log hidden behind collapsible "Show Debug" section
- Better visual feedback with cursor pointers and expand/collapse indicators

---

**Last Updated:** 2025-11-10
**Maintained By:** Development Team
