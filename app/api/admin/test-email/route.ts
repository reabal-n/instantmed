import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { sendViaResend } from "@/lib/email/resend"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("test-email-api")

export async function POST(request: NextRequest) {
  try {
    // Auth check - admin only
    const authResult = await getApiAuth()
    if (!authResult || authResult.profile.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { to, subject, html } = await request.json()

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Send test email
    const result = await sendViaResend({
      to,
      subject,
      html,
      tags: [
        { name: "type", value: "test" },
        { name: "sender", value: "admin" },
      ],
    })

    if (result.success) {
      logger.info("Test email sent successfully", {
        to: to.replace(/(.{2}).*@/, "$1***@"),
        subject,
        adminId: authResult.userId,
      })

      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        emailId: result.id,
      })
    } else {
      logger.error("Failed to send test email", {
        to: to.replace(/(.{2}).*@/, "$1***@"),
        subject,
        error: result.error,
        adminId: authResult.userId,
      })

      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error("Test email API error", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
