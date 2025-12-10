"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  changePasswordSchema,
  requestPasswordResetSchema,
  notificationPreferencesSchema,
  validateInput,
} from "@/lib/validation/schemas"

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword?: string,
): Promise<{ success: boolean; error: string | null; fieldErrors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateInput(changePasswordSchema, {
    currentPassword,
    newPassword,
    confirmPassword: confirmPassword || newPassword,
  })
  if (!validation.success) {
    return { success: false, error: validation.error, fieldErrors: validation.fieldErrors }
  }

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  // Verify current password by re-authenticating
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return { success: false, error: "Current password is incorrect" }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true, error: null }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  // Validate input
  const validation = validateInput(requestPasswordResetSchema, { email })
  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(validation.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function deleteAccount(): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

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
    .eq("auth_user_id", user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Sign out the user
  await supabase.auth.signOut()

  revalidatePath("/")
  return { success: true, error: null }
}

export async function updateNotificationPreferences(
  emailNotifications: boolean,
  smsNotifications: boolean,
): Promise<{ success: boolean; error: string | null }> {
  // Validate input
  const validation = validateInput(notificationPreferencesSchema, {
    emailNotifications,
    smsNotifications,
  })
  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      email_notifications: validation.data.emailNotifications,
      sms_notifications: validation.data.smsNotifications,
    })
    .eq("auth_user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/patient/settings")
  return { success: true, error: null }
}
