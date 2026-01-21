import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { DoctorProfilesClient } from "./doctors-client"
import { getAllDoctorsAction } from "@/app/actions/admin-settings"

export const dynamic = "force-dynamic"

export default async function DoctorProfilesPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const doctors = await getAllDoctorsAction()

  return <DoctorProfilesClient initialDoctors={doctors} />
}
