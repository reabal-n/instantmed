/**
 * Centralized Zod schemas for server action validation
 * All server actions should validate input using these schemas
 */

import { z } from "zod"

// =====================================================
// Common Validators
// =====================================================

export const uuidSchema = z.string().uuid("Invalid ID format")

export const emailSchema = z.string().email("Please enter a valid email address").toLowerCase().trim()

export const phoneSchema = z
  .string()
  .min(8, "Phone number must be at least 8 digits")
  .max(15, "Phone number is too long")
  .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number")

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

export const australianStateSchema = z.enum(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"], {
  errorMap: () => ({ message: "Please select a valid Australian state" }),
})

export const postcodeSchema = z
  .string()
  .length(4, "Postcode must be 4 digits")
  .regex(/^\d{4}$/, "Please enter a valid Australian postcode")

// =====================================================
// Medicare Validation
// =====================================================

export const medicareNumberSchema = z
  .string()
  .transform((val) => val.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .length(10, "Medicare number must be 10 digits")
      .regex(/^\d{10}$/, "Medicare number must contain only digits")
      .refine(
        (val) => {
          const firstDigit = parseInt(val[0], 10)
          return firstDigit >= 2 && firstDigit <= 6
        },
        { message: "Invalid Medicare number format" }
      )
      .refine(
        (val) => {
          // Test numbers bypass checksum
          const testNumbers = ["1111111111", "2222222222", "3333333333", "1234567890", "0000000000"]
          if (testNumbers.includes(val)) return true

          // Medicare checksum validation
          const weights = [1, 3, 7, 9, 1, 3, 7, 9]
          let sum = 0
          for (let i = 0; i < 8; i++) {
            sum += parseInt(val[i], 10) * weights[i]
          }
          const checkDigit = sum % 10
          return checkDigit === parseInt(val[8], 10)
        },
        { message: "Invalid Medicare number - please check and try again" }
      )
  )

export const medicareIrnSchema = z
  .number()
  .int()
  .min(1, "IRN must be between 1 and 9")
  .max(9, "IRN must be between 1 and 9")

export const medicareExpirySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Please enter expiry in YYYY-MM format")
  .refine(
    (val) => {
      const [year, month] = val.split("-").map(Number)
      const expiry = new Date(year, month, 0) // Last day of expiry month
      return expiry >= new Date()
    },
    { message: "Medicare card has expired - please update your details" }
  )

// =====================================================
// Onboarding Schema
// =====================================================

export const onboardingSchema = z.object({
  profileId: uuidSchema,
  data: z.object({
    phone: phoneSchema,
    address_line1: z.string().min(1, "Please enter your street address").max(200),
    suburb: z.string().min(1, "Please enter your suburb").max(100),
    state: australianStateSchema,
    postcode: postcodeSchema,
    medicare_number: medicareNumberSchema,
    medicare_irn: medicareIrnSchema,
    medicare_expiry: medicareExpirySchema,
    consent_myhr: z.boolean(),
  }),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>

// =====================================================
// Account Actions Schemas
// =====================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  })

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
})

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
})

// =====================================================
// Medical Request Schemas
// =====================================================

export const requestCategorySchema = z.enum(["medical_certificate", "prescription", "referral", "other"])
export const requestSubtypeSchema = z.string().min(1).max(50)
export const requestTypeSchema = z.enum([
  "script",
  "med_cert",
  "referral",
  "hair_loss",
  "acne",
  "ed",
  "hsv",
  "bv_partner",
])

export const createRequestSchema = z.object({
  patientId: uuidSchema,
  type: requestTypeSchema,
  answers: z.record(z.unknown()),
})

export const createMedCertRequestSchema = z.object({
  patientId: uuidSchema,
  category: requestCategorySchema,
  subtype: requestSubtypeSchema,
  answers: z.record(z.unknown()).refine(
    (answers) => {
      // Ensure required fields are present
      return answers.symptoms || answers.reason
    },
    { message: "Please provide details about your condition" }
  ),
})

// =====================================================
// Helper Functions
// =====================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Validate input with a Zod schema and return a consistent result
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const fieldErrors: Record<string, string[]> = {}
  result.error.errors.forEach((err) => {
    const path = err.path.join(".")
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(err.message)
  })

  // Get the first error message for a simple error string
  const firstError = result.error.errors[0]?.message || "Validation failed"

  return { success: false, error: firstError, fieldErrors }
}
