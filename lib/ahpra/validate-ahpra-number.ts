/**
 * AHPRA Registration Number Validator
 *
 * AHPRA numbers follow the format: 3 letters + 10 digits
 * Example: MED0002576546
 *
 * The 3-letter prefix indicates profession:
 * - MED = Medical practitioner
 * - NUR = Nurse
 * - DEN = Dentist
 * - PHY = Physiotherapist
 * - etc.
 */

const AHPRA_REGEX = /^[A-Z]{3}\d{10}$/

const VALID_PREFIXES = [
  "MED", // Medical practitioner (GP, specialist)
  "NUR", // Nurse / Midwife
  "DEN", // Dentist
  "PHY", // Physiotherapist
  "PSY", // Psychologist
  "PHA", // Pharmacist
  "OPT", // Optometrist
  "CHI", // Chiropractor
  "OST", // Osteopath
  "POD", // Podiatrist
  "OCC", // Occupational therapist
  "CMR", // Chinese medicine practitioner
  "ABO", // Aboriginal and Torres Strait Islander health practitioner
  "PAR", // Paramedicine practitioner
]

export interface AhpraValidationResult {
  valid: boolean
  error?: string
  profession?: string
  registrationNumber?: string
}

export function validateAhpraNumber(ahpraNumber: string): AhpraValidationResult {
  if (!ahpraNumber) {
    return { valid: false, error: "AHPRA number is required" }
  }

  const cleaned = ahpraNumber.trim().toUpperCase()

  if (!AHPRA_REGEX.test(cleaned)) {
    return {
      valid: false,
      error: "Invalid format. AHPRA numbers are 3 letters followed by 10 digits (e.g., MED0002576546)"
    }
  }

  const prefix = cleaned.slice(0, 3)
  if (!VALID_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      error: `Unknown profession prefix '${prefix}'. Expected one of: ${VALID_PREFIXES.join(", ")}`
    }
  }

  // For InstantMed, we only accept medical practitioners
  if (prefix !== "MED") {
    return {
      valid: false,
      error: `InstantMed requires medical practitioner registration (MED prefix). Received: ${prefix}`
    }
  }

  return {
    valid: true,
    profession: "Medical Practitioner",
    registrationNumber: cleaned,
  }
}

/**
 * Generate the AHPRA public register lookup URL for a given registration number
 */
export function getAhpraLookupUrl(ahpraNumber: string): string {
  return `https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx?q=${encodeURIComponent(ahpraNumber)}`
}
