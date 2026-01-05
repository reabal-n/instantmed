"use client"

import * as React from "react"
import { Avatar as HeroAvatar, AvatarIcon, type AvatarProps as HeroAvatarProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends HeroAvatarProps {
  src?: string
  alt?: string
  fallback?: React.ReactNode
}

function Avatar({
  className,
  src,
  alt,
  fallback,
  ...props
}: AvatarProps) {
  return (
    <HeroAvatar
      src={src}
      alt={alt}
      radius="full"
      className={cn("shrink-0", className)}
      fallback={fallback || <AvatarIcon />}
      {...props}
    />
  )
}

function AvatarImage({
  src,
  alt,
  ...props
}: { src?: string; alt?: string } & React.ComponentProps<"img">) {
  return <img src={src} alt={alt} {...props} />
}

function AvatarFallback({
  children,
  ...props
}: { children?: React.ReactNode } & React.ComponentProps<"div">) {
  return <div {...props}>{children || <AvatarIcon />}</div>
}

export { Avatar, AvatarImage, AvatarFallback }
