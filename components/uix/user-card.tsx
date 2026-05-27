"use client"

import * as React from "react"

import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface UserCardProps {
  /** User's display name */
  name: string
  /** Secondary text (role, email, etc.) */
  description?: string
  /** Avatar image URL */
  avatarUrl?: string
  /** Avatar fallback (initials) */
  avatarFallback?: string
  /** Optional plain-text query to mark inside the display name */
  highlight?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Additional class name */
  className?: string
}

/**
 * UserCard - User display component with avatar, name, and description
 *
 * Displays user information with avatar, name, and description.
 * Automatically generates initials if no avatar is provided.
 *
 * @example
 * ```tsx
 * <UserCard
 *   name="Dr. Sarah Smith"
 *   description="General Practitioner"
 *   avatarUrl="/avatars/sarah.jpg"
 * />
 * ```
 */
export function UserCard({
  name,
  description,
  avatarUrl,
  avatarFallback,
  highlight,
  size = "md",
  className,
}: UserCardProps) {
  // Generate initials from name if no fallback provided
  const initials = React.useMemo(() => {
    if (avatarFallback) return avatarFallback
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [name, avatarFallback])

  const avatarSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "md"
  const highlightQuery = highlight?.trim()
  const highlightedName = React.useMemo(() => {
    if (!highlightQuery) return name

    const index = name.toLowerCase().indexOf(highlightQuery.toLowerCase())
    if (index < 0) return name

    const before = name.slice(0, index)
    const match = name.slice(index, index + highlightQuery.length)
    const after = name.slice(index + highlightQuery.length)

    return (
      <>
        {before}
        <mark className="rounded-sm bg-warning-light px-0.5 text-foreground ring-1 ring-warning-border/70">
          {match}
        </mark>
        {after}
      </>
    )
  }, [highlightQuery, name])

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar
        src={avatarUrl}
        name={name}
        fallback={<span className="text-white font-medium">{initials}</span>}
        size={avatarSize}
        className="bg-gradient-to-br from-primary-400 to-primary-600"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate",
            size === "sm" && "text-sm",
            size === "md" && "text-base font-medium",
            size === "lg" && "text-lg font-semibold"
          )}
        >
          {highlightedName}
        </p>
        {description && (
          <p
            className={cn(
              "truncate text-slate-700 dark:text-muted-foreground",
              size === "sm" ? "text-[13px] leading-4" : "text-sm"
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
