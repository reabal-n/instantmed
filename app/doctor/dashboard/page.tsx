import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { DynamicDoctorDashboard } from "@/components/shared/dynamic-components"

export const dynamic = "force-dynamic"

export default async function DoctorDashboardPage() {
  // Use Clerk authentication with role check
  const authUser = await requireAuth("doctor").catch(() => null)
  
  if (!authUser) {
    redirect("/sign-in?redirect_url=/doctor/dashboard")
  }

  const supabase = await createClient()
  const profile = authUser.profile
  const clerkUserId = authUser.user.id

  // Fetch all requests assigned to this doctor or unassigned
  const { data: requests } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!requests_patient_id_fkey(
        id,
        full_name,
        email,
        phone
      )
    `)
    .or(`doctor_id.eq.${profile.id},doctor_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(100)

  // Get stats
  const { count: totalRequests } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", profile.id)

  const { count: pendingRequests } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", profile.id)
    .eq("status", "submitted")

  const { count: approvedToday } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", profile.id)
    .eq("status", "approved")
    .gte("updated_at", new Date().toISOString().split("T")[0])

  return (
    <DynamicDoctorDashboard
      doctorId={profile.id}
      doctorName={profile.full_name || "Doctor"}
      initialRequests={requests || []}
      stats={{
        total: totalRequests || 0,
        pending: pendingRequests || 0,
        approvedToday: approvedToday || 0,
      }}
    />
  )
}
