import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { verifyUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("unsubscribe")

/**
 * GET /api/unsubscribe?token=<signed_token>&type=<email_type>
 *
 * Renders a confirmation page. No state change on GET (CSRF-safe).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const type = searchParams.get("type") || "all"

  if (!token) {
    return htmlResponse(renderPage("Invalid unsubscribe link", false), 400)
  }

  const result = verifyUnsubscribeToken(token)
  if (!result) {
    return htmlResponse(renderPage("This unsubscribe link is invalid or has expired.", false), 403)
  }

  // Render confirmation page with a POST form (no state change on GET)
  return htmlResponse(renderConfirmationPage(token, type), 200)
}

/**
 * POST /api/unsubscribe
 *
 * Actually performs the unsubscribe. Requires signed token in body.
 */
export async function POST(request: NextRequest) {
  let token: string
  let type: string

  // Accept both form-encoded (from HTML form) and JSON
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData()
    token = formData.get("token") as string
    type = (formData.get("type") as string) || "all"
  } else {
    const body = await request.json()
    token = body.token
    type = body.type || "all"
  }

  if (!token) {
    return htmlResponse(renderPage("Invalid unsubscribe link", false), 400)
  }

  const result = verifyUnsubscribeToken(token)
  if (!result) {
    return htmlResponse(renderPage("This unsubscribe link is invalid or has expired.", false), 403)
  }

  const { profileId } = result
  const supabase = createServiceRoleClient()

  try {
    // Verify profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", profileId)
      .single()

    if (!profile) {
      return htmlResponse(renderPage("Invalid unsubscribe link", false), 404)
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

    const { error } = await supabase
      .from("email_preferences")
      .upsert({
        profile_id: profileId,
        ...updates,
      }, { onConflict: "profile_id" })

    if (error) {
      log.error("Failed to update email preferences", { profileId, type }, error)
      return htmlResponse(renderPage("Failed to process unsubscribe request", false), 500)
    }

    log.info("Email unsubscribe processed", { profileId, type, email: profile.email })

    const typeLabel = type === "all" ? "all emails"
      : type === "marketing" ? "marketing emails"
      : type === "abandoned_checkout" ? "reminder emails"
      : type

    return htmlResponse(renderPage(`You have been unsubscribed from ${typeLabel}`, true), 200)

  } catch (error) {
    log.error("Unsubscribe error", { profileId, type }, error)
    return htmlResponse(renderPage("An error occurred", false), 500)
  }
}

function htmlResponse(html: string, status: number) {
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html" } })
}

function renderConfirmationPage(token: string, type: string): string {
  const typeLabel = type === "all" ? "all emails"
    : type === "marketing" ? "marketing emails"
    : type === "abandoned_checkout" ? "reminder emails"
    : type

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Unsubscribe - InstantMed</title>
  ${pageStyles}
</head>
<body>
  <div class="container">
    <div class="icon">📧</div>
    <h1>Unsubscribe</h1>
    <p>Are you sure you want to unsubscribe from ${typeLabel}?</p>
    <form method="POST" action="/api/unsubscribe">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <input type="hidden" name="type" value="${escapeHtml(type)}" />
      <button type="submit" class="btn">Confirm Unsubscribe</button>
    </form>
    <p style="margin-top: 1rem;"><a href="/">Cancel</a></p>
  </div>
</body>
</html>`
}

function renderPage(message: string, success: boolean): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Preferences - InstantMed</title>
  ${pageStyles}
</head>
<body>
  <div class="container">
    <div class="icon">${success ? "✓" : "⚠️"}</div>
    <h1>${success ? "Unsubscribed" : "Error"}</h1>
    <p>${escapeHtml(message)}</p>
    ${success ? '<p style="margin-top: 1.5rem;"><a href="/">Return to InstantMed</a></p>' : ""}
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const pageStyles = `<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; margin: 0;
    background: linear-gradient(to bottom, #f0f9ff, #ffffff);
  }
  .container { text-align: center; padding: 2rem; max-width: 400px; }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem; }
  p { color: #64748b; line-height: 1.6; }
  a { color: #0ea5e9; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .btn {
    background: #0ea5e9; color: white; border: none; padding: 0.75rem 1.5rem;
    border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-top: 1rem;
  }
  .btn:hover { background: #0284c7; }
</style>`
