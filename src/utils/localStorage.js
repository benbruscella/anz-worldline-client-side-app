/**
 * localStorage utilities for saved cards
 *
 * Stores encrypted card data from Worldline SDK in browser localStorage
 * Includes encrypted token + card metadata (type, last 4 digits, expiry, cardholder, customer ID)
 */

const STORAGE_KEY = 'worldline_card'

/**
 * Save card to localStorage
 */
export const save = (cardData) => {
  try {
    if (!cardData || !cardData.cardToken) {
      console.error('Cannot save card: Missing cardToken')
      return false
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cardData))
    console.log('✅ Card saved')
    return true
  } catch (error) {
    console.error('❌ Failed to save card:', error)
    return false
  }
}

/**
 * Load card from localStorage
 */
export const load = () => {
  try {
    const cardJson = localStorage.getItem(STORAGE_KEY)

    if (!cardJson) {
      return null
    }

    const cardData = JSON.parse(cardJson)
    console.log('✅ Card loaded')
    return cardData
  } catch (error) {
    console.error('❌ Failed to load card:', error)
    return null
  }
}

/**
 * Clear card from localStorage
 */
export const clear = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('✅ Card cleared')
    return true
  } catch (error) {
    console.error('❌ Failed to clear card:', error)
    return false
  }
}

export default {
  save,
  load,
  clear,
  STORAGE_KEY
}
