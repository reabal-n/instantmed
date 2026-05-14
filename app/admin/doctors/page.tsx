import { getAllDoctorsAction } from "@/app/actions/admin-settings"
import { requireRole } from "@/lib/auth/helpers"

import { DoctorProfilesClient } from "./doctors-client"

export const dynamic = "force-dynamic"

export default async function DoctorProfilesPage() {
  await requireRole(["admin"])

  const doctors = await getAllDoctorsAction().catch(() => [])

  return <DoctorProfilesClient initialDoctors={doctors} />
}
