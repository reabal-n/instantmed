import { redirect, notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getRequestWithDetails, getPatientRequests } from "@/lib/data/requests"
import { getLatestDocumentForRequest } from "@/lib/data/documents"
import { RequestDetailClient } from "./request-detail-client"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export default async function DoctorRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { id } = await params
  const { action } = await searchParams

  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  // Fetch the request with all details
  const request = await getRequestWithDetails(id)

  if (!request) {
    notFound()
  }

  const existingDocument = await getLatestDocumentForRequest(id)
  
  // Fetch patient's previous requests for history
  const patientHistory = await getPatientRequests(request.patient.id)
  const previousRequests = patientHistory.filter(r => r.id !== id).slice(0, 5)

  // Calculate patient age from DOB
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Mask Medicare number (show first 4 and last 2 digits)
  const maskMedicare = (medicare: string | null): string => {
    if (!medicare) return "Not provided"
    const cleaned = medicare.replace(/\s/g, "")
    if (cleaned.length < 6) return medicare
    return `${cleaned.slice(0, 4)} •••• ${cleaned.slice(-2)}`
  }

  const patientAge = calculateAge(request.patient.date_of_birth)
  const maskedMedicare = maskMedicare(request.patient.medicare_number)

  return (
    <RequestDetailClient
      request={request}
      patientAge={patientAge}
      maskedMedicare={maskedMedicare}
      existingDocument={existingDocument}
      previousRequests={previousRequests}
      initialAction={action}
    />
  )
}
