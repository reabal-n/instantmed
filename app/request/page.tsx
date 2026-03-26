import type { Metadata } from "next"
import Link from "next/link"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { RequestFlow } from "@/components/request"
import { mapServiceParam } from "@/lib/request/step-registry"
import { isMaintenanceMode, isServiceDisabled } from "@/lib/feature-flags"
import { isOutsideBusinessHours, isAtCapacity } from "@/lib/operational-config"
import { trackOperationalBlock } from "@/lib/posthog-server"
import { CONTACT_EMAIL_HELLO } from "@/lib/constants"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Medical certificates from $19, repeat medication from $29.95, doctor consultations from $49.95. Reviewed by Australian doctors. Most requests completed within 30 minutes.",
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
  }>
}) {
  // Check maintenance mode before anything else
  const maintenance = await isMaintenanceMode()
  const outsideHours = await isOutsideBusinessHours()
  const atCapacity = await isAtCapacity()

  if (maintenance.enabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
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

  // Outside business hours
  if (outsideHours.closed) {
    trackOperationalBlock({ blockType: "business_hours", source: "request_page" })
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              We&apos;re closed
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              We&apos;re outside our operating hours. We&apos;ll be back at {outsideHours.nextOpen ?? "8am"} AEST.
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
        </div>
      </div>
    )
  }

  // At capacity
  if (atCapacity) {
    trackOperationalBlock({ blockType: "capacity_limit", source: "request_page" })
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
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

  const params = await searchParams

  // Wrap auth in try-catch — if Clerk/Supabase is temporarily unavailable,
  // fall through to guest checkout rather than crashing the server component
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null
  let profile: Awaited<ReturnType<typeof getUserProfile>> = null
  try {
    user = await getCurrentUser()
    profile = user ? await getUserProfile(user.id) : null
  } catch {
    // Auth service unavailable — proceed as guest
    user = null
    profile = null
  }

  // Map URL param to unified service type
  // Returns null for invalid services (RequestFlow will show error)
  const initialService = mapServiceParam(params.service)

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
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
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

  return (
    <RequestFlow
      initialService={initialService}
      rawServiceParam={params.service}
      initialSubtype={params.subtype}
      initialMedication={params.medication}
      isAuthenticated={!!user}
      hasProfile={!!profile}
      hasCompleteIdentity={hasCompleteIdentity}
      hasMedicare={!!profile?.medicare_number}
      hasAddress={hasAddress}
      userEmail={user?.email ?? undefined}
      userName={profile?.full_name ?? undefined}
      userPhone={profile?.phone ?? undefined}
      profileDateOfBirth={profileDateOfBirth ?? undefined}
      profileMedicare={profile?.medicare_number ?? undefined}
      profileAddress={hasAddress ? {
        addressLine1: profile!.address_line1!,
        suburb: profile!.suburb!,
        state: profile!.state!,
        postcode: profile!.postcode!,
      } : undefined}
    />
  )
}
