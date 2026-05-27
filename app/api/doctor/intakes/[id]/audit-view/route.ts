import { NextRequest, NextResponse } from "next/server"

import {
  logClinicianViewedIntakeAnswers,
  logClinicianViewedMedicalHistory,
  logClinicianViewedSafetyFlags,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { requireApiRole } from "@/lib/auth/helpers"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getRequestType(serviceType?: string): RequestType {
  if (serviceType === "med_certs") return "med_cert"
  if (serviceType === "repeat_rx" || serviceType === "common_scripts") return "repeat_rx"
  return "intake"
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const auth = await requireApiRole(["doctor", "admin"])
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const csrfError = await requireValidCsrf(request)
  if (csrfError) return csrfError

  const { id: intakeId } = await params
  if (!UUID_RE.test(intakeId)) {
    return NextResponse.json({ error: "Invalid intake ID" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({})) as {
    serviceType?: unknown
    hasSafetyFlags?: unknown
    identifierReveal?: unknown
  }
  const serviceType = typeof body.serviceType === "string" ? body.serviceType : undefined
  const requestType = getRequestType(serviceType)
  const identifierReveal = typeof body.identifierReveal === "string" &&
    ["medicare", "phone", "identity"].includes(body.identifierReveal)
    ? body.identifierReveal
    : null

  if (identifierReveal) {
    await logClinicianViewedMedicalHistory(intakeId, requestType, auth.profile.id, {
      identifierReveal,
    })

    return NextResponse.json({ success: true })
  }

  await logClinicianViewedIntakeAnswers(intakeId, requestType, auth.profile.id)
  if (body.hasSafetyFlags === true) {
    await logClinicianViewedSafetyFlags(intakeId, requestType, auth.profile.id)
  }

  return NextResponse.json({ success: true })
}
