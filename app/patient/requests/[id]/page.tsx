import { redirect, notFound } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getRequestForPatient } from "@/lib/data/requests"
import { getLatestDocumentForRequest } from "@/lib/data/documents"
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
    redirect("/auth/login")
  }
  
  // Fetch the request with ownership check
  const request = await getRequestForPatient(id, authUser.profile.id)
  
  if (!request) {
    notFound()
  }
  
  // Fetch document if request is approved
  const document = request.status === "approved" 
    ? await getLatestDocumentForRequest(id)
    : null
  
  return (
    <PatientRequestDetailPageClient 
      request={request}
      document={document}
      retryPayment={retry === "true"}
    />
  )
}
