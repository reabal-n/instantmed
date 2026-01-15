"use client"

import { useState, useEffect } from "react"
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

/**
 * Autosave Status Indicator
 * 
 * Shows users when their form data is being saved/has been saved.
 * Provides peace of mind that progress won't be lost.
 */

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline"

interface AutosaveIndicatorProps {
  status: SaveStatus
  lastSaved?: Date | null
  className?: string
  showLabel?: boolean
}

export function AutosaveIndicator({ 
  status, 
  lastSaved, 
  className,
  showLabel = true 
}: AutosaveIndicatorProps) {
  const [displayStatus, setDisplayStatus] = useState(status)

  // Show "saved" briefly after saving completes
  useEffect(() => {
    if (status === "saved") {
      const timer = setTimeout(() => setDisplayStatus("idle"), 2000)
      return () => clearTimeout(timer)
    }
  }, [status])

  // Sync display status with prop
  const effectiveStatus = status === "saved" ? displayStatus : status

  const formatLastSaved = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "just now"
    if (minutes === 1) return "1 min ago"
    if (minutes < 60) return `${minutes} mins ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return "1 hour ago"
    if (hours < 24) return `${hours} hours ago`
    
    return date.toLocaleDateString()
  }

  const config = {
    idle: {
      icon: <Cloud className="w-4 h-4" />,
      label: lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : "Draft",
      color: "text-muted-foreground",
    },
    saving: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: "Saving...",
      color: "text-muted-foreground",
    },
    saved: {
      icon: <Check className="w-4 h-4" />,
      label: "Saved",
      color: "text-green-600 dark:text-green-400",
    },
    error: {
      icon: <CloudOff className="w-4 h-4" />,
      label: "Save failed",
      color: "text-red-600 dark:text-red-400",
    },
    offline: {
      icon: <CloudOff className="w-4 h-4" />,
      label: "Offline - will save when connected",
      color: "text-amber-600 dark:text-amber-400",
    },
  }

  const current = config[effectiveStatus]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayStatus}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={cn(
          "flex items-center gap-1.5 text-xs",
          current.color,
          className
        )}
      >
        {current.icon}
        {showLabel && <span>{current.label}</span>}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Hook to manage autosave status
 */
export function useAutosaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
      setIsOnline(false)
      setStatus("offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    // Check initial state via callback
    if (!navigator.onLine) handleOffline()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const markSaving = () => {
    if (!isOnline) {
      setStatus("offline")
      return
    }
    setStatus("saving")
  }

  const markSaved = () => {
    setStatus("saved")
    setLastSaved(new Date())
  }

  const markError = () => {
    setStatus("error")
  }

  return {
    status: isOnline ? status : "offline",
    lastSaved,
    markSaving,
    markSaved,
    markError,
    isOnline,
  }
}

/**
 * Restore draft banner
 * Shows when autosaved data exists from a previous session
 */
interface RestoreDraftBannerProps {
  lastSaved: Date
  onRestore: () => void
  onDiscard: () => void
  className?: string
}

export function RestoreDraftBanner({
  lastSaved,
  onRestore,
  onDiscard,
  className,
}: RestoreDraftBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const formatDate = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    
    if (hours < 1) return "less than an hour ago"
    if (hours === 1) return "1 hour ago"
    if (hours < 24) return `${hours} hours ago`
    
    const days = Math.floor(hours / 24)
    if (days === 1) return "yesterday"
    if (days < 7) return `${days} days ago`
    
    return date.toLocaleDateString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-4 rounded-xl bg-primary/5 border border-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Continue where you left off?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              You have a draft saved from {formatDate(lastSaved)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onDiscard()
              setIsVisible(false)
            }}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Start fresh
          </button>
          <button
            onClick={() => {
              onRestore()
              setIsVisible(false)
            }}
            className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            Restore draft
          </button>
        </div>
      </div>
    </motion.div>
  )
}
