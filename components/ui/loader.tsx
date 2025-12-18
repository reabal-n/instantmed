"use client"

import React from 'react'
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

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

export function FullPageLoader({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <LoaderWithText text={text} size="lg" />
    </div>
  )
}

export default Loader
