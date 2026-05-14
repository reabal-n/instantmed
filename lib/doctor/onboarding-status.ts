import "server-only"

import {
  STAFF_DOCTOR_SETTINGS_HREF,
  STAFF_IDENTITY_HREF,
  STAFF_QUEUE_HREF,
} from "@/lib/dashboard/routes"
import type { DoctorOnboardingStatus, DoctorOnboardingStep } from "@/lib/doctor/onboarding-status-types"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function getDoctorOnboardingStatus(profileId: string): Promise<DoctorOnboardingStatus | null> {
  const supabase = createServiceRoleClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id, full_name, email, phone,
      ahpra_number, ahpra_verified,
      provider_number,
      signature_storage_path,
      onboarding_completed
    `)
    .eq("id", profileId)
    .single()

  if (error || !profile) return null

  const { count: reviewCount } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .or(`reviewed_by.eq.${profile.id},claimed_by.eq.${profile.id}`)

  const hasReviewedIntake = (reviewCount || 0) > 0

  const steps: DoctorOnboardingStep[] = [
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add your name, email, and phone number",
      completed: Boolean(profile.full_name && profile.email && profile.phone),
      href: STAFF_DOCTOR_SETTINGS_HREF,
      required: true,
    },
    {
      id: "ahpra_number",
      label: "Enter your AHPRA number",
      description: "Your AHPRA registration number",
      completed: Boolean(profile.ahpra_number),
      href: STAFF_IDENTITY_HREF,
      required: true,
    },
    {
      id: "provider_number",
      label: "Enter your provider number",
      description: "Your Medicare provider number for prescribing",
      completed: Boolean(profile.provider_number),
      href: STAFF_IDENTITY_HREF,
      required: true,
    },
    {
      id: "ahpra_verified",
      label: "AHPRA verification",
      description: "Admin verifies AHPRA registration before clinical approval",
      completed: Boolean(profile.ahpra_verified),
      required: true,
    },
    {
      id: "signature",
      label: "Upload your signature",
      description: "Optional for medical certificates",
      completed: Boolean(profile.signature_storage_path),
      href: STAFF_IDENTITY_HREF,
      required: false,
    },
    {
      id: "first_review",
      label: "Review your first request",
      description: "Familiarise yourself with the review workflow",
      completed: hasReviewedIntake,
      href: STAFF_QUEUE_HREF,
      required: false,
    },
  ]

  const requiredSteps = steps.filter((step) => step.required)
  const completedRequired = requiredSteps.filter((step) => step.completed)
  const allRequiredComplete = completedRequired.length === requiredSteps.length

  if (allRequiredComplete && !profile.onboarding_completed) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", profile.id)
  }

  return {
    steps,
    summary: {
      total: steps.length,
      completed: steps.filter((step) => step.completed).length,
      required_total: requiredSteps.length,
      required_completed: completedRequired.length,
      all_required_complete: allRequiredComplete,
      completion_percentage: Math.round((completedRequired.length / requiredSteps.length) * 100),
      can_approve_intakes: allRequiredComplete,
    },
  }
}
