/**
 * E2E Test Login Endpoint
 * 
 * This endpoint is ONLY available in automated test environments.
 * It allows Playwright tests to authenticate as seeded test users
 * without going through the full Clerk OAuth flow.
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

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Test user Clerk IDs (must match seed.ts)
const TEST_USERS = {
  operator: "user_e2e_operator_001",  // admin + doctor
  doctor: "user_e2e_doctor_001",      // doctor only (not admin)
  patient: "user_e2e_patient_001",
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

  if (providedSecret !== e2eSecret) {
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

  const clerkUserId = TEST_USERS[userType]

  // Set a test session cookie that our auth helpers can recognize
  // This is a simplified auth bypass for E2E testing only
  const cookieStore = await cookies()
  
  // Set a custom e2e auth cookie that we'll check in our auth helpers
  cookieStore.set("__e2e_auth_user_id", clerkUserId, {
    httpOnly: true,
    secure: false, // Allow in development
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  // Also set user type for role checks
  cookieStore.set("__e2e_auth_user_type", userType, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })

  // Set role cookie for Sentry context (maps userType to role)
  // operator = admin+doctor, doctor = doctor only, patient = patient
  const role = userType === "patient" ? "patient" : "doctor"
  const isAdmin = userType === "operator"
  cookieStore.set("__e2e_auth_role", role, {
    httpOnly: false, // Readable by client JS for Sentry context
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })

  // Set admin flag cookie for role-based UI checks
  cookieStore.set("__e2e_auth_is_admin", isAdmin ? "true" : "false", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  })

  // Set E2E run ID if provided in environment or request
  const e2eRunId = process.env.E2E_RUN_ID || body.e2eRunId
  if (e2eRunId) {
    cookieStore.set("__e2e_run_id", e2eRunId, {
      httpOnly: false, // Readable by client JS for Sentry context
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    })
  }

  return NextResponse.json({
    success: true,
    userType,
    clerkUserId,
    role,
    e2eRunId: e2eRunId || null,
    message: `E2E session created for ${userType} user`,
  })
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

  // Clear E2E auth cookies
  const cookieStore = await cookies()
  cookieStore.delete("__e2e_auth_user_id")
  cookieStore.delete("__e2e_auth_user_type")
  cookieStore.delete("__e2e_auth_role")
  cookieStore.delete("__e2e_run_id")

  return NextResponse.json({
    success: true,
    message: "E2E session cleared",
  })
}
