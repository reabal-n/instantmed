"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useChatIntakeContext } from "@/components/chat/chat-intake-context"

export function ChatRedirectOverlay() {
  const { isRedirecting } = useChatIntakeContext()
  const prefersReducedMotion = useReducedMotion()

  if (!isRedirecting) return null

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Taking you to the form…</p>
        <p className="text-xs text-muted-foreground">Your answers have been saved</p>
      </div>
    </motion.div>
  )
}
