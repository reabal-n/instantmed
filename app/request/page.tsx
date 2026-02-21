import type { Metadata } from "next"
import Link from "next/link"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { RequestFlow } from "@/components/request"
import { mapServiceParam } from "@/lib/request/step-registry"
import { isMaintenanceMode } from "@/lib/feature-flags"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Medical certificates from $19, repeat prescriptions $29.95, doctor consultations from $49.95. Reviewed by Australian doctors. Most requests completed within 1 hour.",
  openGraph: {
    title: "Get Started | InstantMed",
    description: "Medical certificates, prescriptions, and consultations online. Reviewed by Australian doctors.",
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
            <a href="mailto:hello@instantmed.com.au" className="text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    )
  }

  const params = await searchParams
  const user = await getCurrentUser()
  const profile = user ? await getUserProfile(user.id) : null

  // Map URL param to unified service type
  // Returns null for invalid services (RequestFlow will show error)
  const initialService = mapServiceParam(params.service)

  return (
    <RequestFlow
      initialService={initialService}
      rawServiceParam={params.service}
      initialSubtype={params.subtype}
      initialMedication={params.medication}
      isAuthenticated={!!user}
      hasProfile={!!profile}
      hasMedicare={!!profile?.medicare_number}
      userEmail={user?.email ?? undefined}
      userName={profile?.full_name ?? undefined}
    />
  )
}
