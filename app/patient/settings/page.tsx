import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { PatientSettingsClient } from "./settings-client"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Settings | InstantMed",
  description: "Manage your profile and account settings",
}

export default async function PatientSettingsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "patient") {
    redirect("/doctor")
  }

  return <PatientSettingsClient profile={authUser.profile} email={authUser.user.email || ""} />
}
