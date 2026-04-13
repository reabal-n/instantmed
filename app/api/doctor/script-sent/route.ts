import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  logExternalPrescribingIndicated,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { requireApiRole } from "@/lib/auth/helpers"
import { updateScriptSent } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("doctor-script-sent")

const scriptSentSchema = z.object({
  intakeId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  scriptSent: z.boolean(),
  scriptNotes: z.string().max(2000).optional(),
  parchmentReference: z.string().max(200).optional(),
}).refine(data => data.intakeId || data.requestId, {
  message: "Either intakeId or requestId is required",
})

function getRequestType(category: string | null): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription") return "repeat_rx"
  return "intake"
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit before any processing
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    // Require doctor or admin role (defense-in-depth)
    const authResult = await requireApiRole(["doctor", "admin"])
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = scriptSentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 })
    }

    const { intakeId, requestId, scriptSent, scriptNotes, parchmentReference } = parsed.data
    // refine() guarantees at least one of intakeId/requestId exists
    const id = (intakeId || requestId)!

    const success = await updateScriptSent(id, scriptSent, scriptNotes, parchmentReference)

    if (!success) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }

    // Log compliance audit event when marking a script as sent.
    // Per CLINICAL.md Section 5 (Prescribing Boundary Evidence), every script
    // sent through Parchment must be evidenced in compliance_audit_log so the
    // platform can prove no in-platform prescribing occurred.
    if (scriptSent) {
      try {
        const supabase = createServiceRoleClient()
        const { data: intake } = await supabase
          .from("intakes")
          .select("category")
          .eq("id", id)
          .single()
        const requestType = getRequestType(intake?.category ?? null)
        await logExternalPrescribingIndicated(
          id,
          requestType,
          authResult.profile.id,
          parchmentReference || "parchment"
        )
      } catch (auditError) {
        log.warn("Failed to log external_prescribing_indicated event", { intakeId: id }, auditError instanceof Error ? auditError : undefined)
        // Don't fail the request - script status already saved
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
