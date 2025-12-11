import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TestToolsCard } from "@/components/shared/test-tools-card"
import { ReferralCard } from "@/components/patient/referral-card"
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
} from "lucide-react"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientRequests, getPatientRequestStats, formatRequestType, formatCategory } from "@/lib/data/requests"
import { redirect } from "next/navigation"

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>
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

  const firstName = authUser.profile.full_name.split(" ")[0]
  const stats = await getPatientRequestStats(authUser.profile.id)
  const recentRequests = await getPatientRequests(authUser.profile.id)
  const displayRequests = recentRequests.slice(0, 5)

  // Separate requests by urgency
  const needsAction = displayRequests.filter(
    (r) => r.payment_status === "pending_payment" || r.status === "needs_follow_up",
  )
  const inProgress = displayRequests.filter((r) => r.status === "pending" && r.payment_status !== "pending_payment")
  const completed = displayRequests.filter((r) => r.status === "approved" || r.status === "declined")

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
        badge: <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Info requested</Badge>,
        icon: MessageSquare,
        message: "Doctor needs more information",
      }
    }
    if (status === "pending") {
      return {
        badge: <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">In review</Badge>,
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
      {showOnboardedSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3" role="alert">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-emerald-800">Profile complete. You're ready to submit requests.</p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Handled online, no phone call needed</p>
        </div>
        <Button asChild size="sm" className="rounded-lg">
          <Link href="/start">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New request
          </Link>
        </Button>
      </header>

      {/* Quick Stats */}
      <section aria-label="Request summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total</span>
            <FileText className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">In review</span>
            <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.pending}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Completed</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.approved}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Declined</span>
            <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold">{stats.declined}</p>
        </div>
      </section>

      <ReferralCard patientId={authUser.profile.id} />

      {/* Test Tools Card */}
      <TestToolsCard patientId={authUser.profile.id} />

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
            <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Being reviewed
          </h2>
          <ul className="space-y-2">
            {inProgress.map((request) => {
              const display = getStatusDisplay(request.status, request.payment_status)
              return (
                <li key={request.id}>
                  <Link
                    href={`/patient/requests/${request.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <display.icon className="h-5 w-5 text-amber-500" aria-hidden="true" />
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
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No requests yet</p>
              <Button asChild size="sm" variant="outline" className="mt-3 rounded-lg bg-transparent">
                <Link href="/start">
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Start a request
                </Link>
              </Button>
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
