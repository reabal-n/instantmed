"use client"

import { Cloud, CloudOff } from "lucide-react"
import { useEffect, useState } from "react"

interface AutoSaveIndicatorProps {
  lastSavedAt: string | null
  hasUnsavedChanges: boolean
}

export function AutoSaveIndicator({ lastSavedAt, hasUnsavedChanges }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (lastSavedAt) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSavedAt])

  if (!lastSavedAt && !hasUnsavedChanges) return null
  if (!hasUnsavedChanges && !showSaved) return null

  return (
    <div
      className={
        hasUnsavedChanges
          ? "flex items-center gap-1.5 text-xs text-muted-foreground"
          : "flex items-center gap-1.5 text-xs text-success"
      }
    >
      {hasUnsavedChanges ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
      <span>{hasUnsavedChanges ? "Unsaved" : "Saved"}</span>
    </div>
  )
}
