import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("bulk-action")

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const authResult = await auth()
    userId = authResult.userId

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .single()

    if (!profile || (profile.role !== "doctor" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { intake_ids, action, notes, doctor_id } = await request.json()

    if (!intake_ids || !Array.isArray(intake_ids) || intake_ids.length === 0) {
      return NextResponse.json({ error: "Invalid intake_ids" }, { status: 400 })
    }

    if (!action || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const updates = intake_ids.map(async (id: string) => {
      return supabase
        .from("intakes")
        .update({
          status: action === "approve" ? "approved" : "declined",
          doctor_notes: notes,
          doctor_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
    })

    const results = await Promise.all(updates)
    const successful = results.filter((r) => r.data).length

    return NextResponse.json({
      success: true,
      updated: successful,
    })
  } catch (error) {
    log.error("Bulk action failed", { userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
