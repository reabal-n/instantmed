"use client"

import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Download,
  MessageSquare,
  Pill,
  Sparkles,
  Bell,
} from "lucide-react"
import { PremiumStatusBadge } from "@/components/ui/status-badges"
import { 
  PremiumStatCard, 
  PremiumActionCard, 
  PremiumRequestCard, 
  PremiumEmptyState,
  SectionHeader,
  GreetingHeader,
  QuickRepeatBanner 
} from "@/components/patient/dashboard-cards"
import { cn } from "@/lib/utils"
import type { Request as DbRequest } from "@/types/db"

// =============================================================================
// TYPES
// =============================================================================

interface RequestStats {
  total: number
  pending: number
  approved: number
  declined: number
  awaiting_payment: number
}

interface DashboardContentProps {
  firstName: string
  stats: RequestStats
  requests: DbRequest[]
  showOnboardedSuccess?: boolean
  justPaid?: boolean
  formatRequestType: (type: string) => string
  formatCategory: (category: string | null | undefined) => string | null
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  })
}

type StatusVariant = "pending" | "in-review" | "approved" | "declined" | "needs-action" | "needs-payment" | "awaiting-script"

const getStatusVariant = (status: string, paymentStatus?: string): StatusVariant => {
  if (paymentStatus === "pending_payment") return "needs-payment"
  if (status === "needs_follow_up") return "needs-action"
  if (status === "pending") return "in-review"
  if (status === "awaiting_prescribe") return "awaiting-script"
  if (status === "approved") return "approved"
  if (status === "declined") return "declined"
  return "pending"
}

const getStatusLabel = (status: string, paymentStatus?: string): string => {
  if (paymentStatus === "pending_payment") return "Payment needed"
  if (status === "needs_follow_up") return "Info requested"
  if (status === "pending") return "In review"
  if (status === "awaiting_prescribe") return "Script approved"
  if (status === "approved") return "Ready"
  if (status === "declined") return "See notes"
  return "Pending"
}

const getStatusMessage = (status: string, paymentStatus?: string): string => {
  if (paymentStatus === "pending_payment") return "Complete payment to submit"
  if (status === "needs_follow_up") return "Doctor needs more information"
  if (status === "pending") return "Usually within 1 hour (8am–10pm)"
  if (status === "awaiting_prescribe") return "eScript being sent to pharmacy"
  if (status === "approved") return "Download available"
  if (status === "declined") return "Unable to approve — see details"
  return ""
}

const getRequestIcon = (status: string, paymentStatus?: string) => {
  if (paymentStatus === "pending_payment") return <CreditCard className="h-5 w-5" />
  if (status === "needs_follow_up") return <MessageSquare className="h-5 w-5" />
  if (status === "pending") return <Clock className="h-5 w-5" />
  if (status === "awaiting_prescribe") return <FileText className="h-5 w-5" />
  if (status === "approved") return <CheckCircle className="h-5 w-5" />
  if (status === "declined") return <XCircle className="h-5 w-5" />
  return <Clock className="h-5 w-5" />
}

const _getRequestCardVariant = (status: string, paymentStatus?: string): "default" | "warning" | "in-progress" | "success" => {
  if (paymentStatus === "pending_payment" || status === "needs_follow_up") return "warning"
  if (status === "pending" || status === "awaiting_prescribe") return "in-progress"
  if (status === "approved") return "success"
  return "default"
}

// =============================================================================
// SUCCESS BANNERS
// =============================================================================

function SuccessBanner({ 
  type, 
  message 
}: { 
  type: "onboarded" | "paid"
  message: string 
}) {
  const config = {
    onboarded: {
      bg: "border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20",
      icon: CheckCircle,
      iconColor: "text-indigo-600",
      textColor: "text-indigo-800 dark:text-indigo-200",
    },
    paid: {
      bg: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
      icon: Sparkles,
      iconColor: "text-emerald-600",
      textColor: "text-emerald-800 dark:text-emerald-200",
    },
  }

  const cfg = config[type]
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("rounded-xl border p-3 flex items-center gap-3", cfg.bg)}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 shrink-0", cfg.iconColor)} aria-hidden="true" />
      <p className={cn("text-sm", cfg.textColor)}>{message}</p>
    </motion.div>
  )
}

// =============================================================================
// MAIN DASHBOARD CONTENT
// =============================================================================

