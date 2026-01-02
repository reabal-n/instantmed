import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

/**
 * AI Decline Reason Generation
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
        error: "AI decline reason generation is disabled. Please install @ai-sdk/openai and ai packages to enable this feature.",
        reason: null,
      },
      { status: 503 }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in decline-reason route:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
