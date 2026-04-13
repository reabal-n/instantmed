"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileText,
  Pill,
  Calendar,
  Clock,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePanel, DrawerPanel } from "@/components/panels"
import { IntakeCard } from "@/components/patient/intake-card"
import { IntakeDetailDrawer } from "@/components/patient/intake-detail-drawer"
import { EmptyState } from "@/components/ui/empty-state"
import { ReferralCard } from "@/components/patient/referral-card"
import { SubscriptionCard } from "@/components/patient/subscription-card"
import { GoogleReviewCard } from "@/components/patient/google-review-card"
import { ProfileTodoCard, type ProfileData, type TodoDrawerType } from "@/components/patient/profile-todo-card"
import { PhoneDrawerContent, AddressDrawerContent, MedicareDrawerContent } from "@/components/patient/profile-drawers"
import { capture } from "@/lib/analytics/capture"
import { formatDate } from "@/lib/format"
import { type Intake } from "@/components/patient/intake-types"
import { needsRenewalSoon, getDaysUntilExpiry } from "@/lib/prescriptions"
import { FollowupTrackerCard, type FollowupRow } from "@/components/patient/followup-tracker-card"

/**
 * Panel-Based Patient Dashboard
 * 
 * Philosophy:
 * - Single scroll, no tabs
 * - Click request → DrawerPanel opens
 * - Calm, spacious layout
 * - Human language throughout
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

  const pendingIntakes = intakes.filter((r) => r.status === "paid" || r.status === "in_review" || r.status === "pending_info")
  const activeRxCount = prescriptions.filter((p) => p.status === "active").length
  const prescriptionsNeedingRenewal = prescriptions.filter((p) => p.status === "active" && needsRenewalSoon(p.expiry_date))
  
  // Find stale pending_payment intakes (older than 1 hour) for payment recovery
  const stalePaymentIntakes = intakes.filter((r) => {
    if (r.status !== "pending_payment") return false
    const createdAt = new Date(r.created_at)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return createdAt < hourAgo
  })
  
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
    // Approved/completed: go straight to page for quick download access
    if (["approved", "completed"].includes(intake.status)) {
      router.push(`/patient/intakes/${intake.id}`)
      return
    }
    // Pending: open drawer for status and next steps
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

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground text-base">
          {pendingIntakes.length > 0
            ? `${pendingIntakes.length} ${pendingIntakes.length === 1 ? 'request' : 'requests'} pending review`
            : "All caught up. Nothing needs your attention. 👍"}
        </p>
      </div>

      {/* First-time banner - single pending request being reviewed */}
      {pendingIntakes.length === 1 && intakes.length === 1 && (
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-4">
          <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Your request is being reviewed</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              A doctor will look at it shortly. Most requests are reviewed within 1–2 hours during business hours (8am–10pm AEST).
            </p>
          </div>
        </div>
      )}

      {/* Profile Completion Todos - hide for med-cert-only users with required fields complete */}
      {profileData && (
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

      {/* Follow-up Tracker */}
      {followups && followups.length > 0 && (
        <FollowupTrackerCard followups={followups} />
      )}

      {/* Subscription Card */}
      {subscription && subscription.status === "active" && (
        <SubscriptionCard subscription={subscription} />
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive-light border border-destructive-border flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">Something went wrong loading your data. Try refreshing. If it keeps happening, <a href="/contact" className="underline font-medium">let us know</a>.</p>
        </div>
      )}

      {/* Payment Recovery Prompt */}
      {stalePaymentIntakes.length > 0 && (
        <section className="p-4 rounded-xl bg-info-light border border-info-border space-y-3">
          <div className="flex items-center gap-2 text-info">
            <CreditCard className="w-5 h-5" />
            <h3 className="font-semibold">Complete your request</h3>
          </div>
          <p className="text-sm text-info">
            {stalePaymentIntakes.length === 1 
              ? "You have a request waiting to be completed."
              : `You have ${stalePaymentIntakes.length} requests waiting to be completed.`}
          </p>
          <div className="space-y-2">
            {stalePaymentIntakes.slice(0, 2).map((intake) => {
              const serviceData = Array.isArray(intake.service) ? intake.service[0] : intake.service
              const serviceName = serviceData?.name || serviceData?.short_name || "Request"
              return (
                <Link 
                  key={intake.id}
                  href={`/patient/intakes/${intake.id}`}
                  className="flex items-center justify-between bg-card rounded-xl p-3 border border-info-border hover:border-info-border transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{serviceName}</p>
                    <p className="text-sm text-muted-foreground">
                      Started {formatDate(intake.created_at)}
                    </p>
                  </div>
                  <Button size="sm">
                    Complete
                  </Button>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Documents ready - quick access for approved/completed */}
      {(() => {
        const readyIntakes = intakes.filter((i) => ["approved", "completed"].includes(i.status))
        if (readyIntakes.length === 0) return null
        return (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-foreground">Documents ready</h2>
              <Link href="/patient/documents" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {readyIntakes.slice(0, 3).map((intake) => {
                const serviceData = Array.isArray(intake.service) ? intake.service[0] : intake.service
                const serviceName = serviceData?.name || serviceData?.short_name || "Document"
                return (
                  <Link
                    key={intake.id}
                    href={`/patient/intakes/${intake.id}`}
                    className="flex items-center justify-between p-5 rounded-xl border border-success-border bg-success-light hover:bg-success-light transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success-light flex items-center justify-center">
                        <Download className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{serviceName}</p>
                        <p className="text-sm text-muted-foreground">Ref: {intake.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-success group-hover:underline">
                      Download
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* Recent Requests */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-foreground">Recent Requests</h2>
          {intakes.length > 5 && (
            <Link href="/patient/intakes" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {intakes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing here yet"
            description="When you submit a request, it'll show up here."
          />
        ) : (
          <div className="space-y-4">
            {intakes.slice(0, 5).map((intake) => (
              <IntakeCard
                key={intake.id}
                intake={intake}
                onClick={() => handleViewIntake(intake)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Prescription Renewal Reminders */}
      {prescriptionsNeedingRenewal.length > 0 && (
        <section>
          <div className="p-4 rounded-xl bg-warning-light border border-warning-border space-y-3">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Renewal reminders</h3>
            </div>
            {prescriptionsNeedingRenewal.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-warning-border">
                <div>
                  <p className="font-medium text-foreground">{rx.medication_name}</p>
                  <p className="text-sm text-warning">
                    Renews in {getDaysUntilExpiry(rx.expiry_date)} days
                  </p>
                </div>
                <Link href="/request?service=repeat-script">
                  <Button size="sm">
                    <Pill className="w-4 h-4 mr-1" />
                    Renew now
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Prescriptions */}
      {prescriptions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-foreground">Active Prescriptions</h2>
            {prescriptions.filter((p) => p.status === "active").length > 3 && (
              <Link href="/patient/prescriptions" className="text-sm text-primary hover:underline">
                View all
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {prescriptions
              .filter((p) => p.status === "active")
              .slice(0, 3)
              .map((rx) => (
                <div
                  key={rx.id}
                  className="dashboard-card rounded-xl p-5 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{rx.medication_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{rx.dosage_instructions}</p>
                      <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
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
                    <Link href="/request?service=repeat-script">
                      <Button variant="outline" size="sm" className="magnetic-button">
                        <Pill className="w-4 h-4 mr-2" />
                        Request renewal
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Google Review prompt - show after first completed request */}
      {intakes.some(i => i.status === "approved" || i.status === "completed") && (
        <section>
          <GoogleReviewCard />
        </section>
      )}

      {/* Referral Section - only show after patient has completed at least one request */}
      {intakes.some(i => i.status === "approved" || i.status === "completed") && (
        <section>
          <ReferralCard patientId={patientId} />
        </section>
      )}

    </div>
  )
}

