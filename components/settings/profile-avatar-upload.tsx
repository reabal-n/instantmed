"use client"

import { Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { uploadProfileAvatarAction } from "@/app/actions/profile-avatar"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_AVATAR_BYTES = 1024 * 1024
const ACCEPTED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

interface ProfileAvatarUploadProps {
  userName: string
  avatarUrl?: string | null
  className?: string
  onUploaded?: (avatar: { avatarValue: string; avatarUrl?: string | null }) => void
}

export function ProfileAvatarUpload({
  userName,
  avatarUrl,
  className,
  onUploaded,
}: ProfileAvatarUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState(avatarUrl)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setPreviewUrl(avatarUrl || null)
  }, [avatarUrl])

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image.")
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Keep avatar images under 1MB.")
      return
    }

    const formData = new FormData()
    formData.append("avatar", file)

    setIsUploading(true)
    try {
      const result = await uploadProfileAvatarAction(formData)
      if (!result.success || !result.avatarValue) {
        toast.error(result.error || "Could not upload avatar")
        return
      }

      setPreviewUrl(result.avatarUrl || previewUrl || null)
      onUploaded?.({
        avatarValue: result.avatarValue,
        avatarUrl: result.avatarUrl || null,
      })
      toast.success("Avatar uploaded")
      router.refresh()
    } catch {
      toast.error("Could not upload avatar")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-border/40 bg-white p-4 dark:bg-card", className)}>
      <Avatar src={previewUrl || undefined} name={userName} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Upload photo</p>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. 1MB max.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload avatar image"
        className="sr-only"
        onChange={handleUpload}
      />
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload"}
      </Button>
    </div>
  )
}
