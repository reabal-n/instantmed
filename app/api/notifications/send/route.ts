import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendViaResend } from "@/lib/email/resend"
import { createLogger } from "@/lib/observability/logger"
import { getUserEmailFromClerkId, getUserEmailFromAuthUserId } from "@/lib/auth/clerk-helpers"

const log = createLogger("notifications-send")

// Initialize service role client for server-side operations
function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
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
    const apiKey = process.env.INTERNAL_API_KEY
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
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
      .select()
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
        .select("auth_user_id, clerk_user_id, notification_preferences")
        .eq("id", userId)
        .single()

      if (profile) {
        // Check notification preferences
        const prefs = profile.notification_preferences || {}
        const shouldSendEmail = prefs.email_request_updates !== false

        if (shouldSendEmail) {
          // Get email from Clerk (prefer clerk_user_id, fallback to auth_user_id)
          let email: string | null = null
          if (profile.clerk_user_id) {
            email = await getUserEmailFromClerkId(profile.clerk_user_id)
          } else if (profile.auth_user_id) {
            email = await getUserEmailFromAuthUserId(profile.auth_user_id)
          }

          if (email) {
            // Send email (fire and forget)
            sendViaResend({
              to: email,
              subject: title,
              html: generateEmailHtml(title, message, actionUrl),
            }).catch((err) => {
              log.warn('Failed to send email notification', { userId, email }, err)
            })
          }
        }
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

function generateEmailHtml(title: string, message: string, actionUrl?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://instantmed.com.au/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>
      
      <h1 style="color: #0A0F1C; font-size: 24px; margin-bottom: 16px;">${title}</h1>
      
      <p style="color: #4b5563; margin-bottom: 24px;">${message}</p>
      
      ${actionUrl ? `
        <p>
          <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
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
