"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  FileText,
  Pill,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Plus,
  AlertTriangle,
  Lightbulb,
  Heart,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/uix"
import { usePanel, DrawerPanel } from "@/components/panels"
import { FEEDBACK_MESSAGES } from "@/lib/microcopy"
import { cn } from "@/lib/utils"
import { GlassStatCard, DashboardGrid } from "@/components/dashboard"
import { EmptyState } from "@/components/ui/empty-state"
import { ReferralCard } from "@/components/patient/referral-card"
import { ProfileTodoCard, type ProfileData, type TodoDrawerType } from "@/components/patient/profile-todo-card"
import { PhoneDrawerContent, AddressDrawerContent, MedicareDrawerContent } from "@/components/patient/profile-drawers"
import { motion, useReducedMotion } from "framer-motion"
import { capture } from "@/lib/analytics/capture"

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
  service?: { id: string; name?: string; short_name?: string; type?: string; slug?: string }
  doctor_notes?: string
}

interface Prescription {
  id: string
  medication_name: string
  dosage: string
  issued_date: string
  renewal_date: string
  status: "active" | "expired"
}

// Health tips for engagement
const HEALTH_TIPS = [
  {
    id: "hydration",
    icon: Heart,
    title: "Stay hydrated",
    content: "Drinking enough water helps your body recover faster when you're unwell.",
  },
  {
    id: "sleep",
    icon: Clock,
    title: "Prioritise rest",
    content: "Quality sleep is essential for immune function and recovery.",
  },
  {
    id: "medications",
    icon: Pill,
    title: "Take medications as directed",
    content: "Always complete your prescribed course, even if you feel better.",
  },
]

// Check if prescription needs renewal soon (within 14 days)
function needsRenewalSoon(renewalDate: string): boolean {
  const renewal = new Date(renewalDate)
  const today = new Date()
  const daysUntilRenewal = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilRenewal <= 14 && daysUntilRenewal > 0
}

