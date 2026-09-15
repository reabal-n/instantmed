import "server-only"

import { createHash } from "node:crypto"

import { APP_URL } from "@/lib/constants"
import { verifyPatientRequestAccessToken } from "@/lib/crypto/patient-request-access-token"
import { buildPatientIntakeHref } from "@/lib/dashboard/routes"
import { buildPostSignInRedirectHref } from "@/lib/navigation/auth-handoff"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type RequestAccessLinkResult = { accepted: true }
const ACCEPTED: RequestAccessLinkResult = { accepted: true }

/** The capability selects a mailbox, never an authenticated session or document. */
export async function requestAccessMagicLink(input: {
  capabilityCookie: string | undefined
  ipKey: string
}): Promise<RequestAccessLinkResult> {
  try {
    // Fixed prefixes keep even the rate limiter's truncated error context free
    // of identifiers. Only irreversible digests enter its storage keys.
    const digest = (value: string) => createHash("sha256").update(value).digest("hex")
    const ipLimit = await checkServerActionRateLimit(
      `request-access-link:ip:${digest(input.ipKey)}`, "auth",
    )
    if (!ipLimit.success || !input.capabilityCookie) return ACCEPTED
    const verified = verifyPatientRequestAccessToken(input.capabilityCookie)
    if (!verified) return ACCEPTED
    const capabilityLimit = await checkServerActionRateLimit(
      `request-access-link:capability:${digest(input.capabilityCookie)}`, "sensitive",
    )
    if (!capabilityLimit.success) return ACCEPTED

    const service = createServiceRoleClient()
    const { data: intake, error } = await service.from("intakes")
      .select("patient:profiles!patient_id(email, role, auth_user_id, account_closed_at, merged_into_profile_id)")
      .eq("id", verified.intakeId)
      .maybeSingle()
    if (error || !intake) return ACCEPTED
    const raw = intake.patient
    const patient = Array.isArray(raw) ? raw[0] : raw
    if (!patient || patient.role !== "patient" || patient.account_closed_at ||
      patient.merged_into_profile_id || !patient.email) return ACCEPTED
    const email = patient.email.trim().toLowerCase()
    if (patient.auth_user_id) {
      const { data, error: userError } = await service.auth.admin.getUserById(patient.auth_user_id)
      if (userError || data.user?.email?.toLowerCase() !== email) return ACCEPTED
    }

    const callback = new URL("/auth/callback", APP_URL)
    // Email may open in another browser without the original /track cookie.
    // Carry only the destination, never the capability. The authenticated
    // request page still verifies ownership before reading clinical content.
    callback.searchParams.set("next", buildPostSignInRedirectHref(
      buildPatientIntakeHref(verified.intakeId),
    ))
    // The production auth-email hook builds a one-time confirmation link.
    // The post-sign-in handoff links the profile using the verified email.
    const auth = await createClient()
    await auth.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: callback.toString() },
    })
  } catch {
    // Provider/DB errors can contain mailbox or token values. None leave this boundary.
  }
  return ACCEPTED
}
