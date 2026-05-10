import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { logClinicianViewedIntakeAnswers } from "@/lib/audit/compliance-audit"
import { requireApiRole } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("log-view-duration")
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const logViewDurationSchema = z.object({
  intakeId: z.string().regex(UUID_RE),
  durationMs: z.coerce.number().int().min(0).max(86400000), // max 24 hours
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const auth = await requireApiRole(["doctor", "admin"])
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const queryPayload = {
      intakeId: request.nextUrl.searchParams.get("intakeId"),
      durationMs: request.nextUrl.searchParams.get("durationMs"),
    }
    const body = await request.json().catch(() => ({}))
    const parsed = logViewDurationSchema.safeParse({
      ...queryPayload,
      ...(isRecord(body) ? body : {}),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { intakeId, durationMs } = parsed.data

    // Get service type for the intake
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("category")
      .eq("id", intakeId)
      .single()

    const category = intake?.category
    const requestType = category === "medical_certificate" ? "med_cert" : 
                        category === "prescription" ? "repeat_rx" : "intake"

    // Log the view duration
    await logClinicianViewedIntakeAnswers(
      intakeId,
      requestType,
      auth.profile.id,
      durationMs
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error("Failed to log view duration", {}, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: "Failed to log" }, { status: 500 })
  }
}
