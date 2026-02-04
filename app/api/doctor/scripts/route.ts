import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getScriptTasks, getScriptTaskCounts } from "@/lib/data/script-tasks"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const log = createLogger("doctor-scripts-api")

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

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

    if (!profile || !["doctor", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get("status") as "pending_send" | "sent" | "confirmed" | null

    const [tasks, counts] = await Promise.all([
      getScriptTasks(status ? { status } : undefined),
      getScriptTaskCounts(),
    ])

    return NextResponse.json({ tasks, counts })
  } catch (error) {
    log.error("Failed to fetch script tasks", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
