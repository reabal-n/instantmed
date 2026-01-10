import { redirect, notFound } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getIntakeForPatient } from "@/lib/data/intakes"
import { IntakeDetailClient } from "./client"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Request ${id.slice(0, 8)} | InstantMed`,
    description: "View the status and details of your medical request.",
  }
}

export default async function PatientIntakeDetailPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ retry?: string }> }) {
  const { id } = await params
  const { retry } = await searchParams
  
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/sign-in")
  }
  
  // Fetch the intake with ownership check
  const intake = await getIntakeForPatient(id, authUser.profile.id)
  
  if (!intake) {
    notFound()
  }
  
  return (
    <IntakeDetailClient 
      intake={intake}
      retryPayment={retry === "true"}
    />
  )
}
