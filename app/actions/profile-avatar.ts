"use server"

import { randomUUID } from "node:crypto"

import { getAvatarPresetUrl } from "@/lib/account/avatar-presets"
import {
  AVATAR_SIGNED_URL_TTL_SECONDS,
  AVATAR_UPLOAD_BUCKET,
  isUploadedAvatarOwnedByAuthUser,
  parseUploadedAvatarPath,
  toUploadedAvatarValue,
} from "@/lib/account/avatar-storage"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { updateProfile } from "@/lib/data/profiles"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("profile-avatar")

const MAX_AVATAR_BYTES = 1024 * 1024
const AVATAR_MIME_EXTENSIONS: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

type ProfileAvatarResult = {
  success: boolean
  avatarValue?: string
  avatarUrl?: string | null
  error?: string
}

function revalidateAvatarSurfaces() {
  // Avatar appears on patient header, doctor identity, and admin doctor
  // identity surfaces.
  revalidatePatient({ account: true, settings: true })
  revalidateStaff({ identity: true })
}

async function removePreviousUploadedAvatar(previousValue: string | null | undefined, authUserId: string) {
  if (!isUploadedAvatarOwnedByAuthUser(previousValue, authUserId)) return
  const previousPath = parseUploadedAvatarPath(previousValue)
  if (!previousPath) return
  const supabase = createServiceRoleClient()
  await supabase.storage.from(AVATAR_UPLOAD_BUCKET).remove([previousPath])
}

export async function uploadProfileAvatarAction(formData: FormData): Promise<ProfileAvatarResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "Sign in before uploading an avatar." }
    }

    const file = formData.get("avatar")
    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "Choose an image first." }
    }

    const extension = AVATAR_MIME_EXTENSIONS[file.type]
    if (!extension) {
      return { success: false, error: "Use a JPG, PNG, or WebP image." }
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return { success: false, error: "Keep avatar images under 1MB." }
    }

    const supabase = createServiceRoleClient()
    const objectPath = `${authUser.user.id}/avatar-${randomUUID()}.${extension}`
    const bytes = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_UPLOAD_BUCKET)
      .upload(objectPath, bytes, {
        cacheControl: "604800",
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      log.error("Avatar upload failed", { profileId: authUser.profile.id }, uploadError)
      return { success: false, error: "Could not upload avatar." }
    }

    const avatarValue = toUploadedAvatarValue(objectPath)
    const updated = await updateProfile(authUser.profile.id, { avatar_url: avatarValue })

    if (!updated) {
      await supabase.storage.from(AVATAR_UPLOAD_BUCKET).remove([objectPath])
      return { success: false, error: "Could not save avatar." }
    }

    await removePreviousUploadedAvatar(authUser.profile.avatar_url, authUser.user.id)

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(AVATAR_UPLOAD_BUCKET)
      .createSignedUrl(objectPath, AVATAR_SIGNED_URL_TTL_SECONDS)

    if (signedUrlError) {
      log.warn("Avatar signed URL creation failed after upload", { profileId: authUser.profile.id })
    }

    revalidateAvatarSurfaces()

    return {
      success: true,
      avatarValue,
      avatarUrl: signedUrlData?.signedUrl ?? null,
    }
  } catch (error) {
    log.error("Avatar upload action failed", {}, error instanceof Error ? error : undefined)
    return { success: false, error: "Could not upload avatar." }
  }
}

export async function setProfileAvatarPresetAction(avatarId: number): Promise<ProfileAvatarResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "Sign in before changing your avatar." }
    }

    const avatarValue = getAvatarPresetUrl(avatarId)
    if (!avatarValue) {
      return { success: false, error: "Choose one of the available avatars." }
    }

    const updated = await updateProfile(authUser.profile.id, { avatar_url: avatarValue })
    if (!updated) {
      return { success: false, error: "Could not save avatar." }
    }

    await removePreviousUploadedAvatar(authUser.profile.avatar_url, authUser.user.id)
    revalidateAvatarSurfaces()

    return {
      success: true,
      avatarValue,
      avatarUrl: avatarValue,
    }
  } catch (error) {
    log.error("Avatar preset action failed", {}, error instanceof Error ? error : undefined)
    return { success: false, error: "Could not save avatar." }
  }
}
