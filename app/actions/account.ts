"use server"

import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

/**
 * Change password - Clerk handles this via its own UI
 * @deprecated Use Clerk's UserProfile component or Clerk's API directly
 */
export async function changePassword(
  _currentPassword: string,
  _newPassword: string,
): Promise<{ success: boolean; error: string | null }> {
  // Password management is handled by Clerk's UserProfile component
  // Users should use the Clerk UI at /account or click "Manage account" in the UserButton
  return { 
    success: false, 
    error: "Password management is handled by your account settings. Click 'Manage Account' to change your password." 
  }
}

/**
 * Request password reset - Clerk handles this via its own UI
 * @deprecated Use Clerk's SignIn component with forgot password flow
 */
export async function requestPasswordReset(_email: string): Promise<{ success: boolean; error: string | null }> {
  // Password reset is handled by Clerk at /sign-in (click "Forgot password?")
  return { 
    success: true, 
    error: null 
  }
}

export async function deleteAccount(): Promise<{ success: boolean; error: string | null }> {
  const { userId } = await auth()
  
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
    .eq("clerk_user_id", userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Note: Clerk sign-out is handled client-side via ClerkProvider
  // The user will be redirected to sign-in after this

  revalidatePath("/")
  return { success: true, error: null }
}

export async function updateNotificationPreferences(
  emailNotifications: boolean,
  smsNotifications: boolean,
): Promise<{ success: boolean; error: string | null }> {
  const { userId } = await auth()
  
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
    .eq("clerk_user_id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/patient/settings")
  return { success: true, error: null }
}
