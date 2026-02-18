import { DoctorProfilesClient } from "./doctors-client"
import { getAllDoctorsAction } from "@/app/actions/admin-settings"

export const dynamic = "force-dynamic"

export default async function DoctorProfilesPage() {
  const doctors = await getAllDoctorsAction().catch(() => [])

  return <DoctorProfilesClient initialDoctors={doctors} />
}
