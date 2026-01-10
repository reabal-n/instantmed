import { redirect, notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getIntakeWithDetails, getPatientIntakes } from "@/lib/data/intakes"
import { IntakeDetailClient } from "./intake-detail-client"

export const dynamic = "force-dynamic"

export default async function DoctorIntakeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { id } = await params
  const { action } = await searchParams

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const intake = await getIntakeWithDetails(id)

  if (!intake) {
    notFound()
  }

  // Fetch patient's previous intakes for history
  const patientHistory = await getPatientIntakes(intake.patient.id)
  const previousIntakes = patientHistory.filter(r => r.id !== id).slice(0, 5)

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

  // Mask Medicare number
  const maskMedicare = (medicare: string | null): string => {
    if (!medicare) return "Not provided"
    const cleaned = medicare.replace(/\s/g, "")
    if (cleaned.length < 6) return medicare
    return `${cleaned.slice(0, 4)} •••• ${cleaned.slice(-2)}`
  }

  const patientAge = calculateAge(intake.patient.date_of_birth)
  const maskedMedicare = maskMedicare(intake.patient.medicare_number)

  return (
    <IntakeDetailClient
      intake={intake}
      patientAge={patientAge}
      maskedMedicare={maskedMedicare}
      previousIntakes={previousIntakes}
      initialAction={action}
    />
  )
}
