import { NextRequest, NextResponse } from "next/server"
import { auth as _auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const log = createLogger("patient-messages")

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { intakeId, content } = await request.json()

    if (!intakeId || !content?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const patientId = authUser.profile.id

    // Verify the intake belongs to this patient
    const { data: intake } = await supabase
      .from("intakes")
      .select("id, patient_id")
      .eq("id", intakeId)
      .single()

    if (!intake || intake.patient_id !== patientId) {
      return NextResponse.json(
        { error: "Intake not found" },
        { status: 404 }
      )
    }

    // Insert the message
    const { data: message, error } = await supabase
      .from("patient_messages")
      .insert({
        patient_id: patientId,
        intake_id: intakeId,
        sender_type: "patient",
        sender_id: patientId,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) {
      log.error("Insert error", { error: error.message })
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    log.error("POST error", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const intakeId = searchParams.get("intakeId")

    const supabase = createServiceRoleClient()
    const patientId = authUser.profile.id

    let query = supabase
      .from("patient_messages")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    if (intakeId) {
      query = query.eq("intake_id", intakeId)
    }

    const { data: messages, error } = await query.limit(100)

    if (error) {
      log.error("Fetch error", { error: error.message })
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    // Mark messages as read
    if (messages && messages.length > 0) {
      const unreadIds = messages
        .filter((m) => m.sender_type === "doctor" && !m.read_at)
        .map((m) => m.id)

      if (unreadIds.length > 0) {
        await supabase
          .from("patient_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds)
      }
    }

    return NextResponse.json({ messages })
  } catch (error) {
    log.error("GET error", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
