import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireValidCsrf } from "@/lib/security/csrf"

export async function POST(request: NextRequest) {
  try {
    // CSRF protection for session-based requests
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

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
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
