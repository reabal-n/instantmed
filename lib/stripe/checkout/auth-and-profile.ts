/**
 * Authentication, profile assertion, prescribing-identity sync, age check,
 * URL/config validation, and per-episode consent attestation.
 *
 * Returns the authenticated user, profile, and resolved patientId so the
 * persistence step can write the intake without re-fetching identity.
 */

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { CONTACT_EMAIL } from "@/lib/constants"
import { updateProfile } from "@/lib/data/profiles"
import { createLogger } from "@/lib/observability/logger"
import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"

import {
  buildPrescribingProfileUpdates,
  validateRequiredPrescribingProfileAnswers,
} from "../prescribing-profile-fields"
import { getBaseUrl, isValidUrl } from "./helpers"
import type { CreateCheckoutInput, StepResult } from "./types"
import { stepFail, stepOk } from "./types"

const logger = createLogger("stripe-checkout-auth")
const AGE_REQUIREMENT_ERROR =
  "Date of birth is required to confirm you are 18 or older before payment."
const UNDER_18_ERROR =
  "You must be 18 or older to use this service. If you are under 18, please contact a GP or another appropriate care service."

export interface AuthAndProfileResult {
  patientId: string
  patientEmail: string | undefined
  stripeCustomerId: string | undefined
  authUserId: string
  baseUrl: string
}

function stringAnswer(answers: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function ageFromDateOfBirth(value: string): number | null {
  const dob = new Date(value)
  if (Number.isNaN(dob.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export async function runAuthAndProfile(
  input: CreateCheckoutInput,
): Promise<StepResult<AuthAndProfileResult>> {
  // 1. Authenticate.
  let authUser
  try {
    authUser = await getAuthenticatedUserWithProfile()
  } catch (authError) {
    logger.error("Authentication check failed", { error: authError })
    return stepFail("Authentication failed. Please sign in and try again.")
  }
  if (!authUser) {
    logger.warn("User not authenticated when attempting checkout")
    return stepFail("You must be logged in to submit a request. Please sign in and try again.")
  }

  // 2. Resolve / create the patient profile.
  let patientId: string
  if (authUser.profile?.id) {
    patientId = authUser.profile.id
  } else {
    const { ensureProfile } = await import("@/app/actions/ensure-profile")
    const { profileId, error: profileError } = await ensureProfile(
      authUser.user.id,
      authUser.user.email || "",
    )
    if (profileError || !profileId) {
      return stepFail(`Profile creation failed: ${profileError || "Unknown error"}`)
    }
    patientId = profileId
  }

  // 3. For prescribing/consult flows, sync the prescribing-identity columns
  //    captured in the intake answers into the profile so Parchment + admin
  //    blocker reports see them.
  const requestDateOfBirth: string | null = stringAnswer(input.answers, [
    "dateOfBirth",
    "date_of_birth",
    "dob",
  ])
  if (requiresPrescribingIdentityForRequest({ category: input.category, subtype: input.subtype })) {
    const prescribingIdentityError = validateRequiredPrescribingProfileAnswers(input.answers)
    if (prescribingIdentityError) {
      return stepFail(prescribingIdentityError)
    }

    const prescribingUpdates = buildPrescribingProfileUpdates(input.answers)
    if (Object.keys(prescribingUpdates).length > 0) {
      const updatedProfile = await updateProfile(patientId, prescribingUpdates)
      if (!updatedProfile) {
        return stepFail("Failed to save prescribing details. Please try again.")
      }
    }
  }

  // 4. CLAUDE.md eligibility constraint: 18+.
  const profileDob = typeof authUser.profile?.date_of_birth === "string"
    ? authUser.profile.date_of_birth.trim()
    : ""
  const dobForAgeCheck = profileDob || requestDateOfBirth
  if (!dobForAgeCheck) {
    logger.warn("Checkout blocked: missing date of birth", { patientId, category: input.category })
    return stepFail(AGE_REQUIREMENT_ERROR)
  }

  const age = ageFromDateOfBirth(dobForAgeCheck)
  if (age === null) {
    return stepFail("Please provide a valid date of birth before payment.")
  }
  if (age < 18) {
    logger.warn("Checkout blocked: patient under 18", { patientId, category: input.category })
    return stepFail(UNDER_18_ERROR)
  }

  // 5. Base URL must be a real URL we can build success/cancel paths from.
  const baseUrl = getBaseUrl()
  if (!isValidUrl(baseUrl)) {
    logger.error("Invalid base URL", { baseUrl })
    return stepFail(`Server configuration error. Please contact support at ${CONTACT_EMAIL}`)
  }

  // 6. Per-episode consent attestation. Consent is never implied by signup.
  const hasTermsConsent =
    input.answers.terms_agreed === true || input.answers.agreedToTerms === true
  const hasAccuracyConsent =
    input.answers.accuracy_confirmed === true || input.answers.confirmedAccuracy === true
  if (!hasTermsConsent || !hasAccuracyConsent) {
    logger.warn("Checkout blocked: missing consent fields", {
      patientId,
      hasTermsConsent,
      hasAccuracyConsent,
      category: input.category,
    })
    return stepFail(
      "Please agree to the terms of service and confirm your information is accurate before proceeding.",
    )
  }

  return stepOk({
    patientId,
    patientEmail: authUser.user.email || undefined,
    stripeCustomerId: authUser.profile?.stripe_customer_id || undefined,
    authUserId: authUser.user.id,
    baseUrl,
  })
}
