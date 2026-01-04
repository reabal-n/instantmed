import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("update-request")

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

    const { request_id, action, notes, doctor_id } = await request.json()

    if (!request_id) {
      return NextResponse.json({ error: "request_id required" }, { status: 400 })
    }

    if (!action || !["approve", "reject", "requires_info"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Map action to status
    const statusMap = {
      approve: "approved",
      reject: "rejected",
      requires_info: "requires_info",
    }

    // Update request
    const { data, error } = await supabase
      .from("requests")
      .update({
        status: statusMap[action as keyof typeof statusMap],
        doctor_notes: notes,
        doctor_id,
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
    log.error("Update request failed", { userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
