import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import {
  getAllRequestsByStatus,
  getDoctorDashboardStats,
  formatCategory,
  formatSubtype,
  getRequestsAwaitingPayment,
} from "@/lib/data/requests"
import { DoctorDashboardClient } from "./doctor-dashboard-client"

export default async function DoctorDashboardPage() {
  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/auth/login")
  }

  let pendingRequests, approvedRequests, declinedRequests, awaitingPaymentRequests, stats
  
  try {
    const results = await Promise.all([
      getAllRequestsByStatus("pending"),
      getAllRequestsByStatus("approved"),
      getAllRequestsByStatus("declined"),
      getRequestsAwaitingPayment(),
      getDoctorDashboardStats(),
    ])
    
    pendingRequests = results[0]
    approvedRequests = results[1]
    declinedRequests = results[2]
    awaitingPaymentRequests = results[3]
    stats = results[4]
  } catch (error) {
    throw error
  }

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
      formatCategory={formatCategory}
      formatSubtype={formatSubtype}
    />
  )
}
