"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error: string | null }> {
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
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
      street_address: null,
      suburb: null,
      state: null,
      postcode: null,
      medicare_number: null,
      medicare_irn: null,
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
      email_notifications: emailNotifications,
      sms_notifications: smsNotifications,
    })
    .eq("auth_user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/patient/settings")
  return { success: true, error: null }
}
