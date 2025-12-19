import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import {
  getAllRequestsByStatus,
  getDoctorDashboardStats,
  getRequestsAwaitingPayment,
} from "@/lib/data/requests"
import { DoctorDashboardClient } from "./doctor-dashboard-client"

export default async function DoctorDashboardPage() {
  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/auth/login")
  }

  // Fetch all data with individual error handling to prevent total failure
  const [pendingRequests, approvedRequests, declinedRequests, awaitingPaymentRequests, stats] = await Promise.all([
    getAllRequestsByStatus("pending").catch(() => []),
    getAllRequestsByStatus("approved").catch(() => []),
    getAllRequestsByStatus("declined").catch(() => []),
    getRequestsAwaitingPayment().catch(() => []),
    getDoctorDashboardStats().catch(() => ({ total: 0, pending: 0, approved: 0, declined: 0, needs_follow_up: 0 })),
  ])

  return (
    <DoctorDashboardClient
      pendingRequests={pendingRequests}
      approvedRequests={approvedRequests}
      declinedRequests={declinedRequests}
      awaitingPaymentRequests={awaitingPaymentRequests}
      stats={{
        ...stats,
        awaiting_payment: awaitingPaymentRequests.length,
      }}
      doctorName={profile.full_name}
    />
  )
}
