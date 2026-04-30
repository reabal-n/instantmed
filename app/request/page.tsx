import type { Metadata } from "next"
import Link from "next/link"

import { RequestFlow } from "@/components/request"
import { trackOperationalBlock } from "@/lib/analytics/posthog-server"
import { getCurrentUser, getUserProfile } from "@/lib/auth/helpers"
import { isAtCapacity } from "@/lib/config/operational-config"
import { CONTACT_EMAIL_HELLO, PRICING_DISPLAY } from "@/lib/constants"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { isMaintenanceMode, isServiceDisabled } from "@/lib/feature-flags"
import { normalizeConsultSubtypeParam } from "@/lib/request/consult-flow"
import { mapServiceParam } from "@/lib/request/step-registry"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Get Started",
  description:
    `Medical certificates from $19 - issued in under 30 minutes, 24/7. Repeat medication from ${PRICING_DISPLAY.REPEAT_SCRIPT}, doctor consultations from ${PRICING_DISPLAY.CONSULT}. Reviewed by Australian doctors.`,
  openGraph: {
    title: "Get Started | InstantMed",
    description: "Medical certificates, medication renewals, and consultations online. Reviewed by Australian doctors.",
  },
}

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string
    subtype?: string
    medication?: string
    certType?: string
  }>
}) {
  const params = await searchParams
  const initialService = mapServiceParam(params.service)
  const initialSubtype = normalizeConsultSubtypeParam(params.subtype) ?? params.subtype

  // Check operational status - run in parallel, none depends on the others
  const [maintenance, atCapacity] = await Promise.all([
    isMaintenanceMode(),
    isAtCapacity(),
  ])

  if (maintenance.enabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning-light/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              We&apos;ll be back shortly
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {maintenance.message}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Back to home
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Need urgent help?{" "}
            <a href={`mailto:${CONTACT_EMAIL_HELLO}`} className="text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Business hours: no longer block the request page.
  // Med certs are 24/7 (auto-approved). Prescriptions/consults accept
  // submissions anytime - the navbar banner already sets expectations
  // about next-business-day review for doctor-dependent services.

  // At capacity
  if (atCapacity) {
    trackOperationalBlock({ blockType: "capacity_limit", source: "request_page" })
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning-light/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              High demand
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              We&apos;re experiencing high demand today. Please try again tomorrow or contact us if you need urgent assistance.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Back to home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Wrap auth in try-catch - if Supabase Auth is temporarily unavailable,
  // fall through to guest checkout rather than crashing the server component
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null
  let profile: Awaited<ReturnType<typeof getUserProfile>> = null
  try {
    user = await getCurrentUser()
    profile = user ? await getUserProfile(user.id) : null
  } catch {
    // Auth service unavailable - proceed as guest
    user = null
    profile = null
  }

  // Block disabled services before showing the flow
  if (initialService) {
    const category =
      initialService === "med-cert"
        ? "medical_certificate"
        : initialService === "prescription" || initialService === "repeat-script"
          ? "prescription"
          : "other"
    const serviceDisabled = await isServiceDisabled(category)
    if (serviceDisabled) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-warning-light/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-3">
                This service is temporarily unavailable
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                We&apos;ll be back soon. Please try again later or contact us if you have questions.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Back to home
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Contact us
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Need urgent help?{" "}
              <a href={`mailto:${CONTACT_EMAIL_HELLO}`} className="text-primary hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      )
    }
  }

  let profileDateOfBirth: string | null = null
  if (profile) {
    try {
      const decrypted = decryptProfilePhi(profile as unknown as Record<string, unknown>)
      const dob = decrypted.date_of_birth
      profileDateOfBirth = dob
        ? (typeof dob === "string" ? dob : dob instanceof Date ? dob.toISOString().split("T")[0] : null)
        : null
    } catch {
      profileDateOfBirth = null
    }
  }
  const hasCompleteIdentity = !!profile && !!profileDateOfBirth
  const hasAddress = !!(profile?.address_line1 && profile?.suburb && profile?.state && profile?.postcode)
  const hasValidMedicareNumber = !!profile?.medicare_number && validateMedicareNumber(profile.medicare_number).valid
  const hasValidMedicareExpiry = !!profile?.medicare_expiry && validateMedicareExpiry(profile.medicare_expiry).valid
  const hasValidMedicare = hasValidMedicareNumber && !!profile?.medicare_irn && hasValidMedicareExpiry
  const hasSex = !!profile?.sex

  return (
    <RequestFlow
      initialService={initialService}
      rawServiceParam={params.service}
      initialSubtype={initialSubtype}
      initialMedication={params.medication}
      initialCertType={params.certType}
      isAuthenticated={!!user}
      hasProfile={!!profile}
      hasCompleteIdentity={hasCompleteIdentity}
      hasMedicare={hasValidMedicare}
      hasAddress={hasAddress}
      hasPhone={!!profile?.phone}
      hasSex={hasSex}
      userEmail={user?.email ?? undefined}
      userName={profile?.full_name ?? undefined}
      userPhone={profile?.phone ?? undefined}
      profileDateOfBirth={profileDateOfBirth ?? undefined}
      profileMedicare={hasValidMedicareNumber ? profile?.medicare_number ?? undefined : undefined}
      profileMedicareIrn={profile?.medicare_irn ?? undefined}
      profileMedicareExpiry={hasValidMedicareExpiry ? profile?.medicare_expiry ?? undefined : undefined}
      profileSex={hasSex ? profile?.sex ?? undefined : undefined}
      profileAddress={hasAddress ? {
        addressLine1: profile!.address_line1!,
        suburb: profile!.suburb!,
        state: profile!.state!,
        postcode: profile!.postcode!,
      } : undefined}
    />
  )
}
