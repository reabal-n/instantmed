import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiRole } from "@/lib/auth"
import { logClinicianViewedIntakeAnswers } from "@/lib/audit/compliance-audit"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireValidCsrf } from "@/lib/security/csrf"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const logViewDurationSchema = z.object({
  intakeId: z.string().uuid(),
  durationMs: z.number().int().min(0).max(86400000), // max 24 hours
})

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

    const body = await request.json()
    const parsed = logViewDurationSchema.safeParse(body)
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
  } catch {
    return NextResponse.json({ error: "Failed to log" }, { status: 500 })
  }
}
