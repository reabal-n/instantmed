import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Canonical ops overview lives at /admin/ops
// Middleware also redirects this path, but this is defense-in-depth
export default function DoctorAdminOpsPage() {
  redirect("/admin/ops")
}
