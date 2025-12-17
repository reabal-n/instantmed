import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientRequests, getPatientRequestStats, formatRequestType, formatCategory } from "@/lib/data/requests"
import { redirect } from "next/navigation"

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string; paid?: string }>
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const params = await searchParams
  const showOnboardedSuccess = params.onboarded === "true"
  const justPaid = params.onboarded === "payment_success"

  const firstName = authUser.profile.full_name?.split(" ")[0] || "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const stats = await getPatientRequestStats(authUser.profile.id)
  const recentRequests = await getPatientRequests(authUser.profile.id)
  const displayRequests = recentRequests.slice(0, 5)

  // Separate requests by urgency
  const needsAction = displayRequests.filter(
    (r) => r.payment_status === "pending_payment" || r.status === "needs_follow_up",
  )
  const inProgress = displayRequests.filter((r) => r.status === "pending" && r.payment_status !== "pending_payment")

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    })
  }

  const getStatusDisplay = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "pending_payment") {
      return {
        badge: <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Payment needed</Badge>,
        icon: CreditCard,
        message: "Complete payment to submit",
      }
    }
    if (status === "needs_follow_up") {
      return {
        badge: <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">Info requested</Badge>,
        icon: MessageSquare,
        message: "Doctor needs more information",
      }
    }
    if (status === "pending") {
      return {
        badge: <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">In review</Badge>,
        icon: Clock,
        message: "Usually within 1 hour (8am–10pm)",
      }
    }
    if (status === "approved") {
      return {
        badge: <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Ready</Badge>,
        icon: CheckCircle,
        message: "Download available",
      }
    }
    if (status === "declined") {
      return {
        badge: <Badge className="bg-red-100 text-red-700 border-0 text-xs">See notes</Badge>,
        icon: XCircle,
        message: "Unable to approve — see details",
      }
    }
    return {
      badge: (
        <Badge variant="secondary" className="text-xs">
          Unknown
        </Badge>
      ),
      icon: Clock,
      message: "",
    }
  }

  return (
    <main className="space-y-6">
      {/* Success banners */}
      {showOnboardedSuccess && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 flex items-center gap-3" role="alert">
          <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-indigo-800">Profile complete. You&apos;re ready to submit requests.</p>
        </div>
      )}
      
      {justPaid && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3" role="alert">
          <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-emerald-800">Payment received! A doctor is now reviewing your request.</p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{greeting}, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Your health, handled online</p>
        </div>
        <Button asChild size="sm" className="rounded-lg gap-1.5">
          <Link href="/start">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New request
          </Link>
        </Button>
      </header>

      {/* Quick Stats */}
      <section aria-label="Request summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total</span>
            <FileText className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">In review</span>
            <Clock className="h-4 w-4 text-violet-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.pending}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Completed</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.approved}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Declined</span>
            <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.declined}</p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/medical-certificate/request"
          className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
            <FileText className="h-6 w-6 text-indigo-500" />
          </div>
          <h3 className="font-heading font-semibold text-foreground mb-1">Medical Certificate</h3>
          <p className="text-xs text-muted-foreground">Work, uni, or carer&apos;s leave</p>
        </Link>
        <Link
          href="/prescriptions/request"
          className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
            <Pill className="h-6 w-6 text-violet-500" />
          </div>
          <h3 className="font-heading font-semibold text-foreground mb-1">Prescription</h3>
          <p className="text-xs text-muted-foreground">Repeat scripts & reviews</p>
        </Link>
      </section>

      {/* Needs Action */}
      {needsAction.length > 0 && (
        <section aria-labelledby="needs-action-heading">
          <h2 id="needs-action-heading" className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" aria-hidden="true" />
            Needs your attention
          </h2>
          <ul className="space-y-2">
            {needsAction.map((request) => {
              const display = getStatusDisplay(request.status, request.payment_status)
              return (
                <li key={request.id}>
                  <Link
                    href={`/patient/requests/${request.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <display.icon className="h-5 w-5 text-orange-500" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">
                          {formatCategory(request.category) || formatRequestType(request.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">{display.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {display.badge}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section aria-labelledby="in-progress-heading">
          <h2 id="in-progress-heading" className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-violet-500" aria-hidden="true" />
            Being reviewed
            <span className="ml-auto text-xs text-muted-foreground font-normal flex items-center gap-1">
              <Bell className="h-3 w-3" />
              We&apos;ll email you when ready
            </span>
          </h2>
          <ul className="space-y-2">
            {inProgress.map((request) => {
              const display = getStatusDisplay(request.status, request.payment_status)
              return (
                <li key={request.id}>
                  <Link
                    href={`/patient/requests/${request.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-violet-100 bg-violet-50/30 hover:bg-violet-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <display.icon className="h-5 w-5 text-violet-500" aria-hidden="true" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {formatCategory(request.category) || formatRequestType(request.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">{display.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {display.badge}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Recent Completed */}
      <section aria-labelledby="recent-heading" className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="recent-heading" className="text-sm font-medium">
            Recent requests
          </h2>
          {recentRequests.length > 0 && (
            <Link href="/patient/requests" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="p-4">
          {displayRequests.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">No requests yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Get a medical certificate or prescription in under an hour — no phone calls needed.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild className="rounded-xl">
                  <Link href="/medical-certificate/request">
                    <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Medical Certificate
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl bg-transparent">
                  <Link href="/prescriptions/request">
                    <Pill className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Prescription
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {displayRequests.map((request) => {
                const display = getStatusDisplay(request.status, request.payment_status)
                return (
                  <li key={request.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/patient/requests/${request.id}`}
                      className="flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatCategory(request.category) || formatRequestType(request.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(request.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {display.badge}
                        {request.status === "approved" && (
                          <Download className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
