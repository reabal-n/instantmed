import { NextRequest, NextResponse } from "next/server"

import { requestAccessMagicLink } from "@/lib/auth/request-access-magic-link"
import { PATIENT_REQUEST_ACCESS_COOKIE } from "@/lib/crypto/patient-request-access-token"
import { getClientIdentifier } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

export async function POST(request: NextRequest) {
  // Keep capability/body and provider outcomes indistinguishable.
  // /track scope lets the browser send the existing HttpOnly capability cookie.
  const csrfError = await requireValidCsrf(request)
  if (csrfError) return csrfError
  try {
    if ((await request.text()) === "") {
      await requestAccessMagicLink({
        capabilityCookie: request.cookies.get(PATIENT_REQUEST_ACCESS_COOKIE)?.value,
        ipKey: getClientIdentifier(request),
      })
    }
  } catch { /* Uniform non-enumerating response, including infrastructure errors. */ }
  return NextResponse.json({ accepted: true }, { headers: {
    "Cache-Control": "private, no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
  } })
}
