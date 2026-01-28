"use client"

import * as React from "react"
import { User, type UserProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface UserCardProps extends Omit<UserProps, "name" | "description"> {
  /** User's display name */
  name: string
  /** Secondary text (role, email, etc.) */
  description?: string
  /** Avatar image URL */
  avatarUrl?: string
  /** Avatar fallback (initials) */
  avatarFallback?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Additional class name */
  className?: string
}

/**
 * UserCard - HeroUI User component wrapper
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
  size = "md",
  className,
  ...props
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

  // Map size to HeroUI sizes
  const avatarSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "md"

  return (
    <User
      name={name}
      description={description}
      avatarProps={{
        src: avatarUrl,
        name: initials,
        size: avatarSize,
        showFallback: true,
        classNames: {
          base: "bg-gradient-to-br from-primary-400 to-primary-600",
          name: "text-white font-medium",
        },
      }}
      classNames={{
        base: cn("gap-3", className),
        name: size === "sm" ? "text-sm" : size === "lg" ? "text-lg font-semibold" : "text-base font-medium",
        description: size === "sm" ? "text-xs" : "text-sm text-default-500",
      }}
      {...props}
    />
  )
}
