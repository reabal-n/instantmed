import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { TrackingClient } from "./tracking-client"

interface PageProps {
  params: Promise<{ intakeId: string }>
}

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Track Your Request | InstantMed",
  description: "Track the real-time status of your medical request",
}

export default async function TrackingPage({ params }: PageProps) {
  const { intakeId } = await params
  const supabase = createServiceRoleClient()

  // Get the intake with patient profile
  const { data: intake, error } = await supabase
    .from("intakes")
    .select(`
      *,
      patient:profiles!patient_id (
        full_name,
        id
      )
    `)
    .eq("id", intakeId)
    .single()

  if (error || !intake) {
    notFound()
  }

  // Get queue position for paid intakes awaiting review
  let queuePosition = 0
  if (intake.status === "paid") {
    const { count } = await supabase
      .from("intakes")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid")
      .lt("created_at", intake.created_at)

    queuePosition = (count || 0) + 1
  }

  const estimatedMinutes = queuePosition * 15

  return <TrackingClient intake={intake} queuePosition={queuePosition} estimatedMinutes={estimatedMinutes} />
}
