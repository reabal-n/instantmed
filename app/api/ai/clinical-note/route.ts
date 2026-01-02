import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { logger } from "@/lib/logger"

/**
 * AI Clinical Note Generation
 * 
 * This feature is DISABLED by default. To enable:
 * 1. Install: pnpm add @ai-sdk/openai ai
 * 2. Set VERCEL_AI_GATEWAY_API_KEY in environment
 * 3. Replace this stub with the full implementation
 */

export async function POST(request: NextRequest) {
  // Suppress unused variable warning
  void request;
  
  try {
    // Require doctor authentication even for disabled feature
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Feature disabled - AI SDK not installed
    return NextResponse.json(
      { 
        success: false,
        error: "AI note generation is disabled. Please install @ai-sdk/openai and ai packages to enable this feature.",
        note: null,
      },
      { status: 503 }
    )
  } catch (error) {
    logger.error("Error in clinical-note route", { error })
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
