// ============================================
// CSRF PROTECTION: Token-based protection
// ============================================

import { cookies, headers } from 'next/headers'
import { randomBytes, createHmac } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-csrf-secret'
const CSRF_COOKIE_NAME = '__csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString()
  const random = randomBytes(16).toString('hex')
  const data = `${timestamp}:${random}`
  const signature = createHmac('sha256', CSRF_SECRET).update(data).digest('hex')
  return Buffer.from(`${data}:${signature}`).toString('base64')
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [timestamp, random, signature] = decoded.split(':')

    if (!timestamp || !random || !signature) {
      return false
    }

    // Check timestamp
    const tokenTime = parseInt(timestamp)
    if (Date.now() - tokenTime > TOKEN_VALIDITY_MS) {
      return false
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(`${timestamp}:${random}`)
      .digest('hex')

    return signature === expectedSignature
  } catch {
    return false
  }
}

/**
 * Get CSRF token from request
 */
export async function getCsrfTokenFromRequest(): Promise<string | null> {
  const headersList = await headers()

  // Check header first
  const headerToken = headersList.get(CSRF_HEADER_NAME)
  if (headerToken) return headerToken

  // Then check cookie
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)
  return cookieToken?.value || null
}

/**
 * Set CSRF cookie
 */
export async function setCsrfCookie(): Promise<string> {
  const token = generateCsrfToken()
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_VALIDITY_MS / 1000,
    path: '/',
  })

  return token
}

/**
 * Validate CSRF for server action
 */
export async function validateCsrf(): Promise<boolean> {
  const token = await getCsrfTokenFromRequest()
  if (!token) return false
  return validateCsrfToken(token)
}

/**
 * CSRF protection wrapper for server actions
 */
export function withCsrfProtection<T extends (...args: unknown[]) => Promise<unknown>>(
  action: T
): T {
  return (async (...args: Parameters<T>) => {
    const isValid = await validateCsrf()
    if (!isValid) {
      throw new Error('CSRF validation failed')
    }
    return action(...args)
  }) as T
}
