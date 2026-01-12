"use client"

import React from 'react'
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Zap } from "lucide-react"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  color?: "primary" | "white" | "muted"
  className?: string
}

const sizeMap = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
}

const colorMap = {
  primary: "bg-primary",
  white: "bg-white",
  muted: "bg-muted-foreground",
}

export function Loader({ size = "md", color = "primary", className }: LoaderProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={cn("rounded-full", sizeMap[size], colorMap[color])}
          initial={{ x: 0 }}
          animate={{
            x: [0, 6, 0],
            opacity: [0.4, 1, 0.4],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

export function LoaderWithText({ 
  text = "Loading...", 
  size = "md", 
  color = "primary",
  className 
}: LoaderProps & { text?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader size={size} color={color} />
      <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
    </div>
  )
}

// =============================================================================
// PREMIUM BRANDED LOADER - With InstantMed logo animation
// =============================================================================

export function PremiumLoader({ 
  text = "Loading...",
  showBranding = true,
  className 
}: { text?: string; showBranding?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      {/* Animated logo */}
      <motion.div 
        className="relative"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl"
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [0.8, 1.2, 0.8] 
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Logo container */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/25">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="h-8 w-8 text-white" />
          </motion.div>
        </div>
      </motion.div>
      
      {/* Text with animated dots */}
      <div className="flex flex-col items-center gap-2">
        {showBranding && (
          <motion.span
            className="text-lg font-semibold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            InstantMed
          </motion.span>
        )}
        <motion.p 
          className="text-sm text-muted-foreground flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {text}
          <span className="flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </span>
        </motion.p>
      </div>
    </div>
  )
}

// =============================================================================
// SKELETON LOADER - For content placeholders
// =============================================================================

interface SkeletonProps {
  className?: string
  animated?: boolean
}

export function Skeleton({ className, animated = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/50",
        animated && "animate-pulse",
        className
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function RequestListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function FullPageLoader({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <PremiumLoader text={text} />
    </div>
  )
}

export default Loader
