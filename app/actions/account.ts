"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { auth } from "@/lib/auth/helpers"
import { revalidatePath } from "next/cache"

/**
 * Helper to get the current authenticated user ID
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
 * Request password reset via Supabase Auth magic link
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  if (!email) {
    return { success: false, error: "Email is required" }
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
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
