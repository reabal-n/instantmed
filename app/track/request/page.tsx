import { Clock3, FileCheck2, LockKeyhole, MessageCircleQuestion, ShieldAlert } from "lucide-react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { getOptionalAuth } from "@/lib/auth/helpers"
import { CONTACT_EMAIL } from "@/lib/constants"
import {
  PATIENT_REQUEST_ACCESS_COOKIE,
  verifyPatientRequestAccessToken,
} from "@/lib/crypto/patient-request-access-token"
import { buildPatientIntakeHref } from "@/lib/dashboard/routes"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { IntakeStatus } from "@/types/intake"

type PatientJoin = {
  account_closed_at?: string | null
  auth_user_id?: string | null
  merged_into_profile_id?: string | null
  role?: string | null
}
type ServiceJoin = { name?: string | null; short_name?: string | null }

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  description: "Open a private InstantMed request update.",
  referrer: "no-referrer",
  robots: { follow: false, index: false },
  title: "Secure Request Access",
}

function statusCopy(status: IntakeStatus): {
  description: string
  icon: typeof Clock3
  title: string
} {
  switch (status) {
    case "pending_info":
      return {
        description: "Sign in or create your secure account to read the doctor’s question and reply.",
        icon: MessageCircleQuestion,
        title: "The doctor needs a little more information",
      }
    case "paid":
      return {
        description: "Your request is safely in the review queue. We’ll email you when it moves forward.",
        icon: Clock3,
        title: "Request received",
      }
    case "in_review":
    case "escalated":
      return {
        description: "A doctor is reviewing the information you provided. We’ll email you when there’s an update.",
        icon: Clock3,
        title: "Doctor review in progress",
      }
    case "awaiting_script":
      return {
        description: "Your prescription has been approved and is being prepared. Delivery updates will arrive by email or SMS.",
        icon: Clock3,
        title: "Prescription preparation in progress",
      }
    case "approved":
    case "completed":
      return {
        description: "Create an account or sign in to view the completed request and any available documents.",
        icon: FileCheck2,
        title: "Your request is complete",
      }
    case "declined":
      return {
        description: "The review is complete. Open your secure account for the doctor’s outcome and refund details.",
        icon: FileCheck2,
        title: "Review complete",
      }
    case "pending_payment":
    case "checkout_failed":
      return {
        description: "We couldn’t confirm this request from this link. Contact support before attempting another payment.",
        icon: ShieldAlert,
        title: "Payment needs attention",
      }
    case "cancelled":
    case "expired":
      return {
        description: "This request is no longer active. Contact support if you think that’s a mistake.",
        icon: ShieldAlert,
        title: "Request closed",
      }
    case "draft":
    default:
      return {
        description: "Open your secure account or contact support for the latest request information.",
        icon: LockKeyhole,
        title: "Secure request access",
      }
  }
}

function AccessShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-background to-muted/30 px-4 pb-20 pt-28 sm:pt-32">
        <div className="mx-auto max-w-md">{children}</div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}

function InvalidAccess() {
  return (
    <AccessShell>
      <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted" aria-hidden="true">
          <LockKeyhole className="h-6 w-6 text-muted-foreground" />
        </div>
        <Heading as="h1" className="mt-5" level="h2">Open your request securely</Heading>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This link is no longer valid. Sign in with the email used for your request, or contact support and we’ll help.
        </p>
        <div className="mt-6 space-y-3">
          <Button asChild className="min-h-12 w-full rounded-xl" size="lg">
            <Link href="/sign-up">Create account</Link>
          </Button>
          <Button asChild className="min-h-12 w-full rounded-xl" size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Still stuck?{" "}
          <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            Contact support
          </a>
          .
        </p>
      </div>
    </AccessShell>
  )
}

export default async function SecureRequestPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(PATIENT_REQUEST_ACCESS_COOKIE)?.value
  const verified = token ? verifyPatientRequestAccessToken(token) : null
  const authUser = await getOptionalAuth()
  if (!verified) {
    if (authUser?.profile.role === "patient") redirect("/patient")
    return <InvalidAccess />
  }

  const supabase = createServiceRoleClient()
  const { data: intake, error } = await supabase
    .from("intakes")
    .select("id, patient_id, status, patient:profiles!patient_id(role, auth_user_id, account_closed_at, merged_into_profile_id), service:services!service_id(name, short_name)")
    .eq("id", verified.intakeId)
    .single()

  if (error || !intake?.patient_id) return <InvalidAccess />

  const patientRaw = intake.patient as PatientJoin | PatientJoin[] | null
  const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
  const isOpenPatient = patient?.role === "patient" &&
    !patient.account_closed_at &&
    !patient.merged_into_profile_id
  if (!isOpenPatient) return <InvalidAccess />

  const intakeHref = buildPatientIntakeHref(intake.id)
  if (authUser?.profile.role === "patient" && authUser.profile.id === intake.patient_id) {
    redirect(intakeHref)
  }

  const serviceRaw = intake.service as ServiceJoin | ServiceJoin[] | null
  const service = Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw
  const serviceLabel = service?.short_name || service?.name || "Medical request"
  const safeStatus = statusCopy(intake.status as IntakeStatus)
  const StatusIcon = safeStatus.icon
  return (
    <AccessShell>
      <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">{serviceLabel}</p>
        <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10" aria-hidden="true">
          <StatusIcon className="h-6 w-6 text-primary" />
        </div>
        <Heading as="h1" className="mt-5" level="h2">{safeStatus.title}</Heading>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{safeStatus.description}</p>

        <div className="mt-6 space-y-3">
          <Button asChild className="min-h-12 w-full rounded-xl" size="lg">
            <Link href={patient?.auth_user_id
              ? "/sign-in?redirect=%2Ftrack%2Frequest"
              : "/sign-up?redirect=%2Ftrack%2Frequest"}
            >
              {patient?.auth_user_id ? "Sign in to open request" : "Create account and open request"}
            </Link>
          </Button>
          {!patient?.auth_user_id ? (
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                className="font-medium text-primary underline underline-offset-4"
                href="/sign-in?redirect=%2Ftrack%2Frequest"
              >
                Sign in
              </Link>
            </p>
          ) : null}
        </div>

        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Need help?{" "}
          <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            Contact support
          </a>
          .
        </p>
      </div>
    </AccessShell>
  )
}
