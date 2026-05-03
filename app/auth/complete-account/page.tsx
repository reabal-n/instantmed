import { Suspense } from "react"

import { Footer, Navbar } from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { CompleteAccountForm } from "./complete-account-form"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Complete Your Account",
  description: "Create your account to access your medical certificate",
}

export default async function CompleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; intake_id?: string; email?: string; session_id?: string }>
}) {
  const params = await searchParams
  // Support both intake_id (guest checkout) and request_id (legacy)
  const intakeId = params.intake_id || params.request_id

  // Fetch email + amount + service so the form can fire trackPurchase on mount.
  // Guest checkouts land here (not /patient/intakes/success), so without firing
  // the gtag conversion here we lose browser-side attribution for ~all guests.
  let email = params.email
  let amountCents: number | undefined
  let serviceSlug: string | undefined
  let serviceName: string | undefined
  let isNewCustomer = true
  if (intakeId) {
    try {
      const supabase = createServiceRoleClient()
      const { data: intake } = await supabase
        .from("intakes")
        .select("amount_cents, patient_id, patient:profiles!patient_id(email), service:services!service_id(slug, name)")
        .eq("id", intakeId)
        .eq("payment_status", "paid")
        .single()

      const patient = intake?.patient as { email?: string } | null
      const service = intake?.service as { slug?: string; name?: string } | null
      if (!email) email = patient?.email || undefined
      amountCents = (intake?.amount_cents as number | undefined) ?? undefined
      serviceSlug = service?.slug
      serviceName = service?.name

      if (intake?.patient_id) {
        const { count } = await supabase
          .from("intakes")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", intake.patient_id)
          .not("paid_at", "is", null)
          .neq("id", intakeId)

        isNewCustomer = (count ?? 0) === 0
      }
    } catch {
      // Silently fail - tracking is best-effort
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-background to-muted/30 pt-32 pb-20">
        <div className="max-w-md mx-auto px-4">
          <Suspense fallback={
            <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
              <span className="sr-only" role="status">Loading form</span>
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          }>
            <CompleteAccountForm
              intakeId={intakeId}
              email={email}
              amountCents={amountCents}
              serviceSlug={serviceSlug}
              serviceName={serviceName}
              isNewCustomer={isNewCustomer}
            />
          </Suspense>
        </div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}
