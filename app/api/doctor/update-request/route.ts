import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("update-intake")

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .single()

    if (!profile || (profile.role !== "doctor" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { intake_id, action, notes, doctor_id } = await request.json()

    if (!intake_id) {
      return NextResponse.json({ error: "intake_id required" }, { status: 400 })
    }

    if (!action || !["approve", "decline", "pending_info"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const statusMap = {
      approve: "approved",
      decline: "declined",
      pending_info: "pending_info",
    }

    const { data, error } = await supabase
      .from("intakes")
      .update({
        status: statusMap[action as keyof typeof statusMap],
        doctor_notes: notes,
        doctor_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, intake: data })
  } catch (error) {
    log.error("Update intake failed", { userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
