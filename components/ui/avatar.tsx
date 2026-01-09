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
      className={cn(
        "shrink-0",
        "ring-2 ring-white/50 dark:ring-white/20",
        "hover:ring-primary/50 hover:shadow-[0_0_20px_rgb(59,130,246,0.3)]",
        "transition-all duration-300",
        className
      )}
      fallback={fallback || <AvatarIcon />}
      classNames={{
        base: "bg-gradient-to-br from-primary/20 to-violet-500/20",
        fallback: "text-primary",
      }}
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