function getDaysUntilRenewal(renewalDate: string): number {
  const renewal = new Date(renewalDate)
  const today = new Date()
  return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface PatientDashboardProps {
  fullName: string
  patientId: string
  intakes?: Intake[]
  prescriptions?: Prescription[]
  error?: string | null
  profileData?: ProfileData
}

const STATUS_CONFIG = {
  approved: { color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400", icon: AlertCircle, label: "Declined" },
  pending: { color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Clock, label: "Under Review" },
  in_review: { color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Clock, label: "Under Review" },
  requires_info: { color: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: AlertTriangle, label: "Action Needed" },
  awaiting_script: { color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Pill, label: "Preparing Script" },
  cancelled: { color: "bg-muted text-muted-foreground", icon: AlertCircle, label: "Cancelled" },
  pending_payment: { color: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: CreditCard, label: "Payment Pending" },
}

/** Maps raw intake status to STATUS_CONFIG key */
const INTAKE_STATUS_MAP: Record<string, keyof typeof STATUS_CONFIG> = {
  paid: "pending",
  in_review: "in_review",
  pending_info: "requires_info",
  approved: "approved",
  declined: "rejected",
  completed: "approved",
  awaiting_script: "awaiting_script",
  cancelled: "cancelled",
  pending_payment: "pending_payment",
}

function resolveStatusConfig(status: string) {
  return STATUS_CONFIG[INTAKE_STATUS_MAP[status] || "pending"] || STATUS_CONFIG.pending
}

export function PanelDashboard({
  fullName,
  patientId,
  intakes = [],
  prescriptions = [],
  error,
  profileData,
}: PatientDashboardProps) {
  const prefersReducedMotion = useReducedMotion()
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
  const prescriptionsNeedingRenewal = prescriptions.filter((p) => p.status === "active" && needsRenewalSoon(p.renewal_date))
  
  // Find stale pending_payment intakes (older than 1 hour) for payment recovery
  const stalePaymentIntakes = intakes.filter((r) => {
    if (r.status !== "pending_payment") return false
    const createdAt = new Date(r.created_at)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return createdAt < hourAgo
  })
  
  // Deterministic health tip based on day of week
  const tipIndex = new Date().getDay() % HEALTH_TIPS.length
  const dailyTip = HEALTH_TIPS[tipIndex]

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
        <h1 className="text-3xl font-semibold text-foreground mb-2">
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
                      Started {new Date(intake.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
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

      {/* Quick Stats - Glass cards with glow effects */}
      <DashboardGrid columns={3} gap="md">
        <GlassStatCard
          label="Total Requests"
          value={intakes.length}
          icon={<FileText className="h-5 w-5" />}
          status="info"
        />
        <GlassStatCard
          label="Pending Review"
          value={pendingIntakes.length}
          icon={<Clock className="h-5 w-5" />}
          status={pendingIntakes.length > 0 ? "warning" : "neutral"}
        />
        <GlassStatCard
          label="Active Prescriptions"
          value={activeRxCount}
          icon={<Pill className="h-5 w-5" />}
          status="success"
        />
      </DashboardGrid>

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
            description="Pick what you need and a GP will review it — most people are sorted within the hour."
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
                    Renews in {getDaysUntilRenewal(rx.renewal_date)} days
                  </p>
                </div>
                <Link href="/repeat-prescription/request">
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
                      <p className="text-sm text-muted-foreground mt-1">{rx.dosage}</p>
                      <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Issued {new Date(rx.issued_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Renews {new Date(rx.renewal_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <Link href="/repeat-prescription/request">
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

      {/* Health Tips Section */}
      <section>
        <div className="p-5 rounded-xl bg-linear-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{dailyTip.title}</h3>
              <p className="text-sm text-muted-foreground">{dailyTip.content}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Section */}
      <section>
        <ReferralCard patientId={patientId} />
      </section>

      {/* Floating Action Button - New Request */}
      <motion.div
        className="fixed bottom-20 md:bottom-6 right-6 z-50"
        initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: prefersReducedMotion ? 0 : 0.5, type: "spring", stiffness: 200 }}
      >
        <Link href="/request">
          <Button
            size="lg"
            className="h-14 px-6 rounded-full shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all hover:-translate-y-1"
          >
            <Plus className="w-5 h-5 mr-2" />
            New request
          </Button>
        </Link>
      </motion.div>
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

  // Contextual "What's Next" guidance based on intake status
  const whatsNextConfig: Record<string, { message: string; actionLabel?: string; actionHref?: string; color: string }> = {
    paid: {
      message: "A doctor will review your request shortly — we'll email you when it's done. ⏱️",
      color: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    },
    in_review: {
      message: "A doctor is looking at your request right now. Hang tight — shouldn't be long. 🩺",
      color: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    },
    pending_info: {
      message: "The doctor has a quick question for you. Please respond so we can keep things moving.",
      actionLabel: "Respond now",
      actionHref: `/patient/intakes/${intake.id}`,
      color: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    },
    approved: {
      message: intake.service?.type === "med_certs"
        ? "Your certificate is ready — download it or forward it to your employer. ✅"
        : "All approved — your document is ready to download. ✅",
      actionLabel: "View & download",
      actionHref: `/patient/intakes/${intake.id}`,
      color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    },
    declined: {
      message: "This one wasn't approved — you can view the reason or start a new request.",
      actionLabel: "View details",
      actionHref: `/patient/intakes/${intake.id}`,
      color: "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300",
    },
    awaiting_script: {
      message: "Your prescription is being prepared — we'll let you know as soon as it's ready.",
      color: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    },
    completed: {
      message: "This request is complete. Your documents are available below.",
      actionLabel: "View documents",
      actionHref: `/patient/intakes/${intake.id}`,
      color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    },
    cancelled: {
      message: "This request was cancelled. No charge was made.",
      color: "bg-muted/50 border-border text-muted-foreground",
    },
  }
  const whatsNext = whatsNextConfig[intake.status]

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border border-border p-5 hover:border-primary hover:shadow-md transition-all text-left group hover-lift card-shine"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            intake.service?.type === "common_scripts" ? "bg-blue-50 dark:bg-blue-950/30" : "bg-primary/10"
          )}>
            {intake.service?.type === "common_scripts" ? (
              <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <FileText className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">
              {getServiceName()}
            </h3>
            <p className="text-sm text-muted-foreground">
              {new Date(intake.created_at).toLocaleDateString("en-AU", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("interactive-pill px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium", config.color)}>
            <Icon className="w-4 h-4" />
            {config.label}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* What's Next contextual guidance */}
      {whatsNext && (
        <div className={cn("mt-3 px-3 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3", whatsNext.color)}>
          <p>{whatsNext.message}</p>
          {whatsNext.actionLabel && whatsNext.actionHref && (
            <Link
              href={whatsNext.actionHref}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              {whatsNext.actionLabel}
            </Link>
          )}
        </div>
      )}
    </button>
  )
}

function IntakeDetailDrawer({ intake }: { intake: Intake }) {
  const config = resolveStatusConfig(intake.status)
  const Icon = config.icon

  return (
    <div className="p-6 space-y-6">
      {/* Status */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Status</p>
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium", config.color)}>
          <Icon className="w-4 h-4" />
          {config.label}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Submitted</p>
          <p className="font-medium text-foreground">
            {new Date(intake.created_at).toLocaleDateString("en-AU", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Last updated</p>
          <p className="font-medium text-foreground">
            {new Date(intake.updated_at).toLocaleDateString("en-AU", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Doctor Notes */}
      {intake.doctor_notes && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Doctor notes</p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-foreground">
            {intake.doctor_notes}
          </div>
        </div>
      )}

      {/* Actions */}
      {intake.status === "approved" && (
        <div className="pt-4 border-t border-border">
          <Button asChild className="w-full magnetic-button">
            <Link href={`/patient/intakes/${intake.id}`}>
              Download {intake.service?.type === "med_certs" ? "certificate" : "document"}
            </Link>
          </Button>
        </div>
      )}

      {intake.status === "pending_info" && (
        <div className="pt-4 border-t border-border">
          <Button asChild className="w-full magnetic-button">
            <Link href={`/patient/intakes/${intake.id}`}>
              Provide information
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