export function DashboardContent({
  firstName,
  stats,
  requests,
  showOnboardedSuccess,
  justPaid,
  formatRequestType,
  formatCategory,
}: DashboardContentProps) {
  const displayRequests = requests.slice(0, 5)

  // Separate requests by urgency
  const needsAction = displayRequests.filter(
    (r) => r.payment_status === "pending_payment" || r.status === "needs_follow_up"
  )
  const inProgress = displayRequests.filter(
    (r) => r.status === "pending" && r.payment_status !== "pending_payment"
  )

  const showQuickRepeat = stats.approved > 0 && requests.some(r => r.status === "approved")

  return (
    <motion.main 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Success banners */}
      <AnimatePresence>
        {showOnboardedSuccess && (
          <SuccessBanner 
            type="onboarded" 
            message="Profile complete. You're ready to submit requests." 
          />
        )}
        {justPaid && (
          <SuccessBanner 
            type="paid" 
            message="Payment received! A doctor is now reviewing your request." 
          />
        )}
      </AnimatePresence>

      {/* Header with greeting */}
      <GreetingHeader
        name={firstName}
        subtitle="Your health, handled online"
        action={
          <Button asChild size="sm" className="rounded-xl gap-1.5 shadow-lg shadow-primary/20">
            <Link href="/start">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New request
            </Link>
          </Button>
        }
      />

      {/* Quick Stats - Premium Cards */}
      <section aria-label="Request summary" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <PremiumStatCard
          label="Total"
          value={stats.total}
          icon={<FileText className="h-4 w-4" />}
          delay={0}
        />
        {stats.awaiting_payment > 0 && (
          <PremiumStatCard
            label="Needs payment"
            value={stats.awaiting_payment}
            icon={<CreditCard className="h-4 w-4" />}
            variant="warning"
            delay={0.1}
          />
        )}
        <PremiumStatCard
          label="In review"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
          variant="info"
          delay={0.15}
        />
        <PremiumStatCard
          label="Completed"
          value={stats.approved}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
          delay={0.2}
        />
        <PremiumStatCard
          label="Declined"
          value={stats.declined}
          icon={<XCircle className="h-4 w-4" />}
          variant="danger"
          delay={0.25}
        />
      </section>

      {/* Quick Actions - Premium Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumActionCard
          title="Medical Certificate"
          description="Work, uni, or carer's leave"
          icon={<FileText className="h-6 w-6" />}
          href="/start?service=med-cert"
          gradient="from-indigo-500 to-blue-600"
          delay={0.3}
        />
        <PremiumActionCard
          title="Prescription"
          description="Repeat scripts & reviews"
          icon={<Pill className="h-6 w-6" />}
          href="/start?service=repeat-script"
          gradient="from-violet-500 to-purple-600"
          delay={0.35}
        />
      </section>

      {/* Quick Repeat Banner */}
      {showQuickRepeat && (
        <QuickRepeatBanner href="/start?service=med-cert" />
      )}

      {/* Needs Action */}
      {needsAction.length > 0 && (
        <section aria-labelledby="needs-action-heading">
          <SectionHeader
            icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
            title="Needs your attention"
          />
          <motion.ul 
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
          >
            {needsAction.map((request, index) => (
              <li key={request.id}>
                <PremiumRequestCard
                  title={formatCategory(request.category) || formatRequestType(request.type)}
                  subtitle={getStatusMessage(request.status, request.payment_status)}
                  icon={getRequestIcon(request.status, request.payment_status)}
                  badge={
                    <PremiumStatusBadge
                      variant={getStatusVariant(request.status, request.payment_status)}
                      label={getStatusLabel(request.status, request.payment_status)}
                    />
                  }
                  href={`/patient/requests/${request.id}`}
                  variant="warning"
                  showPulse
                  delay={index * 0.05}
                />
              </li>
            ))}
          </motion.ul>
        </section>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section aria-labelledby="in-progress-heading">
          <SectionHeader
            icon={<Clock className="h-4 w-4 text-violet-500" />}
            title="Being reviewed"
            action={
              <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <Bell className="h-3 w-3" />
                We&apos;ll email you when ready
              </span>
            }
          />
          <motion.ul 
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
          >
            {inProgress.map((request, index) => (
              <li key={request.id}>
                <PremiumRequestCard
                  title={formatCategory(request.category) || formatRequestType(request.type)}
                  subtitle={getStatusMessage(request.status, request.payment_status)}
                  icon={getRequestIcon(request.status, request.payment_status)}
                  badge={
                    <PremiumStatusBadge
                      variant="in-review"
                      label="In review"
                    />
                  }
                  href={`/patient/requests/${request.id}`}
                  variant="in-progress"
                  showPulse
                  delay={index * 0.05}
                />
              </li>
            ))}
          </motion.ul>
        </section>
      )}

      {/* Recent Requests */}
      <section aria-labelledby="recent-heading">
        <motion.div 
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <h2 id="recent-heading" className="text-sm font-semibold text-foreground">
              Recent requests
            </h2>
            {requests.length > 0 && (
              <Link 
                href="/patient/requests" 
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
          
          <div className="p-5">
            {displayRequests.length === 0 ? (
              <PremiumEmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No requests yet"
                description="Get a medical certificate or prescription in under an hour — no phone calls needed."
                actions={
                  <>
                    <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                      <Link href="/start?service=med-cert">
                        <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Medical Certificate
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href="/start?service=repeat-script">
                        <Pill className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Prescription
                      </Link>
                    </Button>
                  </>
                }
              />
            ) : (
              <motion.ul 
                className="divide-y divide-border/50"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.03 } }
                }}
              >
                {displayRequests.map((request) => (
                  <motion.li 
                    key={request.id} 
                    className="py-3 first:pt-0 last:pb-0"
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 }
                    }}
                  >
                    <Link
                      href={`/patient/requests/${request.id}`}
                      className="flex items-center justify-between hover:opacity-80 transition-opacity group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center",
                          request.status === "approved" 
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30" 
                            : request.status === "declined"
                            ? "bg-red-100 text-red-600 dark:bg-red-950/30"
                            : "bg-muted/50 text-muted-foreground"
                        )}>
                          {getRequestIcon(request.status, request.payment_status)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {formatCategory(request.category) || formatRequestType(request.type)}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(request.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <PremiumStatusBadge
                          variant={getStatusVariant(request.status, request.payment_status)}
                          label={getStatusLabel(request.status, request.payment_status)}
                          showIcon={false}
                        />
                        {request.status === "approved" && (
                          <Download className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                        )}
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>
        </motion.div>
      </section>
    </motion.main>
  )
}
