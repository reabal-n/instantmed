import { getAllDoctorsAction } from "@/app/actions/admin-settings"

import { DoctorProfilesClient } from "./doctors-client"

export const dynamic = "force-dynamic"

export default async function DoctorProfilesPage() {
  const doctors = await getAllDoctorsAction().catch(() => [])

  return <DoctorProfilesClient initialDoctors={doctors} />
}
