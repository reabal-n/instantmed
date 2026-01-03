import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DoctorDashboardClient } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function DoctorDashboardPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated and is a doctor
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/sign-in?redirect_url=/doctor/dashboard")
  }

  // Get doctor profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "doctor") {
    redirect("/")
  }

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
    .or(`doctor_id.eq.${user.id},doctor_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(100)

  // Get stats
  const { count: totalRequests } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", user.id)

  const { count: pendingRequests } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", user.id)
    .eq("status", "submitted")

  const { count: approvedToday } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", user.id)
    .eq("status", "approved")
    .gte("updated_at", new Date().toISOString().split("T")[0])

  return (
    <DoctorDashboardClient
      doctorId={user.id}
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
