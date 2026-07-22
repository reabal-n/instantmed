import { buildPostSignInHref } from "@/lib/navigation/auth-handoff"

export function buildVerifiedCompleteAccountHref({
  appUrl = "",
  intakeId,
  sessionId,
}: {
  appUrl?: string
  intakeId: string
  sessionId: string
}): string {
  const baseUrl = appUrl.replace(/\/+$/, "")
  const params = new URLSearchParams({
    intake_id: intakeId,
    session_id: sessionId,
  })
  return `${baseUrl}/auth/complete-account?${params.toString()}`
}

export function buildCompleteAccountPostSignInHref({
  intakeId,
}: {
  intakeId?: string
}): string {
  if (!intakeId) {
    return buildPostSignInHref()
  }

  return buildPostSignInHref({
    intake_id: intakeId,
  })
}
