# Worldline Payment Integration App

A complete, production-ready React + Express application for integrating Worldline Online Payments SDK with real payment encryption.

**Frontend:** React 18 + Vite + Tailwind CSS
**Backend:** Node.js + Express
**SDK:** Worldline Online Payments JavaScript SDK
**Status:** ✅ Real SDK integration with backend session creation

## Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Setup & Configuration](#setup--configuration)
5. [API Endpoints](#api-endpoints)
6. [Test Cards](#test-cards)
7. [Development](#development)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.local.example .env.local
# Edit .env.local with your WORLDLINE_PSPID and WORLDLINE_API_KEY

# 3. Start backend (Terminal 1)
npm run server

# 4. Start frontend (Terminal 2)
npm run dev

# 5. Open browser
# http://localhost:5173 (or 3001)
```

---

## Features

✅ **Real Worldline SDK Integration**
- Server-side session creation (using PSPID)
- Client-side payment encryption
- Full payment flow implementation

✅ **Secure Architecture**
- PSPID and API keys never exposed to frontend
- Backend creates and manages sessions
- Encrypted token generation

✅ **Test Ready**
- 6 pre-configured test cards
- Demo mode for testing without credentials
- Comprehensive error handling

✅ **Production Ready**
- Environment configuration (.env.local)
- Proper CORS handling
- Security best practices

---

## Architecture

### How It Works

```
1. Frontend Load
   ↓
2. useWorldlineSession Hook Mounts
   ↓
3. POST /api/session → Backend
   ↓
4. Backend: PSPID + API Key → Worldline Server API
   ↓
5. Worldline Returns: clientSessionId + customerId
   ↓
6. Backend Returns to Frontend
   ↓
7. Frontend: Initialize SDK Session
   ↓
8. Frontend: Load Payment Products
   ↓
9. User Submits Form
   ↓
10. Frontend: Create PaymentRequest
    ↓
11. Frontend: Encrypt Data (SDK encryptor)
    ↓
12. Display Encrypted Token
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **[server.js](server.js)** | Express backend - Creates Worldline sessions |
| **[src/components/PaymentForm.jsx](src/components/PaymentForm.jsx)** | Payment form component |
| **[src/hooks/useWorldlineSession.js](src/hooks/useWorldlineSession.js)** | React hook - Fetches session credentials |
| **[src/config/worldlineConfig.js](src/config/worldlineConfig.js)** | SDK config & test cards |

### Project Structure

```
src/
├── components/
│   ├── PaymentForm.jsx          # Main payment form
│   └── TokenLog.jsx             # Token display
├── hooks/
│   └── useWorldlineSession.js   # Session management hook
├── config/
│   └── worldlineConfig.js       # Configuration & test cards
├── App.jsx                      # Main app
├── main.jsx                     # Entry point
└── index.css                    # Styles

server.js                        # Express backend

.env.local.example              # Configuration template
.env.local                      # Your credentials (git-ignored)
.gitignore                      # Git ignore rules

README.md                       # This file
package.json                    # Dependencies
```

---

## Setup & Configuration

### Get Your Credentials

1. **PSPID (Merchant ID)**
   - Login to https://merchant.worldline.com
   - Settings → Merchant Info
   - Copy your PSPID

2. **API Key**
   - Settings → API Keys
   - Create new API Key (or copy existing)
   - Ensure it has session creation permissions

3. **API URL**
   - Sandbox: `https://api.sandbox.worldline.com`
   - Production: `https://api.worldline.com`

### Configure Your Project

Create `.env.local` (copy from `.env.local.example`):

```env
# Backend (from Worldline merchant account)
WORLDLINE_PSPID=your-pspid-here
WORLDLINE_API_KEY=your-api-key-here
WORLDLINE_API_URL=https://api.sandbox.worldline.com
SERVER_PORT=3000

# Frontend
VITE_COUNTRY_CODE=AU
VITE_CURRENCY_CODE=AUD
VITE_AMOUNT=10000
VITE_API_URL=http://localhost:3000/api
VITE_TEST_MODE=true
```

### Demo Mode

If credentials not configured:
- Backend automatically runs in demo mode
- Returns fake credentials for testing
- Shows warning in console
- Great for testing without real credentials

---

## API Endpoints

### POST /api/session

Creates a Worldline Client Session.

**Request:**
```bash
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "AU",
    "currencyCode": "AUD",
    "amount": 10000
  }'
```

**Response:**
```json
{
  "clientSessionId": "47e9dc332ca24273818be2a46072e006",
  "customerId": "9991-0d93d6a0e18443bd871c89ec6d38a873",
  "clientApiUrl": "https://clientapi.worldline.com",
  "assetUrl": "https://assets.worldline.com"
}
```

### POST /api/payment

Processes encrypted payment request.

**Request:**
```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedPaymentRequest": "encrypted-data",
    "clientSessionId": "session-id",
    "amount": 10000,
    "currency": "AUD"
  }'
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "server": "Worldline Payment Backend",
  "uptime": 123.456
}
```

### GET /api/info

Server configuration info.

---

## Test Cards

All test cards use:
- **Expiry:** 12/25
- **CVV:** 123
- **Holder:** TEST USER

| Card Name | Number |
|-----------|--------|
| Visa - Success | 4111111111111111 |
| Visa - Decline | 4000000000000002 |
| Mastercard - Success | 5555555555554444 |
| Mastercard - Decline | 5105105105105100 |
| American Express | 378282246310005 |
| Discover | 6011111111111117 |

---

## Development

### Start Both Servers

**Terminal 1 - Backend:**
```bash
npm run server
```

You should see:
```
🚀 Worldline Payment Backend Server
📍 Server running on: http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Visit: `http://localhost:5173` (or `http://localhost:3001`)

### Or Start Both Together

```bash
npm run dev:all
```

Note: Requires `concurrently` to be installed

### Available Commands

```bash
# Development
npm run dev                 # Start frontend (Vite)
npm run server              # Start backend (Express)
npm run dev:all             # Start both (requires concurrently)

# Production
npm run build               # Build for production
npm run preview             # Preview production build
```

### Development Workflow

1. **Frontend changes** - Automatically reloaded by Vite
2. **Backend changes** - Restart `npm run server`
3. **Environment changes** - Restart both
4. **Console logs** - Check both browser (F12) and terminal

---

## Payment Flow

### Step-by-Step

1. **Session Creation**
   - Backend creates Worldline Client Session using PSPID
   - Returns credentials (clientSessionId, customerId)

2. **SDK Initialization**
   - Frontend receives credentials
   - Initializes SDK Session object
   - Loads payment products

3. **Form Submission**
   - User fills payment form
   - Selects test card or enters manual card
   - Clicks "Encrypt & Generate Token"

4. **Payment Encryption**
   - Creates PaymentRequest
   - Sets payment product
   - Fills card data (number, CVV, expiry)
   - SDK encrypts data with AES

5. **Token Display**
   - Encrypted token shown in Token Log
   - Console logs encryption details
   - Ready to send to payment processing

---

## Security Best Practices

### ✅ What This App Does Right

- PSPID and API keys stored securely (.env.local)
- Keys never exposed to frontend
- Backend creates and validates sessions
- HMAC authentication on API calls
- Encrypted payment data
- Card numbers masked in display
- `.gitignore` prevents accidental commits

### ⚠️ Additional for Production

- Implement HTTPS (required for production)
- Add rate limiting to API endpoints
- Implement request validation
- Store payment records in database
- Add webhook handlers for payment notifications
- Implement logging and monitoring
- Add 3D Secure authentication if needed
- Regular security audits

---

## Production Deployment

### Before Going Live

1. Update credentials to production
2. Change `WORLDLINE_API_URL` to production
3. Deploy backend to production server
4. Update `VITE_API_URL` to production API
5. Build and deploy frontend
6. Test full flow with real cards in sandbox first
7. Switch to production only after verification

### Backend Hosting Options

- Heroku
- Railway
- Render
- AWS (EC2, Elastic Beanstalk, Lambda)
- Google Cloud Run
- DigitalOcean App Platform
- Azure App Service

### Frontend Hosting Options

- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages
- Any static host

### Example: Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set WORLDLINE_PSPID=xxx
heroku config:set WORLDLINE_API_KEY=xxx
heroku config:set WORLDLINE_API_URL=https://api.worldline.com

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

---

## Troubleshooting

### Backend Connection Failed

**Problem:** Frontend shows "Session Failed"

**Solution:**
```bash
# Verify backend is running
npm run server

# Check backend is on correct port
curl http://localhost:3000/api/health
```

### Credentials Not Working

**Problem:** Backend returns error when creating session

**Solution:**
1. Verify PSPID and API Key are correct in `.env.local`
2. Check API URL is correct (sandbox vs production)
3. Verify API Key has session creation permissions
4. Check network connectivity
5. View backend console for detailed error

### Module Not Found

**Problem:** `Error: Cannot find module 'express'`

**Solution:**
```bash
npm install
```

### CORS Error

**Problem:** Frontend can't reach backend - CORS error

**Solution:**
- Ensure `VITE_API_URL=http://localhost:3000/api` in `.env.local`
- Restart frontend after changing env vars
- Verify backend is running

### Demo Mode Warning

**Problem:** Backend shows "Using DEMO MODE"

**Solution:**
- Add real PSPID and API Key to `.env.local`
- Restart backend

---

## How PSPID Works

### The Architecture

```
Your PSPID (Merchant ID - SECRET)
    ↓ (Backend only - .env.local)
    ↓
Backend Server
    ├─ Creates HMAC signature
    ├─ Calls Worldline Server API
    ├─ Worldline verifies signature using PSPID
    ├─ Receives session credentials
    └─ Sends to frontend (WITHOUT PSPID)
        ↓
    Frontend receives:
    ├─ clientSessionId
    ├─ customerId
    ├─ clientApiUrl
    └─ assetUrl
        ↓
    Frontend initializes SDK
    └─ Encrypts payment data
```

### Why Backend is Required

1. **Security** - PSPID never exposed to client
2. **HMAC Signing** - Requests must be signed with API Key
3. **Session Management** - Backend creates sessions
4. **Payment Processing** - Backend handles payments
5. **Validation** - Backend validates all data

---

## Integration Steps

1. **Initialize Session** - Backend creates session
2. **Fetch Credentials** - Frontend gets credentials
3. **Initialize SDK** - Frontend creates Session object
4. **Load Products** - Frontend loads payment products
5. **Create Request** - Frontend creates PaymentRequest
6. **Encrypt Data** - SDK encrypts payment data
7. **Send Token** - Frontend sends encrypted token
8. **Process Payment** - Backend processes payment

---

## Dependencies

### Frontend
- react: 18.3.1
- react-dom: 18.3.1
- onlinepayments-sdk-client-js: 3.5.0
- vite: 7.2.1
- tailwindcss: 4.1.16

### Backend
- express: 5.1.0
- cors: 2.8.5
- axios: 1.13.2
- dotenv: 17.2.3

### Browser Support

- Chrome 74+
- Firefox 90+
- Safari 14.1+
- Edge 79+
- Mobile versions of above

---

## Resources

- [Worldline Developer Docs](https://developer.worldline.com/)
- [SDK Repository](https://github.com/wl-online-payments-direct/sdk-client-js)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Express Docs](https://expressjs.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

---

## Getting Help

1. Read relevant sections above
2. Check browser console (F12) for errors
3. Check backend console for errors
4. Test endpoints with `curl`
5. Verify credentials and configuration
6. Check Worldline API status

---

## Support

For issues with:
- **This App:** Check sections above and console logs
- **Worldline SDK:** See [SDK Repository](https://github.com/wl-online-payments-direct/sdk-client-js)
- **Worldline Payments:** Contact Worldline support

---

## License

This project is provided as-is for educational and integration purposes.

---

**Ready to integrate?** Start with [Quick Start](#quick-start) above.

Happy coding! 🚀
