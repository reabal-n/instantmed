import DoctorIntakeDetailPage from "@/app/doctor/intakes/[id]/page"
import { requireRole } from "@/lib/auth/helpers"

export const metadata = { title: "Admin Intake Detail" }

export const dynamic = "force-dynamic"

export default async function AdminIntakeDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}) {
  await requireRole(["admin"], { redirectTo: "/admin" })

  return <DoctorIntakeDetailPage {...props} />
}
