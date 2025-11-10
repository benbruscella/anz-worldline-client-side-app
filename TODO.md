# GitHub Issue #2 Implementation: Token Store + SDK Validation

**Status:** Core Implementation Complete - Testing Phase
**Last Updated:** 2025-11-10
**Issue Link:** https://github.com/benbruscella/anz-worldline-client-side-app/issues/2

---

## Overview

Implementing two scenarios for payment handling:

1. **Scenario 1:** Using the SDK's built-in validation (Luhn, expiry date, format checks)
2. **Scenario 2:** Generating reusable tokens and storing in localStorage (no database)

---

## Implementation Phases

### Phase 1: Documentation & Planning ✅
- [x] Create TODO.md with complete plan

### Phase 2: SDK Validation (Scenario 1) ✅
- [x] Add `paymentRequest.isValid()` check to PaymentForm.jsx (Line 167-197)
- [x] Integrate `getErrorMessageIds()` error handling
- [x] Map error IDs to user-friendly messages (luhn, expirationDate, etc.)
- [x] Display validation errors before encryption
- [ ] **(Optional)** Add real-time field validation as user types

**Files:**
- [src/components/PaymentForm.jsx](src/components/PaymentForm.jsx) - Lines 163+

**Key Changes:**
```javascript
// After setting PaymentRequest values
if (!paymentRequest.isValid()) {
  const errors = paymentRequest.getErrorMessageIds();
  // Map to user-friendly messages and display
}
```

**Error Message Mapping:**
| Error ID | User-Friendly Message |
|----------|----------------------|
| `luhn` | "Invalid card number" |
| `expirationDate` | "Card expired or invalid date" |
| `regularExpression` | "Invalid format" |
| `length` | "Incorrect field length" |
| `range` | "Value out of range" |

---

### Phase 3: Backend Token API (Scenario 2) ✅

#### 3A: Create tokenStorage.js Utility ✅
- [x] Create [src/utils/tokenStorage.js](src/utils/tokenStorage.js)
- [x] Implement `saveToken(tokenData)` - localStorage write
- [x] Implement `loadToken()` - localStorage read with validation
- [x] Implement `clearToken()` - localStorage delete + API call
- [x] Implement `validateToken(tokenData)` - Check expiry and validity
- [x] Implement `detectCardType(cardNumber)` - VISA/Mastercard/AMEX detection
- [x] Implement `checkTokenExpiry(expiryDate)` - Expiry validation

**localStorage Key:** `worldline_token`

**localStorage Value Structure:**
```javascript
{
  tokenId: "abc123xyz",           // From Worldline CreateToken API
  maskedCardNumber: "****1111",   // Last 4 digits
  cardType: "VISA",               // Auto-detected (VISA/MASTERCARD/AMEX/DISCOVER)
  cardHolder: "TEST USER",        // From form input
  expiryDate: "12/25",            // MM/YY format
  paymentProductId: 1,            // Always 1 for cards
  createdAt: "2025-11-10T12:00:00Z", // ISO timestamp
  customerId: "customer-abc123"   // From session
}
```

#### 3B: Backend Token Endpoints ✅
- [x] Add `POST /api/create-token` endpoint to [server.js](server.js) (Lines 309-369)
  - Accept: `{ encryptedCustomerInput, paymentProductId }`
  - Call: `client.tokens.createToken(PSPID, body)`
  - Return: `{ success: true, token, cardNumber, paymentProductId }`
  - Error handling with status 400/500 ✅

- [x] Add `POST /api/process-payment-with-token` endpoint to [server.js](server.js) (Lines 377-459)
  - Accept: `{ token, customerId, amount, currency }`
  - Call: `client.payments.createPayment()` with `cardPaymentMethodSpecificInput.token`
  - Return: `{ success: true, paymentId, status, cardNumber }` or 3DS redirect ✅
  - Handle HTTP 402 for 3DS required ✅

- [x] Add `DELETE /api/delete-token/:tokenId` endpoint to [server.js](server.js) (Lines 467-512)
  - Call: `client.tokens.deleteToken(PSPID, tokenId)`
  - Return: `{ success: true, message: "Token deleted" }`
  - Error handling with status 500 ✅

**Files:**
- [server.js](server.js) - Add 3 new endpoints

