import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Canonical page lives at /admin/ops/intakes-stuck
export default function DoctorAdminIntakesStuckPage() {
  redirect("/admin/ops/intakes-stuck")
}
