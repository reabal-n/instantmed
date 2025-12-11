export function validateMedicareNumber(number: string): boolean {
  // Remove spaces
  const cleaned = number.replace(/\s/g, '')
  // Basic validation - 10 digits
  return /^\d{10}$/.test(cleaned)
}

export function validateMedicareExpiry(expiry: string): boolean {
  // Format: MM/YYYY
  const match = expiry.match(/^(\d{2})\/(\d{4})$/)
  if (!match) return false
  
  const month = parseInt(match[1])
  const year = parseInt(match[2])
  
  if (month < 1 || month > 12) return false
  
  const expiryDate = new Date(year, month - 1, 1)
  const today = new Date()
  today.setDate(1)
  today.setHours(0, 0, 0, 0)
  
  return expiryDate >= today
}

