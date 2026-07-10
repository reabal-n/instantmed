"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { revalidatePatient } from "@/lib/dashboard/revalidate-staff"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("account-actions")

type ClosePatientAccountResult = {
  success: boolean
  error_code: string | null
  closed_at: string | null
}

async function removeClosedAccountAvatars(
  supabase: ReturnType<typeof createServiceRoleClient>,
  authUserId: string,
  profileId: string,
): Promise<void> {
  const { data: avatarObjects, error: listError } = await supabase.storage
    .from("avatars")
    .list(authUserId, { limit: 1000 })

  if (listError) {
    log.warn("Failed to list avatar objects after account closure", {
      profileId,
      code: listError.message,
    })
    return
  }

  const paths = (avatarObjects ?? [])
    .filter((object) => Boolean(object.name))
    .map((object) => `${authUserId}/${object.name}`)
  if (paths.length === 0) return

  const { error: removeError } = await supabase.storage.from("avatars").remove(paths)
  if (removeError) {
    log.warn("Failed to remove avatar objects after account closure", {
      profileId,
      objectCount: paths.length,
      code: removeError.message,
    })
  }
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

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { success: false, error: "Email is required" }
  }

  const redirectTo = `${getAppUrl()}/auth/reset-password`
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
  const { data: closeData, error: closeError } = await supabase
    .rpc("close_patient_account", {
      p_profile_id: authUser.profile.id,
      p_auth_user_id: authUser.user.id,
      p_reason: "self_service",
    })

  if (closeError) {
    log.error("Atomic patient account closure failed", {
      profileId: authUser.profile.id,
      code: closeError.code,
    }, closeError)
    return { success: false, error: "Unable to close your account. Please try again." }
  }

  const closeResult = (Array.isArray(closeData) ? closeData[0] : closeData) as ClosePatientAccountResult | null
  if (!closeResult?.success) {
    if (closeResult?.error_code === "active_intake") {
      return {
        success: false,
        error: "You have an active request. Contact support before closing your account.",
      }
    }

    return {
      success: false,
      error: "Account is already closed or could not be closed",
    }
  }

  try {
    await logAuditEvent({
      action: "account_closed",
      actorId: authUser.profile.id,
      actorType: "patient",
      metadata: {
        account_closed_at: closeResult.closed_at,
        closure_type: "self_service",
        retained_records: true,
      },
    })
  } catch (error) {
    // The database closure is already committed. Preserve the access boundary
    // and surface the observability failure without pretending closure failed.
    log.error("Failed to record account closure audit event", {
      profileId: authUser.profile.id,
    }, error instanceof Error ? error : new Error(String(error)))
  }

  await removeClosedAccountAvatars(supabase, authUser.user.id, authUser.profile.id)

  try {
    const supabaseAuth = await createClient()
    const { error: signOutError } = await supabaseAuth.auth.signOut({ scope: "global" })
    if (signOutError) {
      log.warn("Failed to revoke all refresh sessions after account closure", {
        profileId: authUser.profile.id,
        code: signOutError.code,
      }, signOutError)
    }
  } catch (error) {
    log.warn("Session revocation threw after account closure", {
      profileId: authUser.profile.id,
    }, error instanceof Error ? error : new Error(String(error)))
  }

  revalidatePath("/")
  return { success: true, error: null }
}

export async function updateNotificationPreferences(
  emailNotifications: boolean,
  smsNotifications: boolean,
): Promise<{ success: boolean; error: string | null }> {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser || authUser.profile.role !== "patient") {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("profiles")
    .update({
      email_notifications: emailNotifications,
      sms_notifications: smsNotifications,
    })
    .eq("id", authUser.profile.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePatient({ settings: true })
  return { success: true, error: null }
}
