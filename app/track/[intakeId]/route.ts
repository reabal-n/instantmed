import { NextRequest, NextResponse } from "next/server"

import { getOptionalAuth } from "@/lib/auth/helpers"
import {
  PATIENT_REQUEST_ACCESS_COOKIE,
  PATIENT_REQUEST_ACCESS_MAX_AGE_SECONDS,
  verifyPatientRequestAccessToken,
} from "@/lib/crypto/patient-request-access-token"
import { buildPatientIntakeHref } from "@/lib/dashboard/routes"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function privateRedirect(destination: URL): NextResponse {
  const response = NextResponse.redirect(destination, 303)
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ intakeId: string }> },
): Promise<NextResponse> {
  const { intakeId: tokenOrLegacyId } = await params
  const verified = verifyPatientRequestAccessToken(tokenOrLegacyId)

  if (verified) {
    const response = privateRedirect(new URL("/track/request", request.url))
    response.cookies.set(PATIENT_REQUEST_ACCESS_COOKIE, tokenOrLegacyId, {
      httpOnly: true,
      maxAge: PATIENT_REQUEST_ACCESS_MAX_AGE_SECONDS,
      path: "/track",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    })
    return response
  }

  // Old lifecycle emails used a raw intake UUID. Preserve those links only
  // for a currently authenticated owner; a UUID never authorizes a public
  // service-role projection.
  if (UUID_RE.test(tokenOrLegacyId)) {
    const authUser = await getOptionalAuth()
    if (authUser?.profile.role === "patient") {
      const supabase = createServiceRoleClient()
      const { data: ownedIntake } = await supabase
        .from("intakes")
        .select("id")
        .eq("id", tokenOrLegacyId)
        .eq("patient_id", authUser.profile.id)
        .maybeSingle()

      if (ownedIntake) {
        return privateRedirect(
          new URL(buildPatientIntakeHref(tokenOrLegacyId), request.url),
        )
      }
    }
  }

  const response = privateRedirect(new URL("/track/request", request.url))
  response.cookies.set(PATIENT_REQUEST_ACCESS_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/track",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  })
  return response
}
