"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./unified-skeleton"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  /** Placeholder blur data URL */
  blurDataURL?: string
  /** Object fit */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
  /** Loading strategy */
  loading?: "lazy" | "eager"
}

/**
 * OptimizedImage - Next.js Image with loading states
 * 
 * Automatically handles lazy loading, blur placeholders, and loading states
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  priority = false,
  className,
  blurDataURL,
  objectFit = "cover",
  loading = "lazy",
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fill ? "w-full h-full" : `w-[${width}px] h-[${height}px]`,
          className
        )}
      >
        <span className="text-sm">Image failed to load</span>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <Skeleton
          className={cn(
            "absolute inset-0",
            fill ? "w-full h-full" : `w-[${width}px] h-[${height}px]`
          )}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        loading={loading}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          objectFit === "cover" && "object-cover",
          objectFit === "contain" && "object-contain",
          objectFit === "fill" && "object-fill",
          objectFit === "none" && "object-none",
          objectFit === "scale-down" && "object-scale-down"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setError(true)
        }}
      />
    </div>
  )
}

