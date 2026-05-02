import { Loader2 } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { selectGuestProfileForAuthLink } from "@/lib/auth/guest-profile-linking"
import { createLogger } from "@/lib/observability/logger"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { PostSignInAuthWaiter } from "./auth-waiter"

function AuthWaiterFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

/** Escape ILIKE special characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

const log = createLogger("post-signin")
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = "force-dynamic"

function destinationKind(destination: string): string {
  if (destination.startsWith("/patient/intakes/success")) return "patient_intake_success"
  if (destination.startsWith("/patient/onboarding")) return "patient_onboarding"
  if (destination.startsWith("/patient")) return "patient_dashboard"
  if (destination.startsWith("/doctor")) return "doctor_dashboard"
  return "other"
}

type GuestProfileCandidateRow = {
  id: string
  role: string
  onboarding_completed: boolean | null
  auth_user_id: string | null
  created_at: string | null
}

type GuestProfileLinkCandidate = GuestProfileCandidateRow & {
  has_paid_intake: boolean
}

async function getPreferredGuestProfileIdForIntake(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string | undefined,
  primaryEmail: string,
): Promise<string | null> {
  if (!intakeId || !UUID_RE.test(intakeId)) return null

  const { data: intake } = await supabase
    .from("intakes")
    .select("patient_id, patient:profiles!patient_id(id, email, role, auth_user_id)")
    .eq("id", intakeId)
    .eq("payment_status", "paid")
    .maybeSingle()

  const patientRaw = intake?.patient as
    | { id: string; email: string | null; role: string | null; auth_user_id: string | null }
    | { id: string; email: string | null; role: string | null; auth_user_id: string | null }[]
    | null
    | undefined
  const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
  if (
    patient?.id &&
    patient.role === "patient" &&
    !patient.auth_user_id &&
    patient.email?.toLowerCase() === primaryEmail
  ) {
    return patient.id
  }

  return null
}

async function getGuestProfileLinkCandidates(
  supabase: ReturnType<typeof createServiceRoleClient>,
  primaryEmail: string,
  preferredProfileId: string | null,
): Promise<GuestProfileLinkCandidate[]> {
  const { data: guestProfiles } = await supabase
    .from("profiles")
    .select("id, role, onboarding_completed, auth_user_id, created_at")
    .ilike("email", escapeIlike(primaryEmail))
    .eq("role", "patient")
    .is("auth_user_id", null)
    .order("created_at", { ascending: false })
    .limit(10)

  const profileRows = (guestProfiles || []) as GuestProfileCandidateRow[]
  if (profileRows.length === 0) return []

  const profileIds = profileRows.map((profile) => profile.id)
  const { data: paidIntakes } = await supabase
    .from("intakes")
    .select("patient_id")
    .in("patient_id", profileIds)
    .eq("payment_status", "paid")
    .limit(100)

  const paidProfileIds = new Set((paidIntakes || []).map((intake) => intake.patient_id as string))

  return profileRows.map((profile) => ({
    ...profile,
    has_paid_intake: profile.id === preferredProfileId || paidProfileIds.has(profile.id),
  }))
}

/**
 * Post Sign-In Handler
 *
 * Ensures the user's profile is properly linked before redirecting.
 * The handle_new_user() DB trigger creates profiles on auth.users insert,
 * so this page mainly handles:
 * 1. Waiting for profile creation (race condition with trigger)
 * 2. Guest profile linking (guest checkout → sign-up → link by email)
 * 3. Redirecting to the correct destination
 */
