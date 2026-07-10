import { NextRequest, NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Lightweight endpoint for polling intake status from the success page.
 * Uses service-role to bypass RLS (client Supabase has no auth session).
 * Ownership verified via auth session + patient_id check.
 */
export async function GET(req: NextRequest) {
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "patient") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const intakeId = req.nextUrl.searchParams.get("id")
  if (!intakeId) {
    return NextResponse.json({ error: "Missing intake ID" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Fetch intake with ownership check. Phase: success-page Google Ads value
  // accuracy fix (2026-05-12). `amount_cents` + `is_priority` are returned
  // alongside `status` so the success page can update its conversion-value
  // before firing `trackPurchase`. Without them, a page that mounted during
  // the webhook-pending window fired the purchase conversion at the $1
  // fallback instead of the real $24.95-$89.95 price.
  const { data: intake } = await supabase
    .from("intakes")
    .select("status, amount_cents, is_priority")
    .eq("id", intakeId)
    .eq("patient_id", authResult.profile.id)
    .maybeSingle()

  if (!intake) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    status: intake.status,
    amount_cents: intake.amount_cents ?? null,
    is_priority: intake.is_priority ?? false,
  })
}
