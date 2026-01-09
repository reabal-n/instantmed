import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("assign-request")

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    // Use Supabase for authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a doctor using auth_user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .single()

    if (!profile || (profile.role !== "doctor" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { request_id, doctor_id } = await request.json()

    if (!request_id || !doctor_id) {
      return NextResponse.json({ error: "request_id and doctor_id required" }, { status: 400 })
    }

    // Assign request to doctor and set status to in_review
    const { data, error } = await supabase
      .from("requests")
      .update({
        doctor_id,
        status: "in_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error) {
    log.error("Assign request failed", { userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
