"use client"

import { AlertCircle } from "lucide-react"
import dynamic from "next/dynamic"
import { type MouseEvent, useEffect, useMemo } from "react"

import { usePanel } from "@/components/panels/panel-provider"
import { DashboardHero } from "@/components/patient/dashboard-hero"
import { type Intake } from "@/components/patient/intake-types"
import { type ProfileData, type TodoDrawerType } from "@/components/patient/profile-todo-card"
import { capture } from "@/lib/analytics/capture"
import { isMoreInformationRequiredPaymentRecovery } from "@/lib/patient/payment-recovery"
import { needsRenewalSoon } from "@/lib/prescriptions"

const DrawerPanel = dynamic(
  () => import("@/components/panels/drawer-panel").then((mod) => mod.DrawerPanel),
  { loading: () => <ProfileDrawerLoading /> },
)
const IntakeDetailDrawer = dynamic(
  () => import("@/components/patient/intake-detail-drawer").then((mod) => mod.IntakeDetailDrawer),
  { loading: () => <ProfileDrawerLoading /> },
)
const PhoneDrawerContent = dynamic(
  () => import("@/components/patient/profile-drawers").then((mod) => mod.PhoneDrawerContent),
  { loading: () => <ProfileDrawerLoading /> },
)
const AddressDrawerContent = dynamic(
  () => import("@/components/patient/profile-drawers").then((mod) => mod.AddressDrawerContent),
  { loading: () => <ProfileDrawerLoading /> },
)
const MedicareDrawerContent = dynamic(
  () => import("@/components/patient/profile-drawers").then((mod) => mod.MedicareDrawerContent),
  { loading: () => <ProfileDrawerLoading /> },
)
const ProfileTodoCard = dynamic(
  () => import("@/components/patient/profile-todo-card").then((mod) => mod.ProfileTodoCard),
)
const ReferralCard = dynamic(
  () => import("@/components/patient/referral-card").then((mod) => mod.ReferralCard),
  { loading: () => <ReferralCardLoading /> },
)
const ReviewNudgeCard = dynamic(
  () => import("@/components/patient/review-nudge-card").then((mod) => mod.ReviewNudgeCard),
  { ssr: false },
)
const UndeliveredCertificateAlert = dynamic(
  () => import("@/components/patient/undelivered-certificate-alert").then((mod) => mod.UndeliveredCertificateAlert),
)
const DashboardActivity = dynamic(
  () => import("@/components/patient/dashboard-activity").then((mod) => mod.DashboardActivity),
  { ssr: false, loading: () => <DashboardActivityLoading /> },
)

function ProfileDrawerLoading() {
  return (
    <div className="p-6 space-y-4" aria-label="Loading profile form">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="h-12 rounded-lg bg-muted" />
      <div className="h-12 rounded-lg bg-muted/70" />
    </div>
  )
}

function ReferralCardLoading() {
  return (
    <div className="rounded-xl border border-border/50 bg-primary/[0.04] p-5">
      <div className="mb-4 h-5 w-32 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="mb-5 h-4 w-64 max-w-full rounded-md bg-muted/80 motion-safe:animate-pulse" />
      <div className="h-10 rounded-lg bg-muted/70 motion-safe:animate-pulse" />
    </div>
  )
}

function DashboardActivityLoading() {
  return (
    <div
      className="min-h-52 space-y-4"
      aria-busy="true"
      aria-label="Loading recent activity"
    >
      <div className="h-6 w-40 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-24 rounded-xl bg-muted/60 motion-safe:animate-pulse" />
    </div>
  )
}

/**
 * Patient Dashboard
 *
 * Phase 2 IA: 3 zones.
 *   1. Hero       — adaptive `<DashboardHero>` resolves the single most
 *                    important next action (download / answer doctor /
 *                    track review / complete payment / renew / etc).
 *   2. Activity   — recent requests + active prescriptions.
 *   3. Manage     — profile todos, referral, Google review prompt.
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

interface UndeliveredCertificate {
  intakeId: string
  certificateRef: string | null
  certificateType: string | null
  failedAt: string
  retryCount: number
}

interface PatientDashboardProps {
  fullName: string
  patientId: string
  intakes?: Intake[]
  prescriptions?: Prescription[]
  error?: string | null
  profileData?: ProfileData
  undeliveredCerts?: UndeliveredCertificate[]
}

export function PanelDashboard({
  fullName,
  patientId,
  intakes = [],
  prescriptions = [],
  error,
  profileData,
  undeliveredCerts = [],
}: PatientDashboardProps) {
  const { openPanel } = usePanel()
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

  const moreInformationRequiredIntakes = useMemo(
    () => intakes.filter(isMoreInformationRequiredPaymentRecovery),
    [intakes],
  )

  // Ordinary failed checkout is immediately recoverable; pending_payment
  // becomes stale after 1 hour. Missing-information holds are not payment
  // failures and have their own hero state.
  const stalePaymentIntakes = useMemo(
    () =>
      intakes.filter((r) => {
        if (r.status === "checkout_failed") {
          return !isMoreInformationRequiredPaymentRecovery(r)
        }
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
  const hasMoreInformationRequired = moreInformationRequiredIntakes.length > 0
  const hasStalePayment = stalePaymentIntakes.length > 0
  const hasRenewalDue = prescriptions.some(
    (p) => p.status === "active" && needsRenewalSoon(p.expiry_date),
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
    !hasMoreInformationRequired &&
    !hasStalePayment &&
    !hasRenewalDue &&
    isProfileIncomplete

  // Track dashboard view on mount
  useEffect(() => {
    capture("patient_dashboard_viewed", {
      total_requests: intakes.length,
      pending_requests: pendingIntakes.length,
      information_required_requests: moreInformationRequiredIntakes.length,
      stale_payment_requests: stalePaymentIntakes.length,
      active_prescriptions: activeRxCount,
    })
  }, [
    activeRxCount,
    intakes.length,
    moreInformationRequiredIntakes.length,
    pendingIntakes.length,
    stalePaymentIntakes.length,
  ])

  const handleViewIntake = (event: MouseEvent<HTMLAnchorElement>, intake: Intake) => {
    if (["approved", "completed"].includes(intake.status)) {
      return
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }
    event.preventDefault()
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
      {/* Undelivered certificate banner: exception state, calm warning chrome. */}
      {undeliveredCerts.length > 0 && (
        <UndeliveredCertificateAlert certificates={undeliveredCerts} />
      )}

      {/* ─── ZONE 1 · HERO ──────────────────────────────────────────────── */}
      <DashboardHero
        firstName={firstName}
        intakes={intakes}
        prescriptions={prescriptions}
        profileData={profileData}
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
        <DashboardActivity
          intakes={intakes}
          prescriptions={prescriptions}
          onViewIntake={handleViewIntake}
        />
      )}

      {hasAnyActivity && (
        <>
          {/* ─── ZONE 3 · MANAGE ────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Profile todos: skip if hero is already nudging this. */}
            {profileData && !heroOwnsProfile && (
              <div>
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
              </div>
            )}

            {/* Referral + review nudge only after first completion. */}
            {hasReadyDoc && (
              <div>
                <ReferralCard patientId={patientId} />
              </div>
            )}
            {hasReadyDoc && (
              <div>
                <ReviewNudgeCard />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
