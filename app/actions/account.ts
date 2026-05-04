"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

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
  const userId = await getAuthUserId()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = createServiceRoleClient()

  // Soft delete - mark profile as deleted
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: "Deleted User",
      phone: null,
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
      medicare_number: null,
      medicare_irn: null,
      medicare_expiry: null,
    })
    .eq("auth_user_id", userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

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

  revalidatePath("/patient/settings")
  return { success: true, error: null }
}
