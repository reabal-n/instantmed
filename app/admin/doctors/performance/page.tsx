import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DoctorPerformanceClient } from "./performance-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function DoctorPerformancePage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser || authUser.profile.role !== "admin") {
    redirect("/")
  }

  const supabase = createServiceRoleClient()

  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get all doctors
  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["doctor", "admin"])

  // Get intake stats per doctor
  const { data: intakes } = await supabase
    .from("intakes")
    .select("id, doctor_id, status, created_at, updated_at, paid_at")
    .gte("created_at", monthAgo.toISOString())

  // Calculate metrics per doctor
  const doctorMetrics = (doctors || []).map((doctor) => {
    const doctorIntakes = (intakes || []).filter((i) => i.doctor_id === doctor.id)
    const approved = doctorIntakes.filter((i) => i.status === "approved")
    const declined = doctorIntakes.filter((i) => i.status === "declined")
    
    // Calculate average response time (from paid_at to updated_at for approved/declined)
    const completedIntakes = doctorIntakes.filter(
      (i) => (i.status === "approved" || i.status === "declined") && i.paid_at && i.updated_at
    )
    
    let avgResponseMinutes = 0
    if (completedIntakes.length > 0) {
      const totalMinutes = completedIntakes.reduce((sum, i) => {
        const start = new Date(i.paid_at!).getTime()
        const end = new Date(i.updated_at).getTime()
        return sum + (end - start) / (1000 * 60)
      }, 0)
      avgResponseMinutes = totalMinutes / completedIntakes.length
    }

    const approvalRate = doctorIntakes.length > 0
      ? (approved.length / (approved.length + declined.length)) * 100 || 0
      : 0

    return {
      id: doctor.id,
      name: doctor.full_name,
      email: doctor.email,
      role: doctor.role,
      totalReviewed: approved.length + declined.length,
      approved: approved.length,
      declined: declined.length,
      approvalRate,
      avgResponseMinutes,
      pending: doctorIntakes.filter((i) => i.status === "paid" || i.status === "in_review").length,
    }
  })

  // Sort by total reviewed
  doctorMetrics.sort((a, b) => b.totalReviewed - a.totalReviewed)

  return <DoctorPerformanceClient doctors={doctorMetrics} />
}
