"use client"

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"

import { DashboardCard } from "@/components/dashboard"
import { ServiceIconTile } from "@/components/icons/service-icons"
import { type FollowupRow } from "@/components/patient/followup-tracker-card"
import { type Intake } from "@/components/patient/intake-types"
import { type ProfileData } from "@/components/patient/profile-todo-card"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { needsRenewalSoon } from "@/lib/prescriptions"
import { getActiveServices } from "@/lib/services/service-catalog"
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
  | "live-review"
  | "stale-payment"
  | "renewal-due"
  | "followup-due"
  | "profile-incomplete"
  | "empty"
  | "default"

interface DashboardHeroProps {
  firstName: string
  intakes: Intake[]
  prescriptions: Prescription[]
  profileData?: ProfileData
  followups?: FollowupRow[]
}

/**
 * Resolve which hero state takes priority based on patient context.
 *
 * Priority order (anxious-patient-first):
 *   1. Doctor needs a reply  → Highest priority. Block the patient's flow.
 *   2. Documents ready       → Confirmation of success; high-stakes moment.
 *   3. Live review           → Reassurance during waiting.
 *   4. Stale payment         → Recovery prompt for abandoned checkout.
 *   5. Renewal due           → Active prescription renewal reminder.
 *   6. Follow-up due         → Treatment-tracker check-in.
 *   7. Profile incomplete    → Only when blocking future requests.
 *   8. Empty state           → First-time user, surface the catalog.
 *   9. Default (caught up)   → Service grid + reassurance.
 */
export function resolveHeroState({
  intakes,
  prescriptions,
  profileData,
  followups = [],
}: {
  intakes: Intake[]
  prescriptions: Prescription[]
  profileData?: ProfileData
  followups?: FollowupRow[]
}): { state: DashboardHeroState; intake?: Intake; prescription?: Prescription; followup?: FollowupRow } {
  // 1. Doctor question: any intake with pending_info status
  const pendingInfo = intakes.find((i) => i.status === "pending_info")
  if (pendingInfo) return { state: "doctor-question", intake: pendingInfo }

  // 2. Documents ready: most recent approved/completed intake (assume document is ready
  //    if status reached approved/completed; the detail page handles the actual file)
  const ready = intakes
    .filter((i) => i.status === "approved" || i.status === "completed")
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

  // 3. Live review: most recent paid / in_review intake
  const inReview = intakes
    .filter((i) => i.status === "paid" || i.status === "in_review")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
  if (inReview) return { state: "live-review", intake: inReview }

  // 4. Stale payment: pending_payment over 1 hour
  const stalePayment = intakes.find((i) => {
    if (i.status !== "pending_payment") return false
    return new Date(i.created_at).getTime() < Date.now() - 60 * 60 * 1000
  })
  if (stalePayment) return { state: "stale-payment", intake: stalePayment }

  // 5. Renewal due: active prescription expiring soon
  const renewal = prescriptions.find(
    (p) => p.status === "active" && needsRenewalSoon(p.expiry_date),
  )
  if (renewal) return { state: "renewal-due", prescription: renewal }

  // 6. Follow-up due: any uncompleted follow-up that's due
  const dueFollowup = followups.find((f) => {
    if (f.completed_at || f.skipped) return false
    return new Date(f.due_at).getTime() <= Date.now()
  })
  if (dueFollowup) return { state: "followup-due", followup: dueFollowup }

  // 7. Profile incomplete + has-request: missing required fields and has activity
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

  // 8. Empty state: zero intakes, fresh patient
  if (intakes.length === 0 && prescriptions.length === 0) {
    return { state: "empty" }
  }

  // 9. Default: caught up
  return { state: "default" }
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

function ServiceGrid({ compact = false }: { compact?: boolean }) {
  const services = getActiveServices().slice(0, compact ? 4 : 5)
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {services.map((service) => (
        <Link
          key={service.id}
          href={`/request?service=${service.serviceRoute}${service.subtype ? `&subtype=${service.subtype}` : ""}`}
          className={cn(
            "group flex items-center gap-3 rounded-xl p-3",
            "bg-white dark:bg-card border border-border/50 dark:border-white/15",
            "shadow-sm shadow-primary/[0.04] dark:shadow-none",
            "transition-[transform,box-shadow,border-color] duration-300",
            "hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.06] hover:border-primary/40",
          )}
        >
          <ServiceIconTile iconKey={service.iconKey} color={service.colorToken} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{service.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {service.pricePrefix ? `${service.pricePrefix} ${service.price}` : service.price}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </Link>
      ))}
    </div>
  )
}

export function DashboardHero({
  firstName,
  intakes,
  prescriptions,
  profileData,
  followups,
}: DashboardHeroProps) {
  const resolved = resolveHeroState({ intakes, prescriptions, profileData, followups })
  const { state, intake, prescription } = resolved

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
                <Link href={`/patient/intakes/${intake.id}`}>
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
                <Link href={`/patient/intakes/${intake.id}`}>
                  <Download className="mr-2 h-4 w-4" />
                  View &amp; download
                </Link>
              </Button>
            )
          }
          secondaryCta={
            <Button variant="outline" asChild>
              <Link href="/patient/documents">All documents</Link>
            </Button>
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
              ? `Your ${getServiceName(intake).toLowerCase()} is in the queue. Most reviews finish in 1 to 2 hours during business hours (8am to 10pm AEST).`
              : "Your request is in the queue. We'll let you know as soon as there's an update."
          }
          primaryCta={
            intake && (
              <Button variant="outline" asChild>
                <Link href={`/patient/intakes/${intake.id}`}>
                  Track status
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
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
                <Link href={`/patient/intakes/${intake.id}`}>
                  Complete payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
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
              <Link href="/request?service=repeat-script">
                Renew prescription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />
      )

    case "followup-due":
      return (
        <HeroShell
          pill={{ icon: <Clock className="h-3 w-3" />, label: "Treatment check-in", tone: "info" }}
          title={`Time for your check-in, ${firstName}.`}
          subtitle="A minute of your time helps your doctor make sure your treatment is still working."
          primaryCta={
            resolved.followup && (
              <Button asChild>
                <Link href={`/patient/followups/${resolved.followup.id}`}>
                  Share an update
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
          }
        />
      )

    case "profile-incomplete":
      return (
        <HeroShell
          pill={{ icon: <FileText className="h-3 w-3" />, label: "One quick thing", tone: "info" }}
          title={`Add your contact details, ${firstName}.`}
          subtitle="Phone and home address are required for prescriptions, referrals, and follow-ups. Takes ~30 seconds."
          primaryCta={
            <Button asChild>
              <Link href="/patient/settings?tab=personal">
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
          subtitle="A doctor reviews your request, and we email you the result. No call, no waiting room."
        >
          <div className="pt-2">
            <ServiceGrid />
          </div>
        </HeroShell>
      )

    case "default":
    default:
      return (
        <HeroShell
          pill={{ icon: <CheckCircle2 className="h-3 w-3" />, label: "All caught up", tone: "success" }}
          title={`Anything you need today, ${firstName}?`}
          subtitle="Pick a service to start. A doctor reviews and we email the result."
        >
          <div className="pt-2">
            <ServiceGrid compact />
          </div>
        </HeroShell>
      )
  }
}
