import "server-only"

/**
 * Email sending helper utilities: validation, retry logic, unsubscribe injection.
 */
import { env } from "@/lib/config/env"
import { signUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
import { UNSUBSCRIBE_PLACEHOLDER } from "@/lib/email/components/base-email"

// ============================================
// E2E DETECTION
// ============================================

export function isE2EMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.E2E === "true"
}

// ============================================
// RETRY CONFIGURATION
// ============================================

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

export function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelayMs)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableError(statusCode?: number, errorMessage?: string): boolean {
  if (statusCode === 429) return true
  if (statusCode && statusCode >= 500) return true
  if (errorMessage?.includes("fetch failed")) return true
  if (errorMessage?.includes("ECONNRESET")) return true
  if (errorMessage?.includes("ETIMEDOUT")) return true
  return false
}

// ============================================
// UNSUBSCRIBE URL INJECTION
// ============================================

/**
 * Replace the __UNSUBSCRIBE_URL__ placeholder in rendered HTML with a real
 * signed preference-center URL. Falls back to auth-gated settings page
 * for system emails without a patientId.
 */
export function injectUnsubscribeUrl(html: string, patientId?: string): string {
  if (!html.includes(UNSUBSCRIBE_PLACEHOLDER)) return html
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  let url: string
  if (patientId) {
    try {
      const token = signUnsubscribeToken(patientId)
      url = `${appUrl}/email-preferences?token=${token}`
    } catch {
      url = `${appUrl}/account?tab=notifications`
    }
  } else {
    url = `${appUrl}/account?tab=notifications`
  }
  return html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, url)
}

// ============================================
// EMAIL VALIDATION
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254
}

export function sanitizeEmailForLog(email: string): string {
  if (env.isDev) return email
  const [local, domain] = email.split("@")
  if (!domain) return "[invalid-email]"
  return `${local.slice(0, 2)}***@${domain.slice(0, 3)}***.${domain.split(".").pop()}`
}
