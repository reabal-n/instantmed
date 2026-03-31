import { NextRequest, NextResponse } from "next/server"
import { verifyExitIntentToken } from "@/lib/crypto/exit-intent-token"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("exit-intent-open-tracking")

// 1x1 transparent PNG (68 bytes)
const TRACKING_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
)

/**
 * GET /api/exit-intent/open?t=<token>&r=<reminder_number>
 *
 * Invisible tracking pixel embedded in nurture emails.
 * Records when an email is opened. Always returns the pixel
 * regardless of token validity (never reveal tracking state).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("t")
  const reminder = searchParams.get("r") // "2" or "3"

  // Always return pixel — never leak whether token was valid
  const pixelResponse = () =>
    new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": TRACKING_PIXEL.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

  if (!token || !reminder || !["2", "3"].includes(reminder)) {
    return pixelResponse()
  }

  const result = verifyExitIntentToken(token)
  if (!result || result.action !== "open") {
    return pixelResponse()
  }

  // Record open timestamp (non-blocking, best-effort)
  try {
    const supabase = createServiceRoleClient()
    const column = reminder === "2" ? "reminder_2_opened_at" : "reminder_3_opened_at"

    // Only set if not already set (first open wins)
    await supabase
      .from("exit_intent_captures")
      .update({ [column]: new Date().toISOString() })
      .eq("id", result.captureId)
      .is(column, null)

    logger.info("Exit intent email opened", {
      captureId: result.captureId,
      reminder,
    })
  } catch {
    // Never fail — pixel must always return
  }

  return pixelResponse()
}
