import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { type EmailTemplateType,sendStatusTransitionEmail } from "@/lib/email/send-status"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("route")

const sendStatusEmailSchema = z.object({
  intakeId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  status: z.string().min(1, "Status is required"),
  doctorName: z.string().optional(),
  declineReason: z.string().optional(),
}).refine(
  (data) => data.intakeId || data.requestId,
  { message: "Either intakeId or requestId is required" }
)

/**
 * Timing-safe secret comparison to prevent timing attacks
 */
function safeCompareSecrets(a: string | null, b: string): boolean {
  if (!a) return false
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Internal API route for sending status change emails
 * This is called from server actions to avoid react-dom/server import issues
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal secret - required in all environments
    const secret = request.headers.get("x-internal-secret")
    const expectedSecret = process.env.INTERNAL_API_SECRET
    
    if (!expectedSecret) {
      log.error("[send-status-email] INTERNAL_API_SECRET not configured")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    
    if (!safeCompareSecrets(secret, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let rawBody
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = sendStatusEmailSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Missing required fields" },
        { status: 400 }
      )
    }

    const intakeId = (parsed.data.intakeId || parsed.data.requestId)! // backward compat - refine guarantees one exists
    const { status, doctorName, declineReason } = parsed.data

    // Map status to template type
    let templateType: EmailTemplateType | null = null
    let additionalData: Record<string, unknown> = {}

    if (status === "approved") {
      templateType = "request_approved"
      additionalData = { doctorName: doctorName || "Your Doctor" }
    } else if (status === "declined") {
      templateType = "request_declined"
      additionalData = { 
        reason: declineReason || "After careful review, the doctor was unable to approve this request through our telehealth service. Please consult with your regular GP for further assistance."
      }
    } else if (status === "needs_follow_up") {
      templateType = "needs_more_info"
      additionalData = { message: "Additional information is required to process your request." }
    }

    if (templateType) {
      await sendStatusTransitionEmail(intakeId, templateType, additionalData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error("Error sending status email", {}, toError(error))
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}
