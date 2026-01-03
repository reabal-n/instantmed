import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement CSRF protection with proper token endpoint
    // Currently disabled until client-side token support is added

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a doctor
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "doctor") {
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
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
