import { NextRequest, NextResponse } from "next/server"
import { sendStatusTransitionEmail, type EmailTemplateType } from "@/lib/email/send-status"

/**
 * Internal API route for sending status change emails
 * This is called from server actions to avoid react-dom/server import issues
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal secret
    const secret = request.headers.get("x-internal-secret")
    const expectedSecret = process.env.INTERNAL_API_SECRET || "dev-secret"
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId, status, doctorName, declineReason } = await request.json()

    if (!requestId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

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
      await sendStatusTransitionEmail(requestId, templateType, additionalData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error sending status email:", error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}
