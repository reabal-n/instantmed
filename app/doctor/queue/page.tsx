import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getAllRequestsByStatus } from "@/lib/data/requests"
import { QueueClient } from "./queue-client"

export default async function DoctorQueuePage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  // Fetch both pending and awaiting_prescribe requests
  const [pendingRequests, awaitingPrescribeRequests] = await Promise.all([
    getAllRequestsByStatus("pending"),
    getAllRequestsByStatus("awaiting_prescribe"),
  ])

  // Combine and sort by oldest first (FIFO queue)
  // Pending requests come first, then awaiting_prescribe
  const allRequests = [...pendingRequests, ...awaitingPrescribeRequests]
  const sortedRequests = allRequests.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  return (
    <QueueClient
      requests={sortedRequests}
      doctorId={profile.id}
      doctorName={profile.full_name}
    />
  )
}
