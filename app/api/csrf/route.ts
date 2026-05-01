import { NextResponse } from "next/server"

import { getCSRFTokenForClient } from "@/lib/security/csrf"

export const dynamic = "force-dynamic"

export async function GET() {
  const token = await getCSRFTokenForClient()
  return NextResponse.json({ token }, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
