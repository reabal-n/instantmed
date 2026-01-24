import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("unsubscribe")

/**
 * Handle email unsubscribe requests
 * GET /api/unsubscribe?token=<profile_id>&type=<email_type>
 * 
 * This endpoint allows users to unsubscribe from emails via link clicks.
 * Token is the profile_id (could be enhanced with signed tokens for security).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token") // profile_id
  const type = searchParams.get("type") || "all" // marketing, abandoned_checkout, all

  if (!token) {
    return new NextResponse(renderUnsubscribePage("Invalid unsubscribe link", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  const supabase = createServiceRoleClient()

  try {
    // Verify profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", token)
      .single()

    if (!profile) {
      return new NextResponse(renderUnsubscribePage("Invalid unsubscribe link", false), {
        status: 404,
        headers: { "Content-Type": "text/html" },
      })
    }

    // Determine which preferences to update
    const updates: Record<string, boolean | string> = {
      updated_at: new Date().toISOString(),
    }

    if (type === "marketing" || type === "all") {
      updates.marketing_emails = false
    }
    if (type === "abandoned_checkout" || type === "all") {
      updates.abandoned_checkout_emails = false
    }
    if (type === "all") {
      updates.unsubscribed_at = new Date().toISOString()
      updates.unsubscribe_reason = "link_click"
    }

    // Upsert email preferences
    const { error } = await supabase
      .from("email_preferences")
      .upsert({
        profile_id: token,
        ...updates,
      }, { onConflict: "profile_id" })

    if (error) {
      log.error("Failed to update email preferences", { profileId: token, type }, error)
      return new NextResponse(renderUnsubscribePage("Failed to process unsubscribe request", false), {
        status: 500,
        headers: { "Content-Type": "text/html" },
      })
    }

    log.info("Email unsubscribe processed", { profileId: token, type, email: profile.email })

    const typeLabel = type === "all" ? "all emails" : 
                      type === "marketing" ? "marketing emails" : 
                      type === "abandoned_checkout" ? "reminder emails" : type

    return new NextResponse(
      renderUnsubscribePage(`You have been unsubscribed from ${typeLabel}`, true),
      { status: 200, headers: { "Content-Type": "text/html" } }
    )

  } catch (error) {
    log.error("Unsubscribe error", { token, type }, error)
    return new NextResponse(renderUnsubscribePage("An error occurred", false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }
}

/**
 * Render a simple HTML page for unsubscribe confirmation
 */
function renderUnsubscribePage(message: string, success: boolean): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Preferences - InstantMed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(to bottom, #f0f9ff, #ffffff);
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    p {
      color: #64748b;
      line-height: 1.6;
    }
    a {
      color: #0ea5e9;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? "✓" : "⚠️"}</div>
    <h1>${success ? "Unsubscribed" : "Error"}</h1>
    <p>${message}</p>
    ${success ? '<p style="margin-top: 1.5rem;"><a href="/">Return to InstantMed</a></p>' : ""}
  </div>
</body>
</html>
`
}