export default async function PostSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; intake_id?: string }>
}) {
  const params = await searchParams
  const paramsString = new URLSearchParams(params as Record<string, string>).toString()

  // Check Supabase Auth session
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  // Not authenticated - render a client-side auth waiter
  if (!user) {
    log.info("No user, rendering auth waiter (avoids redirect loop)")
    return (
      <Suspense fallback={<AuthWaiterFallback />}>
        <PostSignInAuthWaiter paramsString={paramsString} />
      </Suspense>
    )
  }

  const primaryEmail = user.email?.toLowerCase()
  const userId = user.id

  log.info("Post sign-in check started", { hasEmail: Boolean(primaryEmail) })

  const supabase = createServiceRoleClient()

  // Try to find profile with retries (handles race condition with trigger)
  let profile = null
  const maxRetries = 5
  const retryDelayMs = 500

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Check by auth_user_id
    const { data: existingProfile, error: lookupError } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("auth_user_id", userId)
      .maybeSingle()

    if (lookupError) {
      log.warn("Profile lookup error", { error: lookupError.message, attempt })
    }

    if (existingProfile) {
      profile = existingProfile
      log.info("Found profile by auth_user_id", { attempt })
      break
    }

    // Try to link one deterministic guest profile by email. Prefer the paid
    // checkout profile that brought the user here, then any profile with paid
    // history, then the newest unlinked duplicate.
    if (primaryEmail) {
      const preferredProfileId = await getPreferredGuestProfileIdForIntake(supabase, params.intake_id, primaryEmail)
      const guestProfiles = await getGuestProfileLinkCandidates(supabase, primaryEmail, preferredProfileId)
      const guestProfile = selectGuestProfileForAuthLink(guestProfiles, preferredProfileId)

      if (guestProfile) {
        const fullName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || primaryEmail.split('@')[0]

        const { data: linkedProfile, error: linkError } = await supabase
          .from("profiles")
          .update({
            auth_user_id: userId,
            email: primaryEmail,
            full_name: fullName,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            email_verified: true,
            email_verified_at: new Date().toISOString(),
          })
          .eq("id", guestProfile.id)
          .eq("role", "patient")
          .is("auth_user_id", null)
          .select("id, role, onboarding_completed")
          .maybeSingle()

        if (linkedProfile) {
          profile = linkedProfile
          log.info("Linked guest profile", { attempt })
          break
        } else if (linkError) {
          log.warn("Failed to link guest profile", { error: linkError.message, attempt })
        }

        // Check if another process already linked it
        const { data: nowLinkedProfile } = await supabase
          .from("profiles")
          .select("id, role, onboarding_completed")
          .eq("auth_user_id", userId)
          .maybeSingle()

        if (nowLinkedProfile) {
          profile = nowLinkedProfile
          log.info("Found profile linked by trigger/another process", { attempt })
          break
        }
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < maxRetries) {
      log.info("Profile not found, retrying", { attempt, maxRetries })
      await new Promise(resolve => setTimeout(resolve, retryDelayMs))
    }
  }

  // If still no profile after retries, create one manually (safety net)
  if (!profile && primaryEmail) {
    const fullName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || primaryEmail.split('@')[0]

    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: userId,
        email: primaryEmail,
        full_name: fullName,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: "patient",
        onboarding_completed: false,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .select("id, role, onboarding_completed")
      .single()

    if (!createError && newProfile) {
      profile = newProfile
      log.info("Created new profile (trigger did not fire)")
    } else if (createError?.code === '23505') {
      // Race condition - trigger created it
      const { data: raceProfile } = await supabase
        .from("profiles")
        .select("id, role, onboarding_completed")
        .eq("auth_user_id", userId)
        .maybeSingle()
      if (raceProfile) {
        profile = raceProfile
      }
    }
  }

  // Error state
  if (!profile) {
    log.error("Failed to create or find profile after all attempts", { hasEmail: Boolean(primaryEmail) })

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive-light flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Account Setup Issue</h1>
          <p className="text-muted-foreground">
            We encountered an issue setting up your account. This is usually temporary.
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/post-signin"
              className="block w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full px-4 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Go to Home
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            If this issue persists, please contact support.
          </p>
        </div>
      </div>
    )
  }

  // Determine final redirect destination
  let destination: string

  if (params.redirect) {
    const decodedRedirect = decodeURIComponent(params.redirect)
    if (decodedRedirect.startsWith('/') && !decodedRedirect.startsWith('//')) {
      destination = decodedRedirect
    } else {
      destination = profile.onboarding_completed ? "/patient" : "/patient/onboarding"
    }
  } else if (params.intake_id) {
    destination = `/patient/intakes/success?intake_id=${params.intake_id}`
  } else {
    if (profile.role === "doctor" || profile.role === "admin") {
      destination = "/doctor/dashboard"
    } else {
      destination = profile.onboarding_completed ? "/patient" : "/patient/onboarding"
    }
  }

  log.info("Post sign-in complete, redirecting", { destinationKind: destinationKind(destination), profileFound: true, role: profile.role })

  redirect(destination)
}
