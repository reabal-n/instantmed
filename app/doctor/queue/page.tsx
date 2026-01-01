import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getAllRequestsByStatus } from "@/lib/data/requests"
import { QueueClient } from "./queue-client"

export default async function DoctorQueuePage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const pendingRequests = await getAllRequestsByStatus("pending")

  // Sort by oldest first (FIFO queue)
  const sortedRequests = [...pendingRequests].sort(
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
