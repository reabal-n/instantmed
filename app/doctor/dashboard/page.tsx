import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DoctorDashboardPage() {
  // Canonical doctor landing page is /doctor (the review queue)
  redirect("/doctor")
}
