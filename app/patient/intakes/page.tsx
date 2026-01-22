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

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function PatientIntakesPage({ searchParams }: PageProps) {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/sign-in")
  }
  
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const { data: intakes, total, pageSize } = await getPatientIntakes(authUser.profile.id, { page })
  
  return (
    <IntakesClient
      intakes={intakes}
      patientId={authUser.profile.id}
      pagination={{ page, total, pageSize }}
    />
  )
}
