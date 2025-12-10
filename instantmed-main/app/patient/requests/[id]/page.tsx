import { redirect, notFound } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getRequestForPatient, formatRequestType, formatCategory } from "@/lib/data/requests"
import { getLatestDocumentForRequest } from "@/lib/data/documents"
import PatientRequestDetailPageClient from "./client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return {
    title: `Request ${id.slice(0, 8)} | InstantMed`,
    description: "View the status and details of your medical request.",
  }
}

export default async function PatientRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ retry?: string }>
}) {
  const { id } = await params
  const query = await searchParams

  // Get authenticated user
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  // Fetch the request with ownership check
  const request = await getRequestForPatient(id, authUser.profile.id)

  if (!request) {
    notFound()
  }

  // Fetch the generated document if approved
  const document = request.status === "approved" ? await getLatestDocumentForRequest(id) : null

  return (
    <PatientRequestDetailPageClient
      request={request}
      document={document}
      showRetryPrompt={query.retry === "true"}
    />
  )
}
