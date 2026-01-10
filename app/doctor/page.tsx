import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DoctorDashboardPage() {
  // Redirect to queue - the main doctor workflow now uses intakes
  redirect("/doctor/queue")
}
