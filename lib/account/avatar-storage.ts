import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const AVATAR_UPLOAD_BUCKET = "avatars"
export const AVATAR_UPLOAD_VALUE_PREFIX = "avatar:"
export const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7

export function toUploadedAvatarValue(path: string): string {
  return `${AVATAR_UPLOAD_VALUE_PREFIX}${path}`
}

export function parseUploadedAvatarPath(value: string | null | undefined): string | null {
  if (!value?.startsWith(AVATAR_UPLOAD_VALUE_PREFIX)) return null
  const path = value.slice(AVATAR_UPLOAD_VALUE_PREFIX.length)
  return path.length > 0 ? path : null
}

export function isUploadedAvatarOwnedByAuthUser(value: string | null | undefined, authUserId: string): boolean {
  const path = parseUploadedAvatarPath(value)
  return Boolean(path?.startsWith(`${authUserId}/`))
}

export async function resolveProfileAvatarUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null

  const uploadedPath = parseUploadedAvatarPath(value)
  if (!uploadedPath) return value

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.storage
    .from(AVATAR_UPLOAD_BUCKET)
    .createSignedUrl(uploadedPath, AVATAR_SIGNED_URL_TTL_SECONDS)

  if (error) return null
  return data.signedUrl
}
