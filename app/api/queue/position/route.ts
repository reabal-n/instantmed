import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getApiAuth } from "@/lib/auth/helpers"

/**
 * GET /api/queue/position?intake_id=xxx
 * Returns queue position (requests ahead) for a patient's intake.
 * Used by WhatHappensNext to show "X requests ahead of yours".
 *
 * SECURITY: Requires authentication and verifies the intake belongs
 * to the requesting user to prevent intake ID enumeration.
 */
export async function GET(request: NextRequest) {
  const authResult = await getApiAuth()
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const intakeId = request.nextUrl.searchParams.get("intake_id")
  if (!intakeId) {
    return NextResponse.json({ position: null })
  }

  try {
    const supabase = createServiceRoleClient()

    // Verify the intake belongs to this user before revealing queue position
    const { data: intake } = await supabase
      .from("intakes")
      .select("id")
      .eq("id", intakeId)
      .eq("profile_id", authResult.profile.id)
      .maybeSingle()

    if (!intake) {
      // Don't reveal whether the intake exists - return null position
      return NextResponse.json({ position: null })
    }

    const { data, error } = await supabase.rpc("get_queue_position", {
      p_intake_id: intakeId,
    })

    if (error) {
      return NextResponse.json({ position: null })
    }

    const position = data !== null && data !== undefined ? Number(data) : null
    return NextResponse.json({ position })
  } catch {
    return NextResponse.json({ position: null })
  }
}
