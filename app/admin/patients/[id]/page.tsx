import DoctorPatientDetailPage from "@/app/doctor/patients/[id]/page"
import { requireRole } from "@/lib/auth/helpers"

export const metadata = { title: "Admin Patient Detail" }

export const dynamic = "force-dynamic"

export default async function AdminPatientDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["admin"], { redirectTo: "/admin" })

  return <DoctorPatientDetailPage {...props} />
}
