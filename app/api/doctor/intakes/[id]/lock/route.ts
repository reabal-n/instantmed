import { NextRequest, NextResponse } from "next/server"

import { requireApiRole } from "@/lib/auth/helpers"
import { acquireIntakeLock, extendIntakeLock, releaseIntakeLock } from "@/lib/data/intake-lock"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireDoctorRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return { response: rateLimitResponse }

  const auth = await requireApiRole(["doctor", "admin"])
  if (!auth) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const csrfError = await requireValidCsrf(request)
  if (csrfError) return { response: csrfError }

  const { id: intakeId } = await params
  if (!UUID_RE.test(intakeId)) {
    return { response: NextResponse.json({ error: "Invalid intake ID" }, { status: 400 }) }
  }

  return { auth, intakeId }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDoctorRequest(request, params)
  if ("response" in guard) return guard.response

  const result = await acquireIntakeLock(
    guard.intakeId,
    guard.auth.profile.id,
    guard.auth.profile.full_name || "Doctor",
  )

  return NextResponse.json({
    success: true,
    warning: result.acquired ? null : result.warning,
    lockedByName: result.existingLock?.lockedByName ?? null,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDoctorRequest(request, params)
  if ("response" in guard) return guard.response

  const extended = await extendIntakeLock(guard.intakeId, guard.auth.profile.id)
  return NextResponse.json({ success: extended })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDoctorRequest(request, params)
  if ("response" in guard) return guard.response

  await releaseIntakeLock(guard.intakeId, guard.auth.profile.id)
  return NextResponse.json({ success: true })
}
