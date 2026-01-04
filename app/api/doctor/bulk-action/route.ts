import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("bulk-action")

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

    const { request_ids, action, notes, doctor_id } = await request.json()

    if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
      return NextResponse.json({ error: "Invalid request_ids" }, { status: 400 })
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Update all requests
    const updates = request_ids.map(async (id) => {
      return supabase
        .from("requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
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
