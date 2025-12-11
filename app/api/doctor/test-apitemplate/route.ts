import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { testApiTemplateConnection } from "@/lib/documents/apitemplate"

export async function GET() {
  try {
    // Verify doctor auth
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await testApiTemplateConnection()

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error testing APITemplate connection:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
