import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Canonical page lives at /admin/ops/reconciliation
export default function DoctorAdminReconciliationPage() {
  redirect("/admin/ops/reconciliation")
}