---

### Phase 4: Frontend Token UI (Scenario 2) ✅

#### 4A: Refactor PaymentForm.jsx ✅
- [x] Add state: `tokenMode` (toggle between 'tokenize' and 'charge') - Line 32
- [x] Add state: `storedToken` (loaded from localStorage) - Line 33
- [x] Implement `handleTokenize()` handler (Lines 119-262)
  - Encrypt card data ✅
  - Call `POST /api/create-token` ✅
  - Save returned token via `tokenStorage.saveToken()` ✅
  - Display token info in UI ✅
  - Clear form (sets storedToken state) ✅

- [x] Implement `handleChargeWithToken()` handler (Lines 266-340)
  - Load token from localStorage ✅
  - Call `POST /api/process-payment-with-token` ✅
  - Handle payment response (success/3DS/error) ✅
  - Display payment status ✅

- [x] Add token display UI section (Lines 608-635)
  - Show card type, masked number (****1111), expiry ✅
  - "Clear Token" button (calls `tokenStorage.clearToken()`) ✅
  - Display "Saved Card" badge ✅

- [x] Conditional rendering (Lines 800-835)
  - Hide card input fields when token exists ✅
  - Show mode toggle (Tokenize vs Charge) ✅
  - Show appropriate submit button ✅

- [x] Integrate SDK validation (from Phase 2) (Lines 167-182)
  - Validate before token creation ✅
  - Validate before payment with token ✅

**Files:**
- [src/components/PaymentForm.jsx](src/components/PaymentForm.jsx) ✅

#### 4B: Update App.jsx ✅
- [x] Add token state management (Lines 8-18)
  - `const [currentToken, setCurrentToken] = useState(null)` ✅
  - `useEffect(() => { loadTokenFromLocalStorage() }, [])` ✅

- [x] Pass token management to PaymentForm (Lines 48-52)
  - `currentToken` prop ✅
  - `onTokenGenerated` callback ✅
  - `onTokenCleared` callback ✅

**Files:**
- [src/App.jsx](src/App.jsx) ✅

---

### Phase 5: Testing & Documentation

#### 5A: Test SDK Validation (Scenario 1)
- [ ] Test with invalid card numbers
  - Use test card `4000000000000002` (decline card)
  - Should show "Invalid card number" (Luhn check)

- [ ] Test with expired dates
  - Use expiry `01/22` (past date)
  - Should show "Card expired or invalid date"

- [ ] Test with invalid formats
  - Wrong CVV length
  - Wrong expiry format

- [ ] Verify user-friendly error messages display
  - Before encryption attempt
  - Clear and actionable

#### 5B: Test Token Creation (Scenario 2)
- [ ] Test with all test cards (Visa, Mastercard, Amex)
  - Visa: `4111111111111111`
  - Mastercard: `5555555555554444`
  - AMEX: `378282246310005`

- [ ] Verify token is stored in localStorage
  - Check browser DevTools → Application → Storage → localStorage
  - Verify key `worldline_token` exists
  - Verify all metadata fields present

- [ ] Verify localStorage persistence
  - Create token
  - Refresh page
  - Token should still be visible

#### 5C: Test "Charge with Token" Flow
- [ ] Test charging with stored token
  - Load token from localStorage
  - Click "Charge Card with Token"
  - Verify payment processes successfully

- [ ] Test "Clear Token" functionality
  - Click "Clear Token" button
  - Verify localStorage is cleared
  - Verify form shows empty state
  - Verify token no longer shows in UI

#### 5D: Test 3DS Handling
- [ ] Verify 3DS redirect works with tokens
  - Should receive HTTP 402 with redirectUrl
  - Should redirect to bank auth page
  - Should return and complete payment

#### 5E: Test Error Cases
- [ ] Invalid token ID
- [ ] Expired token (past card expiry)
- [ ] Token deletion API failure
- [ ] Network errors

---

### Phase 6: Final Cleanup
- [ ] Update TODO.md with completion status
- [ ] Verify all tests pass
- [ ] Code review for security compliance
- [ ] Document any known limitations

---

## Key Technical Details

### Security & Compliance

