import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getDoctorQueue } from "@/lib/data/intakes"
import { QueueClient } from "./queue-client"

export const dynamic = "force-dynamic"

export default async function DoctorQueuePage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  // Fetch all intakes in queue (paid, in_review, pending_info)
  // Already sorted by priority and SLA
  const intakes = await getDoctorQueue()

  return (
    <QueueClient
      intakes={intakes}
      doctorId={profile.id}
      doctorName={profile.full_name}
    />
  )
}
