/**
 * Test cards for different payment methods
 * Use these in test mode to verify integration
 *
 * NOTE: Expiry format is MM/YY for UI display
 * The SDK internally converts this to MMYYYY format (e.g., "12/25" -> "122025")
 */
export const testCards = [
  {
    name: 'Visa - Success',
    number: '4111111111111111',
    expiry: '12/25', // MM/YY format - SDK converts to MMYYYY (122025)
    cvv: '123',
    holder: 'TEST USER',
  },
  {
    name: 'Visa - Decline',
    number: '4000000000000002',
    expiry: '12/25',
    cvv: '123',
    holder: 'TEST USER',
  },
  {
    name: 'Mastercard - Success',
    number: '5555555555554444',
    expiry: '12/25',
    cvv: '123',
    holder: 'TEST USER',
  },
  {
    name: 'Mastercard - Decline',
    number: '5105105105105100',
    expiry: '12/25',
    cvv: '123',
    holder: 'TEST USER',
  },
  {
    name: 'American Express',
    number: '378282246310005',
    expiry: '12/25',
    cvv: '1234',
    holder: 'TEST USER',
  },
  {
    name: 'Discover',
    number: '6011111111111117',
    expiry: '12/25',
    cvv: '123',
    holder: 'TEST USER',
  },
]

/**
 * Get a test card by name
 */
export function getTestCard(name) {
  return testCards.find(card => card.name === name)
}

