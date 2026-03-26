"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

/**
 * Typing indicator shown in the message area (bouncing dots with optional "still thinking" text).
 * This is the chat-intake-specific version, distinct from the generic one in message-indicators.tsx.
 */
export function ChatTypingIndicator({ showStillThinking = false }: { showStillThinking?: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-start"
    >
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
              animate={prefersReducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
              animate={prefersReducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
              animate={prefersReducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          {showStillThinking && (
            <motion.span
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground ml-1"
            >
              Still thinking...
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Inline typing indicator shown inside the input field when the assistant is responding.
 */
export function InputTypingIndicator() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <motion.span
        className="w-1 h-1 bg-current rounded-full"
        animate={prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-1 h-1 bg-current rounded-full"
        animate={prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span
        className="w-1 h-1 bg-current rounded-full"
        animate={prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  )
}
