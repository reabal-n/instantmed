import { Suspense } from "react"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { auth } from "@/lib/auth"
import { RepeatRxReviewClient } from "./review-client"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"

// Generate metadata for SEO
// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Review Request ${id} | Doctor Dashboard`,
    robots: { index: false, follow: false },
  }
}

// Loading component
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading request...</p>
      </div>
    </div>
  )
}

// Fetch request data server-side
async function getRequestData(id: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { error: "unauthorized", data: null }
  }
  
  const supabase = createServiceRoleClient()
  
  // Check clinician role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .single()
  
  if (!profile || !["clinician", "doctor", "admin"].includes(profile.role)) {
    return { error: "forbidden", data: null }
  }
  
  // Fetch the repeat rx request
  const { data: request, error } = await supabase
    .from("repeat_rx_requests")
    .select(`
      *,
      patient:profiles!repeat_rx_requests_patient_id_fkey (
        id,
        full_name,
        email,
        phone,
        date_of_birth,
        address,
        medicare_number,
        medicare_irn,
        ihi_number
      ),
      answers:repeat_rx_answers (
        id,
        version,
        answers,
        created_at
      ),
      decisions:clinician_decisions (
        id,
        decision,
        decision_reason,
        clinician_id,
        created_at
      )
    `)
    .eq("id", id)
    .single()
  
  if (error || !request) {
    return { error: "not_found", data: null }
  }
  
  // Log that clinician viewed this request (legacy)
  await supabase.from("audit_events").insert({
    request_id: id,
    patient_id: request.patient_id,
    event_type: "clinician_viewed",
    payload: {
      clinician_id: profile.id,
    },
    actor_type: "clinician",
    actor_id: profile.id,
  })
  
  // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
  await logClinicianOpenedRequest(id, "repeat_rx", profile.id)
  
  return { error: null, data: { request, clinicianId: profile.id } }
}

export default async function RepeatRxReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const { error, data } = await getRequestData(id)
  
  if (error === "unauthorized") {
    notFound()
  }
  
  if (error === "forbidden") {
    notFound()
  }
  
  if (error === "not_found" || !data) {
    notFound()
  }
  
  return (
    <Suspense fallback={<LoadingState />}>
      <RepeatRxReviewClient 
        request={data.request}
        clinicianId={data.clinicianId}
      />
    </Suspense>
  )
}
