import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { markDoctorVerified, revokeDoctorVerification } from "@/lib/ahpra/registry-client"
import { createLogger } from "@/lib/observability/logger"
import { requireValidCsrf } from "@/lib/security/csrf"

const log = createLogger("admin-verify-ahpra")

export async function POST(request: NextRequest) {
  try {
    // CSRF protection for session-based requests
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { doctorId, action, notes } = await request.json()

    if (!doctorId || !action) {
      return NextResponse.json({ error: "doctorId and action required" }, { status: 400 })
    }

    if (action === "verify") {
      const success = await markDoctorVerified(doctorId, profile.id, notes)
      return NextResponse.json({ success })
    } else if (action === "revoke") {
      if (!notes) {
        return NextResponse.json({ error: "Reason required for revocation" }, { status: 400 })
      }
      const success = await revokeDoctorVerification(doctorId, profile.id, notes)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    log.error("AHPRA verification failed", {
      error: error instanceof Error ? error.message : "Unknown",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
