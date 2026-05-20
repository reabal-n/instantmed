import { NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { getPatientUnreadMessageCount } from "@/lib/data/patient-messages"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("patient-nav-counts-api")

export const dynamic = "force-dynamic"

interface PatientNavCountsResponse {
  unreadMessages: number
}

const EMPTY_RESPONSE: PatientNavCountsResponse = { unreadMessages: 0 }

export async function GET() {
  const authResult = await getApiAuth()
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const unreadMessages = await getPatientUnreadMessageCount(authResult.profile.id)
    return NextResponse.json(
      { unreadMessages } satisfies PatientNavCountsResponse,
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    log.warn("Failed to load patient nav counts", {}, toError(error))
    return NextResponse.json(EMPTY_RESPONSE, { headers: { "Cache-Control": "no-store" } })
  }
}
