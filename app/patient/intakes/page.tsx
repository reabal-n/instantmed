import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientIntakes } from "@/lib/data/intakes"
import { IntakesClient } from "./intakes-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Requests | InstantMed",
  description: "View and manage all your medical requests.",
}

export const dynamic = "force-dynamic"

export default async function PatientIntakesPage() {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/sign-in")
  }
  
  const intakes = await getPatientIntakes(authUser.profile.id)
  
  return <IntakesClient intakes={intakes} patientId={authUser.profile.id} />
}
