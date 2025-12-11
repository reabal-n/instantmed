/**
 * Format a date string for display
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }

  return new Date(dateString).toLocaleDateString("en-AU", options || defaultOptions)
}

/**
 * Format a date string with time
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Format a date for certificates (e.g., "12 January 2025")
 */
export function formatDateForCertificate(dateStr: string | null): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  try {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

/**
 * Format currency in AUD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount)
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")

  // Format Australian mobile (04XX XXX XXX)
  if (digits.startsWith("04") && digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }

  // Format Australian landline (02 XXXX XXXX)
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
  }

  return phone
}

/**
 * Mask Medicare number for display
 */
export function maskMedicare(medicare: string | null): string {
  if (!medicare) return "Not provided"
  const digits = medicare.replace(/\s/g, "")
  if (digits.length < 4) return medicare
  return `${digits.slice(0, 4)} •••• ••••`
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`

  return formatDate(dateString)
}
