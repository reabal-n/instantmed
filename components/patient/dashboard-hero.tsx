"use client"

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Mail,
  MessageCircle,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { type ReactNode } from "react"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { type Intake } from "@/components/patient/intake-types"
import { type ProfileData } from "@/components/patient/profile-todo-card"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CONTACT_EMAIL } from "@/lib/constants"
import {
  buildPatientIntakeHref,
  buildPatientMessagesHref,
  buildPatientSettingsHref,
  buildRequestServiceHref,
  PATIENT_DOCUMENTS_HREF,
  REQUEST_HREF,
  REQUEST_REPEAT_SCRIPT_HREF,
} from "@/lib/dashboard/routes"
import { isMoreInformationRequiredPaymentRecovery } from "@/lib/patient/payment-recovery"
import { needsRenewalSoon } from "@/lib/prescriptions"
import { cn } from "@/lib/utils"

interface Prescription {
  id: string
  medication_name: string
  dosage_instructions: string
  issued_date: string
  expiry_date: string
  status: "active" | "expired"
}

export type DashboardHeroState =
  | "doctor-question"
  | "documents-ready"
  | "document-processing"
  | "live-review"
  | "more-information-required"
  | "stale-payment"
  | "renewal-due"
  | "profile-incomplete"
  | "empty"
  | "default"

/**
 * Returning-patient shortcut surfaced on the default "all caught up" hero.
 * If we know what they did last, we offer a one-tap path to repeat the
 * same service — the closest we can get to a 2-tap re-request without
 * skipping the clinical intake (which we won't, for safety).
 */
interface LastServiceShortcut {
  serviceParam: "med-cert" | "repeat-script" | "consult"
  subtype?: string
  label: string
}

interface DashboardHeroProps {
  firstName: string
  intakes: Intake[]
  prescriptions: Prescription[]
  profileData?: ProfileData
}

const DashboardServiceGrid = dynamic(
  () => import("@/components/patient/dashboard-service-grid").then((mod) => mod.DashboardServiceGrid),
)

const CopySupportSummaryButton = dynamic(
  () => import("@/components/patient/support-summary-button").then((mod) => mod.CopySupportSummaryButton),
  { ssr: false },
)

/**
 * Resolve which hero state takes priority based on patient context.
 *
 * Priority order (anxious-patient-first):
 *   1. Doctor needs a reply  → Highest priority. Block the patient's flow.
 *   2. Documents ready       → Confirmation of success; high-stakes moment.
 *   3. More info required    → Patient action needed; fresh form/support only.
 *   4. Live review           → Reassurance during waiting.
 *   5. Stale payment         → Recovery prompt for abandoned checkout.
 *   6. Renewal due           → Active prescription renewal reminder.
 *   7. Profile incomplete    → Only when blocking future requests.
 *   8. Empty state           → First-time user, surface the catalog.
 *   9. Default (caught up)   → Service grid + reassurance + optional
 *                              "Start another [last service]" shortcut for
 *                              returning patients (PR5, 2026-05-25).
 */
