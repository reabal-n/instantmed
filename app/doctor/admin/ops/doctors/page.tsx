import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Canonical page lives at /admin/ops/doctors
export default function DoctorAdminDoctorOpsPage() {
  redirect("/admin/ops/doctors")
}
