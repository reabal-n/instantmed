/**
 * Form Validation Schemas
 * 
 * Centralized Zod schemas for form validation.
 * Used with react-hook-form via @hookform/resolvers/zod
 */

import { z } from "zod"

// ============================================
// Common Field Schemas
// ============================================

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

export const simplePasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")

export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^(\+61|0)[2-9]\d{8}$|^(\+61|0)4\d{8}$/, "Please enter a valid Australian phone number")

export const australianPostcodeSchema = z
  .string()
  .regex(/^\d{4}$/, "Please enter a valid 4-digit postcode")

export const australianStateSchema = z.enum(
  ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"],
  { error: "Please select a state" }
)

export const dateOfBirthSchema = z
  .string()
  .min(1, "Date of birth is required")
  .refine((date) => {
    const dob = new Date(date)
    const now = new Date()
    const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return age >= 18
  }, "You must be at least 18 years old")
  .refine((date) => {
    const dob = new Date(date)
    const now = new Date()
    const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return age <= 120
  }, "Please enter a valid date of birth")

// ============================================
// Medicare Schemas
// ============================================

export const medicareNumberSchema = z
  .string()
  .min(1, "Medicare number is required")
  .regex(/^\d{10}$/, "Medicare number must be 10 digits")
  .refine((num) => {
    // Medicare checksum validation
    const weights = [1, 3, 7, 9, 1, 3, 7, 9]
    const digits = num.slice(0, 8).split("").map(Number)
    const checkDigit = parseInt(num[8])
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
    return sum % 10 === checkDigit
  }, "Invalid Medicare number")

export const medicareIrnSchema = z
  .number()
  .int()
  .min(1, "IRN must be between 1 and 9")
  .max(9, "IRN must be between 1 and 9")

export const medicareExpirySchema = z
  .string()
  .min(1, "Expiry date is required")
  .refine((date) => {
    const expiry = new Date(date)
    const now = new Date()
    return expiry > now
  }, "Medicare card has expired")

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
})

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: emailSchema,
  password: simplePasswordSchema,
  dateOfBirth: dateOfBirthSchema,
  termsAccepted: z.literal(true, {
    error: "You must accept the terms and conditions",
  }),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// ============================================
// Profile Schemas
// ============================================

export const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
})

export const addressSchema = z.object({
  addressLine1: z.string().min(1, "Street address is required"),
  addressLine2: z.string().optional(),
  suburb: z.string().min(1, "Suburb is required"),
  state: australianStateSchema,
  postcode: australianPostcodeSchema,
})

export const onboardingSchema = z.object({
  phone: phoneSchema,
  addressLine1: z.string().min(1, "Street address is required"),
  suburb: z.string().min(1, "Suburb is required"),
  state: australianStateSchema,
  postcode: australianPostcodeSchema,
  medicareNumber: medicareNumberSchema,
  medicareIrn: medicareIrnSchema,
  medicareExpiry: medicareExpirySchema,
  consentMyhr: z.boolean(),
})

// ============================================
// Contact Form Schema
// ============================================

export const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: emailSchema,
  subject: z.string().min(1, "Please select a subject"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long"),
})

// ============================================
// Medical Request Schemas
// ============================================

export const medCertRequestSchema = z.object({
  reason: z.string().min(10, "Please describe your reason"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  additionalNotes: z.string().optional(),
})

export const prescriptionRequestSchema = z.object({
  medicationName: z.string().min(1, "Medication name is required"),
  dosage: z.string().optional(),
  previouslyPrescribed: z.boolean(),
  reason: z.string().min(10, "Please describe why you need this medication"),
})

// ============================================
// Consult Request Schema
// ============================================

export const consultRequestSchema = z.object({
  reason: z.enum([
    "new_medication",
    "dose_change",
    "complex_condition",
    "second_opinion",
    "referral",
    "other",
  ], { error: "Please select a reason for your consultation" }),
  details: z.string().min(20, "Please provide at least 20 characters describing your concern"),
  symptoms: z.string().optional(),
  duration: z.string().optional(),
  safetyAnswers: z.object({
    rf_chest_pain: z.boolean().optional(),
    rf_suicidal: z.boolean().optional(),
    rf_emergency: z.boolean().optional(),
  }).optional(),
})

/**
 * Validate consult request answers
 * Returns validation result with error message if invalid
 */
export function validateConsultPayload(
  answers: Record<string, unknown>
): { valid: boolean; error?: string } {
  const result = consultRequestSchema.safeParse(answers)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return { valid: false, error: firstError?.message || "Invalid consultation request" }
  }
  
  // Check for red-flag knockouts
  const safetyAnswers = answers.safetyAnswers as Record<string, boolean> | undefined
  if (safetyAnswers) {
    if (safetyAnswers.rf_chest_pain === true) {
      return { valid: false, error: "Please seek immediate medical attention. Call 000 if experiencing chest pain." }
    }
    if (safetyAnswers.rf_suicidal === true) {
      return { valid: false, error: "Please contact Lifeline (13 11 14) or go to your nearest emergency department." }
    }
    if (safetyAnswers.rf_emergency === true) {
      return { valid: false, error: "For medical emergencies, please call 000 or visit your nearest emergency department." }
    }
  }
  
  return { valid: true }
}

// ============================================
// Type Exports
// ============================================

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
export type AddressFormData = z.infer<typeof addressSchema>
export type OnboardingFormData = z.infer<typeof onboardingSchema>
export type ContactFormData = z.infer<typeof contactSchema>
export type MedCertRequestFormData = z.infer<typeof medCertRequestSchema>
export type PrescriptionRequestFormData = z.infer<typeof prescriptionRequestSchema>
