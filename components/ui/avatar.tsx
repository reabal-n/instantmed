"use client"

import * as React from "react"
import Image from "next/image"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.ComponentProps<typeof AvatarPrimitive.Root> {
  src?: string
  alt?: string
  fallback?: React.ReactNode
  name?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
}

function Avatar({
  className,
  src,
  alt,
  fallback,
  name,
  size = "md",
  ...props
}: AvatarProps) {
  const initials = name
    ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : null

  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        "ring-2 ring-white/50 dark:ring-white/20",
        "hover:ring-primary/50 hover:shadow-[0_0_20px_rgb(59,130,246,0.3)]",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt || name || ""}
          className="aspect-square h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary/20 to-violet-500/20",
          "text-primary text-sm font-medium"
        )}
      >
        {fallback || initials || <User className="h-4 w-4" />}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

function AvatarImage({
  src,
  alt,
  width = 40,
  height = 40,
  ...props
}: { src?: string; alt?: string; width?: number; height?: number } & Omit<React.ComponentProps<typeof Image>, "src" | "alt">) {
  if (!src) return null
  return <Image src={src} alt={alt || ""} width={width} height={height} {...props} />
}

function AvatarFallback({
  children,
  ...props
}: { children?: React.ReactNode } & React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        "bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary"
      )}
      {...props}
    >
      {children || <User className="h-4 w-4" />}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
