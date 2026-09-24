import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { checkGoogleAdsApiVersion, checkOpenAIReviewModel, checkTwilioVoiceReadiness } from "@/lib/integrations/credential-readiness"

export const dynamic = "force-dynamic"
export const maxDuration = 20

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const checks = [...await checkOpenAIReviewModel(), ...checkTwilioVoiceReadiness(), ...checkGoogleAdsApiVersion()]
  return NextResponse.json({
    success: checks.every((check) => check.status === "pass"),
    source: "deployed-runtime",
    release: /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA ?? "") ? process.env.VERCEL_GIT_COMMIT_SHA : null,
    checks,
  }, { headers: { "Cache-Control": "no-store" } })
}
