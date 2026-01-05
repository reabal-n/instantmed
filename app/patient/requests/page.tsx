import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, CheckCircle } from "lucide-react"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientRequests, formatRequestType } from "@/lib/data/requests"
import { redirect } from "next/navigation"
import { RequestsListClient } from "./requests-list-client"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export default async function PatientRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const requests = await getPatientRequests(authUser.profile.id)
  const params = await searchParams
  const showSuccess = params.success === "true"

  // Transform requests for client component
  const formattedRequests = requests.map((r) => ({
    id: r.id,
    type: r.type,
    typeLabel: formatRequestType(r.type),
    status: r.status,
    createdAt: r.created_at,
    paymentStatus: r.payment_status || undefined,
  }))

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50/80 backdrop-blur-sm p-4 flex items-start gap-3 animate-fade-in-up"
          style={{ animationFillMode: "forwards" }}
        >
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Request submitted successfully</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Your request has been submitted and will be reviewed by a doctor within 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage all your consultation requests</p>
        </div>
        <Button asChild className="rounded-xl btn-glow shadow-md shadow-primary/20">
          <Link href="/patient/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New request
          </Link>
        </Button>
      </div>

      {/* Requests List */}
      <div
        className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">All requests</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">A complete list of your consultation requests</p>
        </div>
        <div className="px-6 pb-6">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted/50 p-3 mb-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start a new consultation to get help from a doctor</p>
              <Button asChild size="sm" className="mt-4 rounded-xl">
                <Link href="/patient/requests/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New request
                </Link>
              </Button>
            </div>
          ) : (
            <RequestsListClient requests={formattedRequests} />
          )}
        </div>
      </div>
    </div>
  )
}
