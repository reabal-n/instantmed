"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

interface AutoSaveIndicatorProps {
  lastSavedAt: string | null
  hasUnsavedChanges: boolean
}

export function AutoSaveIndicator({ lastSavedAt, hasUnsavedChanges }: AutoSaveIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (lastSavedAt) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSavedAt])

  if (!lastSavedAt && !hasUnsavedChanges) return null

  return (
    <AnimatePresence mode="wait">
      {hasUnsavedChanges ? (
        <motion.div
          key="unsaved"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <CloudOff className="w-3 h-3" />
          <span>Unsaved</span>
        </motion.div>
      ) : showSaved ? (
        <motion.div
          key="saved"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-1.5 text-xs text-emerald-600"
        >
          <Cloud className="w-3 h-3" />
          <span>Saved</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
