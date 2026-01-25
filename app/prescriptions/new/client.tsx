"use client"

import { useRouter } from "next/navigation"
import { PrescriptionIntake, type PrescriptionFormData } from "@/components/intake/prescription-intake"
import { useConfetti } from "@/components/effects/confetti"
import { createRequestAction } from "@/app/actions/create-request"
import { saveFormData, clearFormData, STORAGE_KEYS } from "@/lib/storage"

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
  const { fire: fireConfetti } = useConfetti()

  const handleSubmit = async (data: PrescriptionFormData) => {
    // Save form data for recovery in case of payment failure
    saveFormData(STORAGE_KEYS.PRESCRIPTION_FORM, data)

    // Use consolidated server action for request creation
    const result = await createRequestAction({
      category: "prescription",
      subtype: data.rxType || "general",
      type: "prescription",
      answers: {
        rxType: data.rxType,
        medication: data.medication,
        condition: data.condition,
        otherCondition: data.otherCondition,
        duration: data.duration,
        additionalNotes: data.additionalNotes,
        safetyAnswers: data.safetyAnswers,
        fullName: data.fullName,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
      },
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to create request. Please try again.")
    }

    // Clear saved form data on success
    clearFormData(STORAGE_KEYS.PRESCRIPTION_FORM)

    // Fire confetti on success
    fireConfetti()

    // Redirect to payment after a brief delay for confetti
    setTimeout(() => {
      router.push(`/checkout/${result.requestId}`)
    }, 500)
  }

  const handleAuthRequired = () => {
    // Save form state and redirect to auth
    sessionStorage.setItem("prescription_redirect", "/prescriptions/new")
    router.push("/sign-in?redirect=/prescriptions/new")
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
