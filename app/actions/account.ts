"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * Helper to get the current authenticated Clerk user ID
 */
async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
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
 * Request password reset - now handled by Clerk
 * Users should use the Clerk Account Portal for password management
 */
export async function requestPasswordReset(_email: string): Promise<{ success: boolean; error: string | null }> {
  // Password reset is handled by Clerk Account Portal
  // Redirect users to: https://accounts.instantmed.com.au/user
  return { 
    success: false, 
    error: "Password reset is managed through your account settings. Please visit the account portal." 
  }
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
      address_line2: null,
      suburb: null,
      state: null,
      postcode: null,
      medicare_number: null,
      medicare_irn: null,
    })
    .eq("clerk_user_id", userId)

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
    .eq("clerk_user_id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/patient/settings")
  return { success: true, error: null }
}
