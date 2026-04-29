"use client"

import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Pill,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"

import { DashboardSection } from "@/components/dashboard"
import { DrawerPanel,usePanel } from "@/components/panels"
import { DashboardHero } from "@/components/patient/dashboard-hero"
import { type FollowupRow,FollowupTrackerCard } from "@/components/patient/followup-tracker-card"
import { GoogleReviewCard } from "@/components/patient/google-review-card"
import { IntakeCard } from "@/components/patient/intake-card"
import { IntakeDetailDrawer } from "@/components/patient/intake-detail-drawer"
import { type Intake } from "@/components/patient/intake-types"
import { AddressDrawerContent, MedicareDrawerContent,PhoneDrawerContent } from "@/components/patient/profile-drawers"
import { type ProfileData, ProfileTodoCard, type TodoDrawerType } from "@/components/patient/profile-todo-card"
import { ReferralCard } from "@/components/patient/referral-card"
import { SubscriptionCard } from "@/components/patient/subscription-card"
import { Button } from "@/components/ui/button"
import { capture } from "@/lib/analytics/capture"
import { formatDate } from "@/lib/format"
import { needsRenewalSoon } from "@/lib/prescriptions"

/**
 * Patient Dashboard
 *
 * Phase 2 IA: 3 zones.
 *   1. Hero       — adaptive `<DashboardHero>` resolves the single most
 *                    important next action (download / answer doctor /
 *                    track review / complete payment / renew / etc).
 *   2. Activity   — recent requests + active prescriptions.
 *   3. Manage     — profile todos, subscription, follow-up tracker (for
 *                    not-due milestones), referral, Google review prompt.
 *
 * Replaces the previous 11-section flat list. The hero owns urgent state;
 * the rest is muted, scannable history + housekeeping.
 */

interface Prescription {
  id: string
  medication_name: string
  dosage_instructions: string
  issued_date: string
  expiry_date: string
  status: "active" | "expired"
}

interface SubscriptionData {
  id: string
  status: string
  credits_remaining: number
  current_period_end: string | null
}

interface PatientDashboardProps {
  fullName: string
  patientId: string
  intakes?: Intake[]
  prescriptions?: Prescription[]
  error?: string | null
  profileData?: ProfileData
  subscription?: SubscriptionData | null
  followups?: FollowupRow[]
}

