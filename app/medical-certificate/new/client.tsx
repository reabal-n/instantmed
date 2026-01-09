"use client"

import { useRouter } from "next/navigation"
import { StreamlinedIntake, type IntakeFormData } from "@/components/intake/streamlined-intake"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { useConfetti } from "@/components/effects/confetti"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("client")

interface MedCertIntakeClientProps {
  subtype?: string
  isAuthenticated: boolean
  profileData?: {
    fullName?: string
    email?: string
    dateOfBirth?: string
    medicareNumber?: string
    medicareIrn?: string
  }
}

export function MedCertIntakeClient({
  subtype,
  isAuthenticated,
  profileData,
}: MedCertIntakeClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { fire: fireConfetti } = useConfetti()
  const { user } = useAuth()
  const { openSignIn } = useAuth()

  const handleSubmit = async (data: IntakeFormData) => {
    // Use Clerk user for authentication
    if (!user) {
      throw new Error("Please sign in to continue")
    }

    // Get or create profile
    const profileResult = await createOrGetProfile(
      user.id,
      data.fullName || user.fullName || "",
      data.dateOfBirth || ""
    )

    if (profileResult.error || !profileResult.profileId) {
      throw new Error(profileResult.error || "Failed to create profile")
    }

    // Calculate dates
    const startDate = new Date(data.startDate)
    const durationDays = getDurationDays(data.duration || "1 day")
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + durationDays - 1)

    // Create the request
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: profileResult.profileId,
        type: "med_cert",
        category: "medical_certificate",
        subtype: data.certType,
        status: "pending",
        payment_status: "pending_payment",
        answers: {
          certType: data.certType,
          duration: data.duration,
          startDate: data.startDate,
          endDate: endDate.toISOString().split("T")[0],
          symptoms: data.symptoms,
          additionalNotes: data.additionalNotes,
          ...(data.certType === "carer" && {
            carerPatientName: data.carerPatientName,
            carerRelationship: data.carerRelationship,
          }),
        },
      })
      .select("id")
      .single()

    if (requestError || !request) {
      log.error("Failed to create request", { error: requestError })
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
    // Use Clerk's sign-in modal
    openSignIn({
      afterSignInUrl: "/medical-certificate/new",
      afterSignUpUrl: "/medical-certificate/new",
    })
  }

  return (
    <StreamlinedIntake
      type="med_cert"
      subtype={subtype}
      isAuthenticated={isAuthenticated}
      profileData={profileData}
      onSubmit={handleSubmit}
      onAuthRequired={handleAuthRequired}
    />
  )
}

function getDurationDays(duration: string): number {
  switch (duration) {
    case "1 day": return 1
    case "2 days": return 2
    case "3 days": return 3
    case "4-5 days": return 5
    case "1 week": return 7
    default: return 1
  }
}
