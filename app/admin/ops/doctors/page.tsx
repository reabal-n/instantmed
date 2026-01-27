import { redirect } from "next/navigation"

export default function DoctorOpsRedirect() {
  redirect("/doctor/admin/ops/doctors")
}
