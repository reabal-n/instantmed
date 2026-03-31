import { NextRequest, NextResponse } from "next/server"
import { verifyExitIntentToken } from "@/lib/crypto/exit-intent-token"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("exit-intent-unsubscribe")

/**
 * GET /api/exit-intent/unsubscribe?token=<signed_token>
 *
 * Shows confirmation page. No state change on GET (CSRF-safe).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return htmlResponse(renderPage("Invalid unsubscribe link.", false), 400)
  }

  const result = verifyExitIntentToken(token)
  if (!result || result.action !== "unsubscribe") {
    return htmlResponse(renderPage("This unsubscribe link is invalid or has expired.", false), 403)
  }

  return htmlResponse(renderConfirmationPage(token), 200)
}

/**
 * POST /api/exit-intent/unsubscribe
 *
 * Performs the unsubscribe. Marks exit_intent_captures row as unsubscribed.
 * Also adds email to a global suppression check for future captures.
 */
export async function POST(request: NextRequest) {
  let token: string

  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData()
    token = formData.get("token") as string
  } else {
    try {
      const body = await request.json()
      token = body.token
    } catch {
      return htmlResponse(renderPage("Invalid request.", false), 400)
    }
  }

  if (!token) {
    return htmlResponse(renderPage("Invalid unsubscribe link.", false), 400)
  }

  const result = verifyExitIntentToken(token)
  if (!result || result.action !== "unsubscribe") {
    return htmlResponse(renderPage("This unsubscribe link is invalid or has expired.", false), 403)
  }

  const supabase = createServiceRoleClient()

  try {
    // Mark this specific capture as unsubscribed
    const { error, data } = await supabase
      .from("exit_intent_captures")
      .update({
        unsubscribed: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", result.captureId)
      .eq("unsubscribed", false)
      .select("email")
      .maybeSingle()

    if (error) {
      logger.error("Failed to unsubscribe exit intent capture", { captureId: result.captureId }, error)
      return htmlResponse(renderPage("Something went wrong. Please try again.", false), 500)
    }

    // Also mark ALL other active captures for this email as unsubscribed
    if (data?.email) {
      await supabase
        .from("exit_intent_captures")
        .update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("email", data.email)
        .eq("unsubscribed", false)
    }

    logger.info("Exit intent unsubscribe processed", { captureId: result.captureId })

    return htmlResponse(renderPage("You've been unsubscribed from these reminder emails.", true), 200)
  } catch (error) {
    logger.error("Exit intent unsubscribe error", { captureId: result.captureId }, error)
    return htmlResponse(renderPage("An error occurred. Please try again.", false), 500)
  }
}

// One-click unsubscribe (RFC 8058) — email clients POST directly
// Uses same token validation as the form POST
export { POST as PUT }

function htmlResponse(html: string, status: number) {
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html" } })
}

function renderConfirmationPage(token: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - InstantMed</title>
  ${pageStyles}
</head>
<body>
  <div class="container">
    <div class="icon">📧</div>
    <h1>Unsubscribe</h1>
    <p>Are you sure you want to stop receiving reminder emails from InstantMed?</p>
    <form method="POST" action="/api/exit-intent/unsubscribe">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
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
  a { color: #0D9488; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .btn {
    background: #0D9488; color: white; border: none; padding: 0.75rem 1.5rem;
    border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-top: 1rem;
  }
  .btn:hover { background: #0F766E; }
</style>`
