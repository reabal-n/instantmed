import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TrackingClient } from "./tracking-client"

interface PageProps {
  params: Promise<{ requestId: string }>
}

export const metadata: Metadata = {
  title: "Track Your Request | InstantMed",
  description: "Track the real-time status of your medical request",
}

export default async function TrackingPage({ params }: PageProps) {
  const { requestId } = await params
  const supabase = await createClient()

  // Get the request with patient profile
  const { data: request, error } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (
        full_name,
        id
      )
    `)
    .eq("id", requestId)
    .single()

  if (error || !request) {
    notFound()
  }

  // Get queue position for pending requests
  let queuePosition = 0
  if (request.status === "pending") {
    const { count } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", request.created_at)

    queuePosition = (count || 0) + 1
  }

  // Calculate estimated wait time (avg 15 min per request)
  const estimatedMinutes = queuePosition * 15

  return <TrackingClient request={request} queuePosition={queuePosition} estimatedMinutes={estimatedMinutes} />
}
