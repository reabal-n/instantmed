import { buildPostSignInHref } from "@/lib/navigation/auth-handoff"

export function buildCompleteAccountPostSignInHref({
  intakeId,
  certificateAccess,
}: {
  intakeId?: string
  certificateAccess: boolean
}): string {
  if (!intakeId) {
    return buildPostSignInHref()
  }

  return buildPostSignInHref({
    intake_id: intakeId,
    redirect: certificateAccess ? `/patient/intakes/${intakeId}` : undefined,
  })
}
