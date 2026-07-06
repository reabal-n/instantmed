import "server-only"

/**
 * Email sending helper utilities: validation, retry logic, unsubscribe injection.
 */
import { env } from "@/lib/config/env"
import { signEmailUnsubscribeToken, signUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
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
 * signed preference-center URL. Recipients without a profile (e.g. draft
 * recovery) get an email-keyed one-click unsubscribe URL instead — the
 * auth-gated settings fallback is not a functional unsubscribe for someone
 * with no account (Spam Act s18). System emails with neither id keep the
 * settings fallback.
 */
export function injectUnsubscribeUrl(
  html: string,
  patientId?: string,
  unsubscribeEmail?: string,
): string {
  if (!html.includes(UNSUBSCRIBE_PLACEHOLDER)) return html
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  let url = `${appUrl}/account?tab=notifications`
  try {
    if (patientId) {
      url = `${appUrl}/email-preferences?token=${signUnsubscribeToken(patientId)}`
    } else if (unsubscribeEmail) {
      url = `${appUrl}/api/unsubscribe?token=${signEmailUnsubscribeToken(unsubscribeEmail)}&type=marketing`
    }
  } catch {
    // Token signing failed (missing secret): keep the settings fallback.
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
