import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

const CSRF_TOKEN_NAME = "csrf_token"
const CSRF_HEADER_NAME = "x-csrf-token"
const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

interface CSRFToken {
  value: string
  expiresAt: number
}

/**
 * Generate a new CSRF token
 */
export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS

  const tokenData: CSRFToken = { value: token, expiresAt }

  const cookieStore = await cookies()
  cookieStore.set(CSRF_TOKEN_NAME, JSON.stringify(tokenData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_EXPIRY_MS / 1000,
    path: "/",
  })

  return token
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  try {
    // Get token from header
    const headerToken = request.headers.get(CSRF_HEADER_NAME)

    if (!headerToken) {
      return false
    }

    // Get token from cookie
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(CSRF_TOKEN_NAME)?.value

    if (!cookieValue) {
      return false
    }

    const tokenData: CSRFToken = JSON.parse(cookieValue)

    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      return false
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(tokenData.value)
    )
  } catch {
    return false
  }
}

/**
 * Middleware wrapper to require CSRF token for mutations
 */
export function withCSRFProtection(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    // Only check for state-changing methods
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const isValid = await validateCSRFToken(request)

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid or missing CSRF token" },
          { status: 403 }
        )
      }
    }

    return handler(request)
  }
}

/**
 * API route to get a CSRF token (for client-side use)
 */
export async function getCSRFTokenForClient(): Promise<string> {
  return await generateCSRFToken()
}
