/**
 * Parchment Health API — Type Definitions & Zod Schemas
 *
 * Based on Parchment API v1 documentation:
 * https://docs.parchmenthealth.io/api-reference/introduction
 */

import { z } from "zod"

// ============================================================================
// AUTH
// ============================================================================

export const parchmentTokenResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    accessToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.literal("Bearer"),
    scope: z.array(z.string()),
  }),
  timestamp: z.string(),
  requestId: z.string(),
})

export type ParchmentTokenResponse = z.infer<typeof parchmentTokenResponseSchema>

// ============================================================================
// SSO
// ============================================================================

export const parchmentSsoRequestSchema = z.object({
  redirect_path: z.string(),
})

export const parchmentSsoResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    sso_token: z.string(),
    redirect_url: z.string().url(),
    expires_in: z.number(),
  }),
})

export type ParchmentSsoResponse = z.infer<typeof parchmentSsoResponseSchema>

// ============================================================================
// PATIENTS
// ============================================================================

/** Address sub-object for patient creation */
export const australianAddressSchema = z.object({
  street_number: z.string().optional(),
  street_name: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
})

export const createPatientRequestSchema = z.object({
  // Required
  family_name: z.string().min(1).max(255),
  given_name: z.string().min(1).max(255),
  date_of_birth: z.string(), // YYYY-MM-DD
  sex: z.enum(["M", "F", "N", "I"]),
  partner_patient_id: z.string().min(1).max(150),
  // Optional
  medicare_card_number: z.string().optional(),
  medicare_irn: z.string().optional(),
  medicare_valid_to: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dva_file_number: z.string().optional(),
  dva_card_color: z.enum(["gold", "white", "orange"]).optional(),
  concession_pension_number: z.string().optional(),
  entitlement_number: z.string().optional(),
  racf_id: z.string().optional(),
  ctg_eligible: z.boolean().optional(),
  indigenous_type: z.enum(["aboriginal", "torres_strait_islander", "both", "neither", "not_stated"]).optional(),
  partner_id: z.string().optional(),
  australian_street_address: australianAddressSchema.optional(),
})

export type CreatePatientRequest = z.infer<typeof createPatientRequestSchema>

export const createPatientResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    external_patient_id: z.string(),
    parchment_patient_id: z.string(),
    url: z.string(),
  }),
  timestamp: z.string(),
  requestId: z.string(),
})

export type CreatePatientResponse = z.infer<typeof createPatientResponseSchema>

// ============================================================================
// USERS (Doctors/Prescribers)
// ============================================================================

export const parchmentUserSchema = z.object({
  user_id: z.string(),
  external_user_id: z.string().optional(),
  full_name: z.string(),
  access_roles: z.array(z.string()).optional(),
})

export type ParchmentUser = z.infer<typeof parchmentUserSchema>

export const listUsersResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    users: z.array(parchmentUserSchema),
    pagination: z.object({
      total: z.number(),
      limit: z.number(),
      lastKey: z.string().nullable(),
    }),
  }),
  timestamp: z.string(),
  requestId: z.string(),
})

export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export const parchmentPrescriptionSchema = z.object({
  scid: z.string(),
  patient_id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
}).passthrough() // Allow additional fields from API

export type ParchmentPrescription = z.infer<typeof parchmentPrescriptionSchema>

// ============================================================================
// WEBHOOKS
// ============================================================================

export const webhookPayloadSchema = z.object({
  event_type: z.string(),
  event_id: z.string(),
  timestamp: z.string(),
  partner_id: z.string(),
  organization_id: z.string(),
  data: z.object({
    patient_id: z.string(),
    partner_patient_id: z.string(),
    user_id: z.string(),
    scid: z.string(),
  }),
})

export type ParchmentWebhookPayload = z.infer<typeof webhookPayloadSchema>

// ============================================================================
// ERROR RESPONSE
// ============================================================================

export const parchmentErrorSchema = z.object({
  success: z.literal(false),
  statusCode: z.number(),
  error: z.object({
    type: z.string().optional(),
    title: z.string().optional(),
    detail: z.string().optional(),
    validation: z.array(z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
    })).optional(),
  }),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
})

export type ParchmentError = z.infer<typeof parchmentErrorSchema>

// ============================================================================
// API SCOPES
// ============================================================================

export const PARCHMENT_SCOPES = {
  CREATE_PATIENT: "create:patient",
  READ_PATIENT: "read:patient",
  UPDATE_PATIENT: "update:patient",
  READ_PATIENT_PRESCRIPTION: "read:patient_prescription",
  CREATE_USER: "create:user",
  READ_USER: "read:user",
  READ_USERS: "read:users",
  UPDATE_USER: "update:user",
  DELETE_USER: "delete:user",
} as const
