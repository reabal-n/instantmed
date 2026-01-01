import { redirect, notFound } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getRequestForPatient } from "@/lib/data/requests"
import { getLatestDocumentForRequest, getMedCertCertificateForRequest } from "@/lib/data/documents"
import PatientRequestDetailPageClient from "./client"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Request ${id.slice(0, 8)} | InstantMed`,
    description: "View the status and details of your medical request.",
  }
}

export default async function PatientRequestDetailPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ retry?: string }> }) {
  const { id } = await params
  const { retry } = await searchParams
  
  // Get authenticated user
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/sign-in")
  }
  
  // Fetch the request with ownership check
  const request = await getRequestForPatient(id, authUser.profile.id)
  
  if (!request) {
    notFound()
  }
  
  // Fetch document if request is approved
  // Try med cert certificate first (new flow), then fall back to regular documents
  let document = null
  if (request.status === "approved") {
    document = await getMedCertCertificateForRequest(id)
    if (!document) {
      document = await getLatestDocumentForRequest(id)
    }
  }
  
  return (
    <PatientRequestDetailPageClient 
      request={request}
      document={document}
      retryPayment={retry === "true"}
    />
  )
}
