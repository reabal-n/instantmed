import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import {
  fingerprintPatientIntakeProjection,
  PATIENT_INTAKE_POLL_LIMIT,
} from "@/lib/patient/intake-status-polling"
import { derivePatientPaymentRecoveryReason } from "@/lib/patient/payment-recovery"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Dual-mode patient status endpoint: exact-ID payment verification for the
 * success page and a bounded list projection for the authenticated shell.
 * Service-role reads are always constrained by the server-derived patient ID;
 * successful list reads invalidate only that patient's cached portal views.
 */
export async function GET(req: NextRequest) {
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "patient") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const intakeId = req.nextUrl.searchParams.get("id")
  const scope = req.nextUrl.searchParams.get("scope")

  const supabase = createServiceRoleClient()

  if (scope === "list") {
    const { data: intakes, error } = await supabase
      .from("intakes")
      .select("id, status, updated_at, checkout_error")
      .eq("patient_id", authResult.profile.id)
      .order("updated_at", { ascending: false })
      .limit(PATIENT_INTAKE_POLL_LIMIT)

    if (error) {
      return NextResponse.json(
        { error: "Unable to load request updates" },
        { status: 500 },
      )
    }

    const projected = (intakes ?? []).map((intake) => ({
      id: intake.id,
      status: intake.status,
      updated_at: intake.updated_at,
      payment_recovery_reason: derivePatientPaymentRecoveryReason(
        intake.checkout_error,
      ),
    }))

    // The shell refresh that follows a changed polling snapshot must not reread
    // the authenticated patient's 30-60s cached dashboard/list projections —
    // but an UNCHANGED poll must not invalidate them either, or the 20s cadence
    // permanently defeats the cache. The client echoes the last fingerprint;
    // invalidate (patient-specific only) when the fresh read differs.
    const fingerprint = fingerprintPatientIntakeProjection(projected)
    if (req.nextUrl.searchParams.get("snapshot") !== fingerprint) {
      revalidateTag(`patient-dashboard-${authResult.profile.id}`)
      revalidateTag(`patient-intakes-${authResult.profile.id}`)
    }

    return NextResponse.json(
      {
        intakes: projected,
        snapshot: fingerprint,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    )
  }

  if (!intakeId) {
    return NextResponse.json({ error: "Missing intake ID" }, { status: 400 })
  }

  // Fetch intake with ownership check. Phase: success-page Google Ads value
  // accuracy fix (2026-05-12). `amount_cents` + `is_priority` are returned
  // alongside `status` so the success page can update its conversion-value
  // before firing `trackPurchase`. Without them, a page that mounted during
  // the webhook-pending window fired the purchase conversion at the $1
  // fallback instead of the real $24.95-$89.95 price.
  const { data: intake } = await supabase
    .from("intakes")
    .select("status, payment_status, amount_cents, is_priority")
    .eq("id", intakeId)
    .eq("patient_id", authResult.profile.id)
    .maybeSingle()

  if (!intake) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    status: intake.status,
    payment_status: intake.payment_status,
    amount_cents: intake.amount_cents ?? null,
    is_priority: intake.is_priority ?? false,
  })
}
