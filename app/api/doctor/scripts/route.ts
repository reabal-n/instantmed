import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireApiRole } from "@/lib/auth/helpers"
import { getScriptTaskCounts, getScriptTasks } from "@/lib/data/script-tasks"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const log = createLogger("doctor-scripts-api")

const statusSchema = z.enum(["pending_send", "sent", "confirmed"]).nullable()
const pageSchema = z.coerce.number().int().min(1).default(1)
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(50)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await requireApiRole(["doctor", "admin"])
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawStatus = request.nextUrl.searchParams.get("status")
    const parsed = statusSchema.safeParse(rawStatus)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 })
    }
    const status = parsed.data

    const page = pageSchema.parse(request.nextUrl.searchParams.get("page") ?? 1)
    const pageSize = pageSizeSchema.parse(request.nextUrl.searchParams.get("pageSize") ?? 50)
    const doctorId = authResult.profile.role === "admin" ? undefined : authResult.profile.id
    const baseFilters = doctorId ? { doctorId, page, pageSize } : { page, pageSize }

    const [{ tasks, total }, counts] = await Promise.all([
      getScriptTasks(status ? { ...baseFilters, status } : baseFilters),
      getScriptTaskCounts(doctorId ? { doctorId } : undefined),
    ])

    return NextResponse.json({ tasks, counts, total, page, pageSize })
  } catch (error) {
    log.error("Failed to fetch script tasks", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
