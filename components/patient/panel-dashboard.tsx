"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  FileText,
  Pill,
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
  AlertTriangle,
  CreditCard,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePanel, DrawerPanel } from "@/components/panels"
import { FEEDBACK_MESSAGES } from "@/lib/microcopy"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { ReferralCard } from "@/components/patient/referral-card"
import { ProfileTodoCard, type ProfileData, type TodoDrawerType } from "@/components/patient/profile-todo-card"
import { PhoneDrawerContent, AddressDrawerContent, MedicareDrawerContent } from "@/components/patient/profile-drawers"
import { capture } from "@/lib/analytics/capture"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/status"
import { formatDate, formatRelative } from "@/lib/format"
import { needsRenewalSoon, getDaysUntilExpiry } from "@/lib/prescriptions"

/**
 * Panel-Based Patient Dashboard
 * 
 * Philosophy:
 * - Single scroll, no tabs
 * - Click request → DrawerPanel opens
 * - Calm, spacious layout
 * - Human language throughout
 */

interface Intake {
  id: string
  status: string
  created_at: string
  updated_at: string
  service?: { id: string; name?: string; short_name?: string; type?: string; slug?: string } | null
}

interface Prescription {
  id: string
  medication_name: string
  dosage_instructions: string
  issued_date: string
  expiry_date: string
  status: "active" | "expired"
}

interface PatientDashboardProps {
  fullName: string
  patientId: string
  intakes?: Intake[]
  prescriptions?: Prescription[]
  error?: string | null
  profileData?: ProfileData
}

/** Resolve status config from lib/status.ts — single source of truth */
function resolveStatusConfig(status: string) {
  return INTAKE_STATUS[status as IntakeStatus] ?? INTAKE_STATUS.pending
}

