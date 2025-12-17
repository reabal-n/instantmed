"use client"

import { useRouter } from "next/navigation"
import { PrescriptionIntake, type PrescriptionFormData } from "@/components/intake/prescription-intake"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { useConfetti } from "@/components/effects/confetti"

interface PrescriptionIntakeClientProps {
  isAuthenticated: boolean
  profileData?: {
    fullName?: string
    email?: string
    dateOfBirth?: string
    medicareNumber?: string
    medicareIrn?: string
  }
}

export function PrescriptionIntakeClient({
  isAuthenticated,
  profileData,
}: PrescriptionIntakeClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { fire: fireConfetti } = useConfetti()

  const handleSubmit = async (data: PrescriptionFormData) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error("Please sign in to continue")
    }

    // Get or create profile
    const profileResult = await createOrGetProfile(
      user.id,
      data.fullName || user.user_metadata?.full_name || "",
      data.dateOfBirth || ""
    )

    if (profileResult.error || !profileResult.profileId) {
      throw new Error(profileResult.error || "Failed to create profile")
    }

    // Create the request
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: profileResult.profileId,
        type: "prescription",
        category: "prescription",
        subtype: data.rxType,
        status: "pending",
        payment_status: "pending_payment",
        answers: {
          rxType: data.rxType,
          medication: data.medication,
          condition: data.condition,
          otherCondition: data.otherCondition,
          duration: data.duration,
          additionalNotes: data.additionalNotes,
          safetyAnswers: data.safetyAnswers,
        },
      })
      .select("id")
      .single()

    if (requestError || !request) {
      console.error("Failed to create request:", requestError)
      throw new Error("Failed to create request. Please try again.")
    }

    // Fire confetti on success
    fireConfetti()

    // Redirect to payment after a brief delay for confetti
    setTimeout(() => {
      router.push(`/checkout/${request.id}`)
    }, 500)
  }

  const handleAuthRequired = () => {
    // Save form state and redirect to auth
    sessionStorage.setItem("prescription_redirect", "/prescriptions/new")
    router.push("/auth/login?redirect=/prescriptions/new")
  }

  return (
    <PrescriptionIntake
      isAuthenticated={isAuthenticated}
      profileData={profileData}
      onSubmit={handleSubmit}
      onAuthRequired={handleAuthRequired}
    />
  )
}
