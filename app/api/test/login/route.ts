/**
 * E2E Test Login Endpoint
 *
 * This endpoint is ONLY available in automated test environments.
 * It allows Playwright tests to authenticate as seeded test users
 * without going through the full OAuth flow.
 *
 * Security:
 * - Only enabled when NODE_ENV === "test" OR PLAYWRIGHT === "1"
 * - Requires X-E2E-SECRET header matching E2E_SECRET env var
 * - Only accepts requests from localhost unless E2E_ALLOWED_HOSTS is set
 * - Only authenticates known test user IDs
 *
 * Required env vars for E2E:
 *   PLAYWRIGHT=1
 *   E2E_SECRET=<secret>
 *
 * Usage from Playwright:
 *   await page.request.post('/api/test/login', {
 *     headers: { 'X-E2E-SECRET': process.env.E2E_SECRET },
 *     data: { userType: 'operator' }
 *   })
 */

import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

// Test user profile IDs (must match seed.ts).
// E2E bypass resolves these directly against profiles.id; do not use fake
// auth_user_id strings because auth_user_id is a uuid column in production DBs.
const TEST_USERS = {
  operator: "e2e00000-0000-0000-0000-000000000001",  // admin + doctor
  doctor: "e2e00000-0000-0000-0000-000000000003",    // doctor only (not admin)
  patient: "e2e00000-0000-0000-0000-000000000002",
} as const

type TestUserType = keyof typeof TEST_USERS

/**
 * Check if E2E test mode is enabled.
 * Returns true ONLY if NODE_ENV === "test" OR PLAYWRIGHT === "1"
 */
function isE2ETestModeEnabled(): boolean {
  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "1"
}

/**
 * Check if the request origin is allowed.
 * Only localhost/127.0.0.1 by default, or hosts in E2E_ALLOWED_HOSTS.
 */
function isAllowedHost(request: NextRequest): boolean {
  const host = request.headers.get("host") || ""
  const origin = request.headers.get("origin") || ""

  // Default allowed hosts
  const defaultAllowed = ["localhost", "127.0.0.1"]

  // Parse E2E_ALLOWED_HOSTS (comma-separated)
  const allowedHostsEnv = process.env.E2E_ALLOWED_HOSTS || ""
  const customAllowed = allowedHostsEnv.split(",").map(h => h.trim()).filter(Boolean)

  const allAllowed = [...defaultAllowed, ...customAllowed]

  // Check host header
  const hostWithoutPort = host.split(":")[0]
  if (allAllowed.includes(hostWithoutPort)) {
    return true
  }

  // Check origin header
  try {
    const originUrl = new URL(origin)
    if (allAllowed.includes(originUrl.hostname)) {
      return true
    }
  } catch {
    // Invalid or missing origin - check host only
  }

  return false
}

export async function POST(request: NextRequest) {
  // CRITICAL: Only allow in E2E test mode (NODE_ENV=test OR PLAYWRIGHT=1)
  if (!isE2ETestModeEnabled()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    )
  }

  // CRITICAL: Only allow from localhost unless explicitly configured
  if (!isAllowedHost(request)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }

  // Verify E2E secret
  const e2eSecret = process.env.E2E_SECRET
  const providedSecret = request.headers.get("X-E2E-SECRET")

  if (!e2eSecret) {
    return NextResponse.json(
      { error: "E2E_SECRET not configured" },
      { status: 500 }
    )
  }

  // Use timing-safe comparison to prevent timing attacks
  if (
    !providedSecret ||
    providedSecret.length !== e2eSecret.length ||
    !timingSafeEqual(Buffer.from(providedSecret), Buffer.from(e2eSecret))
  ) {
    return NextResponse.json(
      { error: "Invalid E2E secret" },
      { status: 401 }
    )
  }

  // Parse request body
  let body: { userType?: string; e2eRunId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const userType = body.userType as TestUserType
  if (!userType || !TEST_USERS[userType]) {
    return NextResponse.json(
      { error: `Invalid userType. Must be one of: ${Object.keys(TEST_USERS).join(", ")}` },
      { status: 400 }
    )
  }

  const authUserId = TEST_USERS[userType]
  const role = userType === "patient" ? "patient" : "doctor"
  const isAdmin = userType === "operator"
  const e2eRunId = process.env.E2E_RUN_ID || body.e2eRunId

  const response = NextResponse.json({
    success: true,
    userType,
    authUserId,
    role,
    e2eRunId: e2eRunId || null,
    message: `E2E session created for ${userType} user`,
  })

  // Set a custom e2e auth cookie that we'll check in our auth helpers
  response.cookies.set("__e2e_auth_user_id", authUserId, {
    httpOnly: true,
    secure: false, // Allow in development
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  // Also set user type for role checks
  response.cookies.set("__e2e_auth_user_type", userType, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })

  // Set role cookie for Sentry context (maps userType to role)
  // operator = admin+doctor, doctor = doctor only, patient = patient
  response.cookies.set("__e2e_auth_role", role, {
    httpOnly: false, // Readable by client JS for Sentry context
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })

  // Set admin flag cookie for role-based UI checks
  response.cookies.set("__e2e_auth_is_admin", isAdmin ? "true" : "false", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })

  // Set E2E run ID if provided in environment or request
  if (e2eRunId) {
    response.cookies.set("__e2e_run_id", e2eRunId, {
      httpOnly: false, // Readable by client JS for Sentry context
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    })
  }

  return response
}

export async function DELETE(request: NextRequest) {
  // CRITICAL: Only allow in E2E test mode
  if (!isE2ETestModeEnabled()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    )
  }

  // CRITICAL: Only allow from localhost
  if (!isAllowedHost(request)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }

  const response = NextResponse.json({
    success: true,
    message: "E2E session cleared",
  })

  response.cookies.delete("__e2e_auth_user_id")
  response.cookies.delete("__e2e_auth_user_type")
  response.cookies.delete("__e2e_auth_role")
  response.cookies.delete("__e2e_auth_is_admin")
  response.cookies.delete("__e2e_run_id")

  return response
}
