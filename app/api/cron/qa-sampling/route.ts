import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"

const logger = createLogger("cron-qa-sampling")

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()

    // Get approved intakes from last 24h that haven't been QA sampled
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const { data: recentApproved } = await supabase
      .from("intakes")
      .select("id, category, reviewed_by")
      .eq("status", "approved")
      .gte("approved_at", yesterday.toISOString())
      .is("qa_sampled", null)
      .limit(50)

    if (!recentApproved || recentApproved.length === 0) {
      return NextResponse.json({ success: true, sampled: 0 })
    }

    // Sample 10% or minimum 1
    const sampleSize = Math.max(1, Math.ceil(recentApproved.length * 0.1))
    const shuffled = recentApproved.sort(() => Math.random() - 0.5)
    const sampled = shuffled.slice(0, sampleSize)

    // Mark as sampled
    const sampledIds = sampled.map((s) => s.id)
    await supabase
      .from("intakes")
      .update({ qa_sampled: true, qa_sampled_at: new Date().toISOString() })
      .in("id", sampledIds)

    logger.info("QA sampling completed", {
      total: recentApproved.length,
      sampled: sampleSize,
      sampledIds,
    })

    return NextResponse.json({
      success: true,
      total: recentApproved.length,
      sampled: sampleSize,
    })
  } catch (error) {
    logger.error("QA sampling failed", {
      error: error instanceof Error ? error.message : "Unknown",
    })
    return NextResponse.json(
      { error: "QA sampling failed" },
      { status: 500 }
    )
  }
}
