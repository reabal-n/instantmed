// LEGACY: retained pending external dependency audit (requires INTERNAL_API_SECRET)
import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendViaResend } from "@/lib/email/resend"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("notifications-send")

// Use centralized service role client
function getServiceClient() {
  return createServiceRoleClient()
}

interface NotificationBody {
  userId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, unknown>
  sendEmail?: boolean
}

export async function POST(request: Request) {
  let body: NotificationBody | null = null
  
  try {
    // Verify the request is from an authorized source (internal or webhook)
    const authHeader = request.headers.get("authorization")
    const apiSecret = process.env.INTERNAL_API_SECRET
    
    const expected = `Bearer ${apiSecret}`
    const isValid = apiSecret && authHeader && authHeader.length === expected.length &&
      timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    body = await request.json()
    
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    
    const { 
      userId, 
      type, 
      title, 
      message, 
      actionUrl, 
      metadata,
      sendEmail = true,
    } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, message" },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    // Create in-app notification
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        action_url: actionUrl,
        metadata: metadata || {},
      })
      .select("id, created_at")
      .single()

    if (notificationError) {
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      )
    }

    // Optionally send email notification
    if (sendEmail) {
      // Get user's email from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single()

      if (profile?.email) {
        // Send email (fire and forget)
        sendViaResend({
          to: profile.email,
          subject: title,
          html: generateEmailHtml(title, message, actionUrl),
        }).catch((err) => {
          log.warn('Failed to send email notification', { userId, email: profile.email }, err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    log.error('Failed to send notification', { userId: body?.userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/** Validate and sanitize URL — only allow https: and relative paths */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://instantmed.com.au")
    // Only allow https and our own domain
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("instantmed.com.au")) {
      return "https://instantmed.com.au"
    }
    return parsed.toString()
  } catch {
    return "https://instantmed.com.au"
  }
}

function generateEmailHtml(title: string, message: string, actionUrl?: string): string {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)
  const safeActionUrl = actionUrl ? sanitizeUrl(actionUrl) : undefined

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://instantmed.com.au/branding/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>

      <h1 style="color: #0A0F1C; font-size: 24px; margin-bottom: 16px;">${safeTitle}</h1>

      <p style="color: #4b5563; margin-bottom: 24px;">${safeMessage}</p>

      ${safeActionUrl ? `
        <p>
          <a href="${safeActionUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB, #00C9A7); color: #0A0F1C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
            View Details
          </a>
        </p>
      ` : ""}

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

      <p style="color: #999; font-size: 12px; text-align: center;">
        InstantMed Pty Ltd · Australia<br>
        <a href="https://instantmed.com.au/patient/settings" style="color: #999;">Manage notification preferences</a>
      </p>
    </body>
    </html>
  `
}
