"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  selectContextualMessage,
  type ContextualMessageService,
} from "@/lib/marketing/contextual-messages"

interface ContextualMessageProps {
  service: ContextualMessageService
  className?: string
}

export function ContextualMessage({ service, className }: ContextualMessageProps) {
  const [message, setMessage] = useState<string | null>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    setMessage(selectContextualMessage(service))
  }, [service])

  if (!message) return null

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={message}
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className={className ?? "text-sm text-muted-foreground"}
      >
        {message}
      </motion.p>
    </AnimatePresence>
  )
}
