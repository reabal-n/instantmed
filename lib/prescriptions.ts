/**
 * Shared prescription utilities.
 * Used by panel-dashboard and prescriptions client.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const today = new Date()
  return Math.ceil((expiry.getTime() - today.getTime()) / MS_PER_DAY)
}

export function needsRenewalSoon(expiryDate: string): boolean {
  const days = getDaysUntilExpiry(expiryDate)
  return days <= 14 && days > 0
}
