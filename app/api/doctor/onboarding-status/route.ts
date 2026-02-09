import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("doctor-onboarding")

export interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  href?: string
  required: boolean
}

/**
 * Returns the onboarding status for the current doctor.
 *
 * Steps:
 * 1. Profile complete (name, email, phone)
 * 2. AHPRA number entered
 * 3. Provider number entered
 * 4. AHPRA verified by admin
 * 5. Signature uploaded (optional)
 * 6. Test intake reviewed (optional)
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      .eq("clerk_user_id", userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if doctor has reviewed at least one intake (test or real)
    const { count: reviewCount } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .or(`reviewed_by.eq.${profile.id},claimed_by.eq.${profile.id}`)

    const hasReviewedIntake = (reviewCount || 0) > 0

    const steps: OnboardingStep[] = [
      {
        id: "profile",
        label: "Complete your profile",
        description: "Add your name, email, and phone number",
        completed: !!(profile.full_name && profile.email && profile.phone),
        href: "/doctor/settings",
        required: true,
      },
      {
        id: "ahpra_number",
        label: "Enter your AHPRA number",
        description: "Your AHPRA registration number (e.g., MED0002576546)",
        completed: !!profile.ahpra_number,
        href: "/doctor/settings/identity",
        required: true,
      },
      {
        id: "provider_number",
        label: "Enter your provider number",
        description: "Your Medicare provider number for prescribing",
        completed: !!profile.provider_number,
        href: "/doctor/settings/identity",
        required: true,
      },
      {
        id: "ahpra_verified",
        label: "AHPRA verification",
        description: "Admin will verify your AHPRA registration (usually within 24 hours)",
        completed: !!profile.ahpra_verified,
        required: true,
      },
      {
        id: "signature",
        label: "Upload your signature",
        description: "Optional — used on medical certificates. If not provided, 'Electronically signed' will be shown",
        completed: !!profile.signature_storage_path,
        href: "/doctor/settings/identity",
        required: false,
      },
      {
        id: "first_review",
        label: "Review your first request",
        description: "Familiarise yourself with the review workflow by reviewing a patient request",
        completed: hasReviewedIntake,
        href: "/doctor/queue",
        required: false,
      },
    ]

    const requiredSteps = steps.filter(s => s.required)
    const completedRequired = requiredSteps.filter(s => s.completed)
    const allRequiredComplete = completedRequired.length === requiredSteps.length
    const completionPercentage = Math.round((completedRequired.length / requiredSteps.length) * 100)

    // Update onboarding_completed flag if all required steps done
    if (allRequiredComplete && !profile.onboarding_completed) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", profile.id)
    }

    return NextResponse.json({
      steps,
      summary: {
        total: steps.length,
        completed: steps.filter(s => s.completed).length,
        required_total: requiredSteps.length,
        required_completed: completedRequired.length,
        all_required_complete: allRequiredComplete,
        completion_percentage: completionPercentage,
        can_approve_intakes: allRequiredComplete,
      },
    })
  } catch (error) {
    logger.error("Onboarding status check failed", {
      error: error instanceof Error ? error.message : "Unknown",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
