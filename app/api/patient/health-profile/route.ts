import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { upsertHealthProfile } from "@/lib/data/health-profile"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { z } from "zod"

const log = createLogger("patient-health-profile")

const healthProfileSchema = z.object({
  allergies: z.array(z.string().max(200)).max(50).default([]),
  conditions: z.array(z.string().max(200)).max(50).default([]),
  current_medications: z.array(z.string().max(200)).max(50).default([]),
  blood_type: z.string().max(10).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = healthProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 })
    }

    const success = await upsertHealthProfile(profile.id, parsed.data)

    if (!success) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error("Health profile update failed", {
      error: error instanceof Error ? error.message : "Unknown",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
