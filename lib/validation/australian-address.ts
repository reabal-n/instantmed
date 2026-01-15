/**
 * Australian Address Validation Utilities
 * 
 * Validates postcodes against states and provides address-related helpers.
 * Based on Australia Post postcode ranges.
 */

export type AustralianState = "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA"

/**
 * Postcode ranges for each Australian state/territory
 * Source: Australia Post
 */
const POSTCODE_RANGES: Record<AustralianState, Array<[number, number]>> = {
  NSW: [
    [1000, 1999], // Sydney LVR (Large Volume Receivers)
    [2000, 2599], // Sydney metro and surrounds
    [2619, 2899], // Regional NSW
    [2921, 2999], // Regional NSW
  ],
  ACT: [
    [200, 299],   // ACT LVR (0200-0299)
    [2600, 2618], // Canberra
    [2900, 2920], // Canberra surrounds
  ],
  VIC: [
    [3000, 3999], // All Victoria
    [8000, 8999], // Victoria LVR
  ],
  QLD: [
    [4000, 4999], // All Queensland
    [9000, 9999], // Queensland LVR
  ],
  SA: [
    [5000, 5799], // All South Australia
    [5800, 5999], // SA LVR
  ],
  WA: [
    [6000, 6797], // All Western Australia
    [6800, 6999], // WA LVR
  ],
  TAS: [
    [7000, 7799], // All Tasmania
    [7800, 7999], // TAS LVR
  ],
  NT: [
    [800, 899],   // All Northern Territory (0800-0899)
    [900, 999],   // NT LVR (0900-0999)
  ],
}

/**
 * Get the state(s) that a postcode belongs to
 */
export function getStateFromPostcode(postcode: string): AustralianState[] {
  const code = parseInt(postcode, 10)
  if (isNaN(code)) return []

  const matchingStates: AustralianState[] = []

  for (const [state, ranges] of Object.entries(POSTCODE_RANGES) as [AustralianState, Array<[number, number]>][]) {
    for (const [min, max] of ranges) {
      if (code >= min && code <= max) {
        matchingStates.push(state)
        break
      }
    }
  }

  return matchingStates
}

/**
 * Validate that a postcode matches the selected state
 */
export function validatePostcodeState(
  postcode: string,
  state: AustralianState
): { valid: boolean; error?: string; suggestedState?: AustralianState } {
  // Basic format check
  if (!/^\d{4}$/.test(postcode)) {
    return { valid: false, error: "Postcode must be 4 digits" }
  }

  const matchingStates = getStateFromPostcode(postcode)

  if (matchingStates.length === 0) {
    return { valid: false, error: "Invalid Australian postcode" }
  }

  if (matchingStates.includes(state)) {
    return { valid: true }
  }

  // Postcode doesn't match selected state
  return {
    valid: false,
    error: `Postcode ${postcode} is in ${matchingStates.join("/")} not ${state}`,
    suggestedState: matchingStates[0],
  }
}

/**
 * Auto-detect state from postcode (for auto-fill)
 */
export function suggestStateFromPostcode(postcode: string): AustralianState | null {
  if (!/^\d{4}$/.test(postcode)) return null
  
  const states = getStateFromPostcode(postcode)
  return states[0] || null
}

/**
 * Validate complete Australian address
 */
export interface AddressValidationResult {
  valid: boolean
  errors: {
    addressLine1?: string
    suburb?: string
    state?: string
    postcode?: string
    postcodeStateMismatch?: string
  }
}

export function validateAustralianAddress(address: {
  addressLine1?: string
  suburb?: string
  state?: AustralianState | string | null
  postcode?: string
}): AddressValidationResult {
  const errors: AddressValidationResult["errors"] = {}

  // Address line 1
  if (!address.addressLine1?.trim()) {
    errors.addressLine1 = "Street address is required"
  } else if (address.addressLine1.trim().length < 5) {
    errors.addressLine1 = "Please enter a complete street address"
  }

  // Suburb
  if (!address.suburb?.trim()) {
    errors.suburb = "Suburb is required"
  } else if (address.suburb.trim().length < 2) {
    errors.suburb = "Please enter a valid suburb"
  }

  // State
  if (!address.state) {
    errors.state = "Please select your state"
  }

  // Postcode
  if (!address.postcode?.trim()) {
    errors.postcode = "Postcode is required"
  } else if (!/^\d{4}$/.test(address.postcode)) {
    errors.postcode = "Postcode must be 4 digits"
  } else if (address.state) {
    // Validate postcode-state match
    const postcodeValidation = validatePostcodeState(
      address.postcode,
      address.state as AustralianState
    )
    if (!postcodeValidation.valid && postcodeValidation.suggestedState) {
      errors.postcodeStateMismatch = postcodeValidation.error
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Format postcode with leading zeros if needed
 */
export function formatPostcode(postcode: string): string {
  const digits = postcode.replace(/\D/g, "")
  return digits.padStart(4, "0").slice(0, 4)
}