export function PanelDashboard({
  fullName,
  patientId,
  intakes = [],
  prescriptions = [],
  error,
  profileData,
  subscription,
  followups,
}: PatientDashboardProps) {
  const { openPanel } = usePanel()
  const router = useRouter()
  const firstName = fullName.split(" ")[0]

  const handleOpenProfileDrawer = (type: TodoDrawerType) => {
    if (!profileData) return

    const drawerConfig = {
      phone: { title: "Phone Number", component: <PhoneDrawerContent profileData={profileData} /> },
      address: { title: "Home Address", component: <AddressDrawerContent profileData={profileData} /> },
      medicare: { title: "Medicare Card", component: <MedicareDrawerContent profileData={profileData} /> },
    }

    const config = drawerConfig[type]
    openPanel({
      id: `profile-${type}`,
      type: "drawer",
      component: (
        <DrawerPanel title={config.title} width={450}>
          {config.component}
        </DrawerPanel>
      ),
    })
  }

  const pendingIntakes = useMemo(
    () =>
      intakes.filter(
        (r) =>
          r.status === "paid" ||
          r.status === "in_review" ||
          r.status === "pending_info",
      ),
    [intakes],
  )
  const activeRxCount = useMemo(
    () => prescriptions.filter((p) => p.status === "active").length,
    [prescriptions],
  )

  // Stale pending_payment intakes (older than 1 hour). Hero's "stale-payment"
  // state surfaces the most-recent one; this metric stays for analytics.
  const stalePaymentIntakes = useMemo(
    () =>
      intakes.filter((r) => {
        if (r.status !== "pending_payment") return false
        const createdAt = new Date(r.created_at)
        return createdAt < new Date(Date.now() - 60 * 60 * 1000)
      }),
    [intakes],
  )

  // Hero resolves urgent state; suppress the duplicate panels here.
  const hasDoctorQuestion = intakes.some((i) => i.status === "pending_info")
  const hasReadyDoc = intakes.some(
    (i) => i.status === "approved" || i.status === "completed",
  )
  const hasLiveReview = intakes.some(
    (i) => i.status === "paid" || i.status === "in_review",
  )
  const hasStalePayment = stalePaymentIntakes.length > 0
  const hasRenewalDue = prescriptions.some(
    (p) => p.status === "active" && needsRenewalSoon(p.expiry_date),
  )
  const hasFollowupDue = (followups ?? []).some(
    (f) => !f.completed_at && !f.skipped && new Date(f.due_at).getTime() <= Date.now(),
  )

  const isProfileIncomplete = Boolean(
    profileData &&
      intakes.length > 0 &&
      (!profileData.phone ||
        !profileData.addressLine1 ||
        !profileData.suburb ||
        !profileData.state ||
        !profileData.postcode),
  )

  // The hero takes the highest-priority state. We hide redundant zone-2
  // cards by checking the same priority order.
  const heroOwnsProfile =
    !hasDoctorQuestion &&
    !hasReadyDoc &&
    !hasLiveReview &&
    !hasStalePayment &&
    !hasRenewalDue &&
    !hasFollowupDue &&
    isProfileIncomplete

  // Track dashboard view on mount
  useEffect(() => {
    capture("patient_dashboard_viewed", {
      total_requests: intakes.length,
      pending_requests: pendingIntakes.length,
      stale_payment_requests: stalePaymentIntakes.length,
      active_prescriptions: activeRxCount,
    })
  }, [intakes.length, pendingIntakes.length, stalePaymentIntakes.length, activeRxCount])

  const handleViewIntake = (intake: Intake) => {
    if (["approved", "completed"].includes(intake.status)) {
      router.push(`/patient/intakes/${intake.id}`)
      return
    }
    capture("intake_detail_opened", {
      intake_id: intake.id,
      status: intake.status,
      source: "dashboard",
    })
    openPanel({
      id: `intake-${intake.id}`,
      type: 'drawer',
      component: (
        <DrawerPanel title="Request Details" width={450}>
          <IntakeDetailDrawer intake={intake} />
        </DrawerPanel>
      )
    })
  }

  // Don't render an Activity / Manage zone for empty users; the hero shows
  // the catalog and that's enough. Once they have history we surface it.
  const hasAnyActivity = intakes.length > 0 || prescriptions.length > 0

  return (
    <div className="space-y-10">
      {/* ─── ZONE 1 · HERO ──────────────────────────────────────────────── */}
      <DashboardHero
        firstName={firstName}
        intakes={intakes}
        prescriptions={prescriptions}
        profileData={profileData}
        followups={followups}
      />

      {/* System-level error banner; not state-driven so stays inline. */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-destructive-light border border-destructive-border flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            Something went wrong loading your data. Try refreshing. If it keeps happening,{" "}
            <a href="/contact" className="underline font-medium">
              let us know
            </a>
            .
          </p>
        </div>
      )}

      {hasAnyActivity && (
        <>
          {/* ─── ZONE 2 · ACTIVITY ──────────────────────────────────────── */}
          {intakes.length > 0 && (
            <DashboardSection
              title="Recent requests"
              viewAllHref={intakes.length > 5 ? "/patient/intakes" : undefined}
            >
              <div className="space-y-4">
                {intakes.slice(0, 5).map((intake) => (
                  <IntakeCard
                    key={intake.id}
                    intake={intake}
                    onClick={() => handleViewIntake(intake)}
                  />
                ))}
              </div>
            </DashboardSection>
          )}

          {prescriptions.filter((p) => p.status === "active").length > 0 && (
            <DashboardSection
              title="Active prescriptions"
              viewAllHref={
                prescriptions.filter((p) => p.status === "active").length > 3
                  ? "/patient/prescriptions"
                  : undefined
              }
            >
              <div className="space-y-4">
                {prescriptions
                  .filter((p) => p.status === "active")
                  .slice(0, 3)
                  .map((rx) => (
                    <div
                      key={rx.id}
                      className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 transition-[transform,box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{rx.medication_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{rx.dosage_instructions}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              Issued {formatDate(rx.issued_date)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              Renews {formatDate(rx.expiry_date)}
                            </span>
                          </div>
                        </div>
                        <Link href="/request?service=repeat-script" className="shrink-0">
                          <Button variant="outline" size="sm">
                            <Pill className="w-4 h-4 mr-2" />
                            Renew
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </DashboardSection>
          )}

          {/* Empty case for activity sub-zone. */}
          {intakes.length === 0 && (
            <DashboardSection title="Recent requests">
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-8 text-center">
                <FileText className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  When you submit a request, it&apos;ll show up here.
                </p>
              </div>
            </DashboardSection>
          )}
        </>
      )}

      {hasAnyActivity && (
        <>
          {/* ─── ZONE 3 · MANAGE ────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Profile todos: skip if hero is already nudging this. */}
            {profileData && !heroOwnsProfile && (
              <ProfileTodoCard
                profileData={profileData}
                onOpenDrawer={handleOpenProfileDrawer}
                hideWhenMedCertOnlyComplete={
                  intakes.length > 0 &&
                  prescriptions.length === 0 &&
                  intakes.every((i) => {
                    const s = Array.isArray(i.service) ? i.service[0] : i.service
                    return (s as { type?: string } | null)?.type === "med_certs"
                  })
                }
              />
            )}

            {subscription && subscription.status === "active" && (
              <SubscriptionCard subscription={subscription} />
            )}

            {/* Follow-up tracker only renders not-due milestones; the
                "due" case is in the hero. */}
            {followups && followups.length > 0 && !hasFollowupDue && (
              <FollowupTrackerCard followups={followups} />
            )}

            {/* Referral + Google Review only after first completion. */}
            {hasReadyDoc && <ReferralCard patientId={patientId} />}
            {hasReadyDoc && <GoogleReviewCard />}
          </div>
        </>
      )}
    </div>
  )
}
