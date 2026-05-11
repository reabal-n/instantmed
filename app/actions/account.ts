"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import { auth, getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { revalidatePatient } from "@/lib/dashboard/revalidate-staff"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const ACCOUNT_CLOSURE_BLOCKING_STATUSES = [
  "paid",
  "in_review",
  "pending_info",
  "approved",
  "awaiting_script",
  "escalated",
] as const

/**
 * Helper to get the current authenticated user ID
 */
async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (appUrl?.startsWith("http")) {
    return appUrl.replace(/\/$/, "")
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return "http://localhost:3000"
}

function createPasswordResetClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable")
  }
  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Change password - handled by Supabase Auth UI
 */
export async function changePassword(
  _currentPassword: string,
  _newPassword: string,
): Promise<{ success: boolean; error: string | null }> {
  return { 
    success: false, 
    error: "Password management is handled by your account settings." 
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { success: false, error: "Email is required" }
  }

  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`
  const supabase = createPasswordResetClient()
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  })

  if (error) {
    // Don't leak whether the email exists
    return { success: true, error: null }
  }

  return { success: true, error: null }
}

export async function deleteAccount(): Promise<{ success: boolean; error: string | null }> {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    return { success: false, error: "Not authenticated" }
  }

  if (authUser.profile.role !== "patient") {
    return { success: false, error: "Account closure is only available for patient accounts" }
  }

  const rateLimit = await checkServerActionRateLimit(authUser.profile.id, "sensitive")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error ?? "Too many requests. Please wait a moment before trying again." }
  }

  const supabase = createServiceRoleClient()
  const accountClosedAt = new Date().toISOString()

  const { data: activeIntakes, error: activeIntakesError } = await supabase
    .from("intakes")
    .select("id")
    .eq("patient_id", authUser.profile.id)
    .in("status", ACCOUNT_CLOSURE_BLOCKING_STATUSES)
    .limit(1)

  if (activeIntakesError) {
    return { success: false, error: "Unable to check active requests. Please try again." }
  }

  if (activeIntakes && activeIntakes.length > 0) {
    return {
      success: false,
      error: "You have an active request. Contact support before closing your account.",
    }
  }

  // Close patient sign-in access while retaining clinical, payment, and audit records.
  const { data: closedProfile, error: updateError } = await supabase
    .from("profiles")
    .update({
      auth_user_id: null,
      account_closed_at: accountClosedAt,
      account_closure_reason: "self_service",
      email: null,
      full_name: "Closed Account",
      first_name: null,
      last_name: null,
      avatar_url: null,
      date_of_birth: null,
      date_of_birth_encrypted: null,
      phone: null,
      phone_encrypted: null,
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
      medicare_number: null,
      medicare_number_encrypted: null,
      medicare_irn: null,
      medicare_expiry: null,
      phi_encrypted_at: null,
      email_verified: false,
      email_verified_at: null,
      email_bounced: null,
      email_bounced_at: null,
      email_bounce_reason: null,
      email_delivery_failures: 0,
      stripe_customer_id: null,
      parchment_patient_id: null,
      certificate_identity_complete: false,
    })
    .eq("id", authUser.profile.id)
    .eq("auth_user_id", authUser.user.id)
    .is("account_closed_at", null)
    .select("id")
    .maybeSingle()

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  if (!closedProfile) {
    return { success: false, error: "Account is already closed or could not be closed" }
  }

  await logAuditEvent({
    action: "account_closed",
    actorId: authUser.profile.id,
    actorType: "patient",
    metadata: {
      account_closed_at: accountClosedAt,
      closure_type: "self_service",
      retained_records: true,
    },
  })

  revalidatePath("/")
  return { success: true, error: null }
}

export async function updateNotificationPreferences(
  emailNotifications: boolean,
  smsNotifications: boolean,
): Promise<{ success: boolean; error: string | null }> {
  const userId = await getAuthUserId()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("profiles")
    .update({
      email_notifications: emailNotifications,
      sms_notifications: smsNotifications,
    })
    .eq("auth_user_id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePatient({ settings: true })
  return { success: true, error: null }
}