export function PanelDashboard({
  fullName,
  patientId,
  intakes = [],
  prescriptions = [],
  error,
  profileData,
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
    // Track intake view
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          {pendingIntakes.length > 0
            ? `${pendingIntakes.length} ${pendingIntakes.length === 1 ? 'request' : 'requests'} pending review`
            : "All caught up — nothing needs your attention. 👍"}
        </p>
      </div>

      {/* Profile Completion Todos */}
      {profileData && (
        <ProfileTodoCard
          profileData={profileData}
          onOpenDrawer={handleOpenProfileDrawer}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">Something went wrong loading your data. Try refreshing — if it keeps happening, <a href="/contact" className="underline font-medium">let us know</a>.</p>
        </div>
      )}

      {/* Payment Recovery Prompt */}
      {stalePaymentIntakes.length > 0 && (
        <section className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <CreditCard className="w-5 h-5" />
            <h3 className="font-semibold">Complete your request</h3>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400">
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
                  className="flex items-center justify-between bg-card rounded-xl p-3 border border-blue-100 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{serviceName}</p>
                    <p className="text-sm text-muted-foreground">
                      Started {formatDate(intake.created_at)}
                    </p>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Complete
                  </Button>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent Requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
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
            title={FEEDBACK_MESSAGES.noRequests}
            description="Pick what you need and a doctor will review it — we'll let you know when it's ready."
            action={{
              label: "New Request",
              href: "/request",
            }}
            secondaryAction={{
              label: "Learn how it works",
              href: "/how-it-works",
            }}
            tips={[
              "Medical certificates can be issued for past or future dates",
              "Repeat prescriptions are usually approved same-day",
              "Your documents are stored securely and can be downloaded anytime",
            ]}
          />
        ) : (
          <div className="space-y-3">
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
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Renewal reminders</h3>
            </div>
            {prescriptionsNeedingRenewal.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-amber-100 dark:border-amber-800/50">
                <div>
                  <p className="font-medium text-foreground">{rx.medication_name}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Renews in {getDaysUntilExpiry(rx.expiry_date)} days
                  </p>
                </div>
                <Link href="/request?service=repeat-script">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Active Prescriptions</h2>
            {prescriptions.filter((p) => p.status === "active").length > 3 && (
              <Link href="/patient/prescriptions" className="text-sm text-primary hover:underline">
                View all
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {prescriptions
              .filter((p) => p.status === "active")
              .slice(0, 3)
              .map((rx) => (
                <div
                  key={rx.id}
                  className="dashboard-card rounded-xl p-4 hover:border-primary/50 transition-all"
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

      {/* Referral Section — only show after patient has completed at least one request */}
      {intakes.some(i => i.status === "approved" || i.status === "completed") && (
        <section>
          <ReferralCard patientId={patientId} />
        </section>
      )}

    </div>
  )
}

function IntakeCard({
  intake,
  onClick,
}: {
  intake: Intake
  onClick: () => void
}) {
  const config = resolveStatusConfig(intake.status)
  const Icon = config.icon

  const getServiceName = () => {
    if (intake.service?.name) return intake.service.name
    if (intake.service?.short_name) return intake.service.short_name
    if (intake.service?.type === "med_certs") return "Medical Certificate"
    if (intake.service?.type === "common_scripts") return "Prescription"
    return "Request"
  }

  const serviceName = getServiceName()

  return (
    <button
      onClick={onClick}
      aria-label={`View ${serviceName} — ${config.label}`}
      className="w-full bg-card rounded-xl border border-border p-5 hover:border-primary hover:shadow-md transition-all text-left group hover-lift card-shine"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            intake.service?.type === "common_scripts" ? "bg-blue-50 dark:bg-blue-950/30" : "bg-primary/10"
          )}>
            {intake.service?.type === "common_scripts" ? (
              <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            ) : (
              <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">
              {serviceName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(intake.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium", config.color)}>
            <Icon className="w-4 h-4" />
            {config.label}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}

/** What's Next guidance — moved from card to drawer for cleaner list view */
const WHATS_NEXT: Record<string, { message: string; actionLabel?: string }> = {
  paid: { message: "A doctor will review your request shortly — we'll email you when it's done." },
  in_review: { message: "A doctor is reviewing your request now. Hang tight — shouldn't be long." },
  pending_info: { message: "The doctor has a question for you. Please respond so we can keep things moving.", actionLabel: "Respond now" },
  approved: { message: "All approved — your document is ready to download.", actionLabel: "View & download" },
  declined: { message: "This request wasn't approved — you can view the reason below.", actionLabel: "View details" },
  awaiting_script: { message: "Your prescription is being prepared — we'll let you know when it's ready." },
  completed: { message: "This request is complete. Your documents are available.", actionLabel: "View documents" },
  cancelled: { message: "This request was cancelled. No charge was made." },
}

function IntakeDetailDrawer({ intake }: { intake: Intake }) {
  const config = resolveStatusConfig(intake.status)
  const Icon = config.icon

  const serviceName = intake.service?.name || intake.service?.short_name || "Request"
  const refId = intake.id.slice(0, 8).toUpperCase()
  const whatsNext = WHATS_NEXT[intake.status]

  return (
    <div className="p-6 space-y-6">
      {/* Service & Ref */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">{serviceName}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Ref: {refId}</p>
      </div>

      {/* Status */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Status</p>
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium", config.color)}>
          <Icon className="w-4 h-4" />
          {config.label}
        </div>
      </div>

      {/* What's Next */}
      {whatsNext && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">What happens next</p>
          <p className="text-sm text-foreground">{whatsNext.message}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Submitted</p>
          <p className="font-medium text-foreground">{formatDate(intake.created_at)}</p>
          <p className="text-xs text-muted-foreground">{formatRelative(intake.created_at)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Last updated</p>
          <p className="font-medium text-foreground">{formatDate(intake.updated_at)}</p>
          <p className="text-xs text-muted-foreground">{formatRelative(intake.updated_at)}</p>
        </div>
      </div>

      {/* Action */}
      <div className="pt-4 border-t border-border">
        <Button asChild className="w-full">
          <Link href={`/patient/intakes/${intake.id}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {whatsNext?.actionLabel || "View full details"}
          </Link>
        </Button>
      </div>
    </div>
  )
}
