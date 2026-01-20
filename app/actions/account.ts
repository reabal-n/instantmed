"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Helper to get the current authenticated user ID from Supabase
 */
async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
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

/**
 * Request password reset - sends reset email via Supabase Auth
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://instantmed.com.au'}/auth/reset-password`,
  })
  
  if (error) {
    // Don't reveal if email exists or not for security
    console.error('[Auth] Password reset request error:', error.message)
  }
  
  // Always return success to prevent email enumeration attacks
  return { success: true, error: null }
}

export async function deleteAccount(): Promise<{ success: boolean; error: string | null }> {
  const userId = await getAuthUserId()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = await createClient()

  // Soft delete - mark profile as deleted
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: "Deleted User",
      phone: null,
      address_line1: null,
      address_line2: null,
      suburb: null,
      state: null,
      postcode: null,
      medicare_number: null,
      medicare_irn: null,
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

  const supabase = await createClient()

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