export function resolveHeroState({
  intakes,
  prescriptions,
  profileData,
}: {
  intakes: Intake[]
  prescriptions: Prescription[]
  profileData?: ProfileData
}): {
  state: DashboardHeroState
  intake?: Intake
  prescription?: Prescription
  lastService?: LastServiceShortcut
} {
  // 1. Doctor question: any intake with pending_info status
  const pendingInfo = intakes.find((i) => i.status === "pending_info")
  if (pendingInfo) return { state: "doctor-question", intake: pendingInfo }

  // 2. Documents ready: only claim a download exists when the dashboard query
  //    found a current valid certificate. Intake status alone is not proof that
  //    the PDF was generated successfully.
  const ready = intakes
    .filter(
      (i) =>
        i.document_ready === true &&
        (i.status === "approved" || i.status === "completed"),
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    )[0]
  if (ready) {
    const updated = new Date(ready.updated_at ?? ready.created_at).getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    if (updated > sevenDaysAgo) {
      return { state: "documents-ready", intake: ready }
    }
  }

  // 3. Approved medical certificate without a valid PDF yet. This is distinct
  //    from doctor review and avoids sending the patient to a missing download.
  const documentProcessing = intakes
    .filter(
      (i) =>
        i.service?.type === "med_certs" &&
        i.document_ready === false &&
        (i.status === "approved" || i.status === "completed"),
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    )[0]
  if (documentProcessing) {
    return { state: "document-processing", intake: documentProcessing }
  }

  // 4. A missing-information safety hold needs patient action, so it outranks
  //    reassurance for a separate request already under review. It is never a
  //    payment-retry state.
  const moreInformationRequired = intakes.find(isMoreInformationRequiredPaymentRecovery)
  if (moreInformationRequired) {
    return { state: "more-information-required", intake: moreInformationRequired }
  }

  // 5. Live review: most recent paid / in_review intake
  const inReview = intakes
    .filter((i) => i.status === "paid" || i.status === "in_review")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
  if (inReview) return { state: "live-review", intake: inReview }

  // 6. Payment recovery: failed checkout immediately; stale pending_payment over 1 hour.
  const failedPayment = intakes.find((i) => i.status === "checkout_failed")
  if (failedPayment) return { state: "stale-payment", intake: failedPayment }

  const stalePayment = intakes.find((i) => {
    if (i.status !== "pending_payment") return false
    return new Date(i.created_at).getTime() < Date.now() - 60 * 60 * 1000
  })
  if (stalePayment) return { state: "stale-payment", intake: stalePayment }

  // 7. Renewal due: active prescription expiring soon
  const renewal = prescriptions.find(
    (p) => p.status === "active" && needsRenewalSoon(p.expiry_date),
  )
  if (renewal) return { state: "renewal-due", prescription: renewal }

  // 8. Profile incomplete + has-request: missing required fields and has activity
  if (profileData && intakes.length > 0) {
    const missingPhone = !profileData.phone
    const missingAddress =
      !profileData.addressLine1 ||
      !profileData.suburb ||
      !profileData.state ||
      !profileData.postcode
    if (missingPhone || missingAddress) {
      return { state: "profile-incomplete" }
    }
  }

  // 9. Empty state: zero intakes, fresh patient
  if (intakes.length === 0 && prescriptions.length === 0) {
    return { state: "empty" }
  }

  // 10. Default: caught up. If we know what the patient did last, attach a
  //    "Start another [service]" shortcut so the dashboard becomes a 2-tap
  //    return-visit experience for the common case (one service per patient).
  return { state: "default", lastService: resolveLastServiceShortcut(intakes) }
}

function resolveLastServiceShortcut(intakes: Intake[]): LastServiceShortcut | undefined {
  if (intakes.length === 0) return undefined

  const mostRecent = [...intakes].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]

  if (!mostRecent) return undefined

  const serviceType = mostRecent.service?.type
  const subtype = typeof (mostRecent as { subtype?: unknown }).subtype === "string"
    ? ((mostRecent as { subtype?: string }).subtype)
    : undefined

  if (serviceType === "med_certs") {
    return { serviceParam: "med-cert", label: "Start another medical certificate" }
  }

  if (serviceType === "common_scripts") {
    return { serviceParam: "repeat-script", label: "Repeat a prescription" }
  }

  if (serviceType === "consult") {
    if (subtype === "ed") {
      return {
        serviceParam: "consult",
        subtype: "ed",
        label: "Start another ED assessment",
      }
    }
    if (subtype === "hair_loss") {
      return {
        serviceParam: "consult",
        subtype: "hair_loss",
        label: "Start another hair loss assessment",
      }
    }
    return { serviceParam: "consult", label: "Start another consult" }
  }

  return undefined
}

function getServiceName(intake: Intake): string {
  if (intake.service?.name) return intake.service.name
  if (intake.service?.short_name) return intake.service.short_name
  if (intake.service?.type === "med_certs") return "Medical Certificate"
  if (intake.service?.type === "common_scripts") return "Prescription"
  return "Request"
}

