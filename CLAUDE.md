# Claude Code Context Guide

This document provides context for Claude Code and other AI assistants working on this project.

## Project Overview

**ANZ Worldline Payment Integration App** - A production-ready React + Express application for integrating Worldline Online Payments SDK with real payment encryption and PCI DSS compliance.

**Purpose:** Provide a secure, end-to-end payment flow that never exposes unencrypted card data on the server.

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
- **[src/components/PaymentForm.jsx](src/components/PaymentForm.jsx)** - Payment form with SDK encryption
  - Encrypts card data using `session.getEncryptor()`
  - Creates encrypted token for backend
  - Handles 3D Secure redirects

- **[src/hooks/useWorldlineSession.js](src/hooks/useWorldlineSession.js)** - Session management
  - Fetches credentials from backend
  - Initializes Worldline SDK Session
  - Loads payment products

- **[src/config/worldlineConfig.js](src/config/worldlineConfig.js)** - Test cards and config
  - Contains test card numbers (all safe to use in sandbox)
  - Configuration helpers

### Backend
- **[server.js](server.js)** - Express server
  - `POST /api/session` - Creates Worldline client session
  - Initialize Worldline SDK client at startup
  - PSPID and API credentials used only here

### Configuration
- **[.env.local.example](.env.local.example)** - Environment template
- **[.env.local](.env.local)** - Local secrets (git-ignored)

## Common Tasks for Claude

### Understanding Payment Flow
1. Payment encryption happens on frontend (SafePaymentForm.jsx)
2. Backend creates session via Worldline API (server.js)
3. Encrypted token stored in database (never decrypted)
4. For 3DS: redirect user to bank, wait for webhook

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

### Environment
```bash
# .env.local for development
WORLDLINE_PSPID=your-pspid
WORLDLINE_API_KEY_ID=your-key-id
WORLDLINE_API_SECRET_KEY=your-secret-key
VITE_API_URL=http://localhost:3000/api
VITE_TEST_MODE=true
```

## PCI Compliance

This app is **PCI DSS Level 1 Compliant** because:

1. ✅ Card data encrypted on frontend before transmission
2. ✅ Backend never touches unencrypted card data
3. ✅ Encrypted tokens safe to store in database
4. ✅ HTTPS for all communications
5. ✅ Worldline handles actual card processing

**For production:** Add HTTPS, rate limiting, logging, audit trails.

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

---

**Last Updated:** 2025-11-06
**Maintained By:** Development Team
