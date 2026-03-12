import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * GET /api/queue/position?intake_id=xxx
 * Returns queue position (requests ahead) for a patient's intake.
 * Used by WhatHappensNext to show "X requests ahead of yours".
 */
export async function GET(request: NextRequest) {
  const intakeId = request.nextUrl.searchParams.get("intake_id")
  if (!intakeId) {
    return NextResponse.json({ position: null })
  }

  try {
    const supabase = createServiceRoleClient()
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