interface HeroShellProps {
  pill?: { icon: ReactNode; label: string; tone?: "info" | "success" | "warning" | "primary" }
  title: ReactNode
  subtitle?: ReactNode
  primaryCta?: ReactNode
  secondaryCta?: ReactNode
  children?: ReactNode
  className?: string
}

const pillTones = {
  info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  primary: "bg-primary/[0.08] text-primary dark:bg-primary/[0.16]",
} as const

function HeroShell({ pill, title, subtitle, primaryCta, secondaryCta, children, className }: HeroShellProps) {
  return (
    <DashboardCard tier="elevated" padding="lg" className={cn("space-y-5", className)}>
      {pill && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            pillTones[pill.tone ?? "primary"],
          )}
        >
          {pill.icon}
          {pill.label}
        </span>
      )}
      <div className="space-y-2">
        <Heading level="h1" className="!text-2xl sm:!text-3xl">{title}</Heading>
        {subtitle && (
          <p className="text-base text-muted-foreground max-w-2xl">{subtitle}</p>
        )}
      </div>
      {(primaryCta || secondaryCta) && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {primaryCta}
          {secondaryCta}
        </div>
      )}
      {children}
    </DashboardCard>
  )
}

export function DashboardHero({
  firstName,
  intakes,
  prescriptions,
  profileData,
}: DashboardHeroProps) {
  const resolved = resolveHeroState({ intakes, prescriptions, profileData })
  const { state, intake, prescription, lastService } = resolved

  switch (state) {
    case "doctor-question":
      return (
        <HeroShell
          pill={{ icon: <MessageCircle className="h-3 w-3" />, label: "Doctor needs a reply", tone: "warning" }}
          title={`Your doctor has a quick question${intake ? "" : ""}.`}
          subtitle={
            intake
              ? `For your ${getServiceName(intake)} request. Reply now to keep things moving.`
              : "Open the request to see what they asked."
          }
          primaryCta={
            intake && (
              <Button asChild>
                <Link href={buildPatientMessagesHref({ intakeId: intake.id })}>
                  Reply now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
          }
        />
      )

    case "documents-ready":
      return (
        <HeroShell
          pill={{ icon: <CheckCircle2 className="h-3 w-3" />, label: "Ready to download", tone: "success" }}
          title={
            <>
              Your {intake ? getServiceName(intake).toLowerCase() : "document"} is ready,{" "}
              {firstName}.
            </>
          }
          subtitle="A copy is in your email. Download below or open the request for the verification details."
          primaryCta={
            intake && (
              <Button asChild>
                <Link href={buildPatientIntakeHref(intake.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  View &amp; download
                </Link>
              </Button>
            )
          }
          secondaryCta={
            <Button variant="outline" asChild>
              <Link href={PATIENT_DOCUMENTS_HREF}>All documents</Link>
            </Button>
          }
        />
      )

    case "document-processing":
      return (
        <HeroShell
          pill={{ icon: <Clock className="h-3 w-3" />, label: "Preparing document", tone: "info" }}
          title={`Your certificate is being prepared, ${firstName}.`}
          subtitle="Doctor approval is complete. The secure download will appear on your request as soon as the PDF is ready."
          primaryCta={
            intake && (
              <Button variant="outline" asChild>
                <Link href={buildPatientIntakeHref(intake.id)}>
                  View request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
          }
        />
      )

    case "live-review":
      return (
        <HeroShell
          pill={{ icon: <Clock className="h-3 w-3" />, label: "Under review", tone: "info" }}
          title={`A doctor is on it, ${firstName}.`}
          subtitle={
            intake
              ? `Your ${getServiceName(intake).toLowerCase()} is in the queue. Doctor review follows when available.`
              : "Your request is in the queue. We'll let you know as soon as there's an update."
          }
          primaryCta={
            intake && (
              <Button variant="outline" asChild>
                <Link href={buildPatientIntakeHref(intake.id)}>
                  Track status
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
          }
        />
      )

    case "more-information-required":
      return (
        <HeroShell
          pill={{ icon: <AlertCircle className="h-3 w-3" />, label: "More information needed", tone: "warning" }}
          title="We need a little more medical information before payment."
          subtitle="We won’t open payment for this saved request. Start a fresh secure form with complete answers, or contact support if something looks wrong."
          primaryCta={
            <Button asChild size="lg" className="h-12 w-full sm:w-auto">
              <Link href={REQUEST_HREF}>
                Start a fresh request
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
          secondaryCta={
            <Button variant="outline" asChild size="lg" className="h-12 w-full bg-transparent sm:w-auto">
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail className="mr-2 h-4 w-4" />
                Contact support
              </a>
            </Button>
          }
        />
      )

    case "stale-payment":
      return (
        <HeroShell
          pill={{ icon: <AlertCircle className="h-3 w-3" />, label: "Waiting on payment", tone: "warning" }}
          title="Finish your request, and a doctor will take it from here."
          subtitle={
            intake
              ? `Your ${getServiceName(intake).toLowerCase()} is saved. Payment hasn't gone through yet.`
              : "Your request is saved. Payment hasn't gone through yet."
          }
          primaryCta={
            intake && (
              <Button asChild>
                <Link href={buildPatientIntakeHref(intake.id)}>
                  Complete payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
          }
          secondaryCta={
            intake && (
              <CopySupportSummaryButton
                intake={intake}
                serviceLabel={getServiceName(intake)}
                reason="payment"
              />
            )
          }
        />
      )

    case "renewal-due":
      return (
        <HeroShell
          pill={{ icon: <Clock className="h-3 w-3" />, label: "Renewal due", tone: "warning" }}
          title={
            prescription
              ? `Time to renew ${prescription.medication_name}.`
              : "A prescription is due for renewal."
          }
          subtitle={
            prescription
              ? `Submit a quick repeat prescription form. A doctor reviews and issues a new eScript.`
              : "Submit a quick repeat prescription form."
          }
          primaryCta={
            <Button asChild>
              <Link href={REQUEST_REPEAT_SCRIPT_HREF}>
                Renew prescription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />
      )

    case "profile-incomplete":
      return (
        <HeroShell
          pill={{ icon: <FileText className="h-3 w-3" />, label: "One quick thing", tone: "info" }}
          title={`Add your contact details, ${firstName}.`}
          subtitle="Phone and home address are required for prescriptions and referrals. Takes ~30 seconds."
          primaryCta={
            <Button asChild>
              <Link href={buildPatientSettingsHref({ tab: "personal" })}>
                Complete profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />
      )

    case "empty":
      return (
        <HeroShell
          pill={{ icon: <CheckCircle2 className="h-3 w-3" />, label: "Welcome", tone: "primary" }}
          title={`Pick a service, ${firstName}.`}
          subtitle="We only interrupt you if something important is missing, then email you the result."
        >
          <div className="pt-2">
            <DashboardServiceGrid />
          </div>
        </HeroShell>
      )

    case "default":
    default:
      return (
        <HeroShell
          pill={{ icon: <CheckCircle2 className="h-3 w-3" />, label: "All caught up", tone: "success" }}
          title={`Anything you need today, ${firstName}?`}
          subtitle={
            lastService
              ? "Tap below to repeat your last service, or pick a different one."
              : "Pick a service to start. A doctor reviews and we email the result."
          }
          primaryCta={
            lastService ? (
              <Button asChild data-testid="hero-repeat-last-service">
                <Link
                  href={buildRequestServiceHref({
                    service: lastService.serviceParam,
                    subtype: lastService.subtype,
                  })}
                >
                  {lastService.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : undefined
          }
        >
          <div className="pt-2">
            <DashboardServiceGrid compact />
          </div>
        </HeroShell>
      )
  }
}
