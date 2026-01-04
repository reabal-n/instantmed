import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("assign-request")

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    // Use Clerk for authentication
    const authResult = await auth()
    userId = authResult.userId

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Verify user is a doctor using clerk_user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_user_id", userId)
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