✅ **PCI Compliant because:**
- SDK validation prevents invalid card data encryption
- Tokens are non-sensitive identifiers (not card data)
- No CVV stored (only used during token creation)
- No full card numbers stored (masked numbers only for display)
- Worldline handles actual card processing
- HTTPS for all communications

### SDK Validation Methods Used

```javascript
// Full request validation
paymentRequest.isValid() // Returns: boolean
paymentRequest.getErrorMessageIds() // Returns: string[]

// Field-level validation (if implemented)
paymentProductField.isValid(value) // Returns: boolean
paymentProductField.getErrorCodes(value) // Returns: string[]
```

### Worldline SDK Methods Used

**Client-side (existing):**
- `session.getEncryptor()` - Get encryption object
- `encryptor.encrypt(paymentRequest)` - Encrypt card data

**Server-side (new):**
- `client.tokens.createToken(PSPID, body)` - Create reusable token
- `client.tokens.deleteToken(PSPID, tokenId)` - Delete token
- `client.payments.createPayment(PSPID, body)` - Process payment with token

---

## Testing Checklist

### Validation Tests (Scenario 1)
- [ ] Invalid card number shows "Invalid card number" error
- [ ] Expired date shows "Card expired or invalid date" error
- [ ] Invalid CVV shows appropriate error
- [ ] Invalid format shows "Invalid format" error
- [ ] Valid card passes all validation checks

### Token Flow Tests (Scenario 2)
- [ ] Token created successfully with valid card
- [ ] Token stored in localStorage
- [ ] Token metadata displays correctly (card type, last 4, expiry)
- [ ] Token persists across page refresh
- [ ] Payment processes using stored token
- [ ] 3DS redirect works with token payment
- [ ] "Clear Token" removes from localStorage and UI
- [ ] Cannot process payment with invalid/expired token

### Integration Tests
- [ ] SDK validation runs before token creation
- [ ] SDK validation runs before payment with token
- [ ] Error messages from SDK validation display correctly
- [ ] Token metadata auto-detects card type correctly
- [ ] Token expiry based on card expiry date works correctly

---

## Known Limitations / Future Enhancements

1. **PaymentProduct fetch** - Currently returns "No payment products available"
   - Doesn't block implementation
   - Full SDK validation still works without it
   - Future: Investigate why it fails for ANZ Worldline region

2. **Token expiry** - Currently only based on card expiry date
   - Future: Add absolute token expiry (30-day max)
   - Future: Add token refresh mechanism

3. **Multiple tokens** - Currently only stores one token
   - Future: Store multiple saved cards (array instead of single token)
   - Future: Add card nickname/alias

4. **Token export** - Not implemented
   - Future: Allow export of token list (with masked data only)

---

## Progress Summary

| Phase | Status | Completion |
|-------|--------|-----------|
| Phase 1: Planning | ✅ Complete | 100% |
| Phase 2: SDK Validation | ✅ Complete | 100% |
| Phase 3: Backend Tokens | ✅ Complete | 100% |
| Phase 4: Frontend UI | ✅ Complete | 100% |
| Phase 5: Testing | ⏳ Ready for Testing | 0% |
| Phase 6: Cleanup | ⏳ Ready | 0% |
| **OVERALL** | **✅ Core Implementation Complete** | **83%** |

## Implementation Summary

✅ **COMPLETED:**
- SDK validation using `paymentRequest.isValid()` and `getErrorMessageIds()`
- Token creation endpoint (`POST /api/create-token`)
- Token payment endpoint (`POST /api/process-payment-with-token`)
- Token deletion endpoint (`DELETE /api/delete-token/:tokenId`)
- localStorage utilities (save, load, clear, validate tokens)
- PaymentForm refactored for token generation and charging flows
- Token display UI with "Clear Token" functionality
- App.jsx updated with token state management

⏳ **NEXT STEPS:**
- Manual testing of SDK validation with various card scenarios
- Manual testing of token creation and localStorage persistence
- Manual testing of token-based payments (charge with stored token)
- Verify 3DS handling works with tokens

---

## References

- **GitHub Issue:** https://github.com/benbruscella/anz-worldline-client-side-app/issues/2
- **Worldline API Docs:** https://docs.anzworldline-solutions.com.au/
- **SDK README:** Check node_modules/onlinepayments-sdk-client-js/README.md

---

*Last updated: 2025-11-10*
