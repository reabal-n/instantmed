import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { logClinicianViewedIntakeAnswers } from "@/lib/audit/compliance-audit"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth()
    if (!auth || (auth.profile.role !== "doctor" && auth.profile.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { intakeId, durationMs } = body

    if (!intakeId || typeof durationMs !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

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
