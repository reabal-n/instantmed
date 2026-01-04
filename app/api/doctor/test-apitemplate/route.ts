import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { testApiTemplateConnection } from "@/lib/documents/apitemplate"
import { logger } from "@/lib/logger"

export async function GET() {
  // SECURITY: Disable test endpoints in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    )
  }

  try {
    // Verify doctor auth
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await testApiTemplateConnection()

    return NextResponse.json(result)
  } catch (error) {
    logger.error("[v0] Error testing APITemplate connection:", { error })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
