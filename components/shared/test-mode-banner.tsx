"use client"

import { useEffect, useState } from "react"
import { getIsTestMode } from "@/lib/test-mode"
import { AlertTriangle } from "lucide-react"

export function TestModeBanner() {
  const [showBanner, setShowBanner] = useState(() => (typeof window !== "undefined" ? getIsTestMode() : false))

  useEffect(() => {
    // Listen for changes
    const handleChange = () => setShowBanner(getIsTestMode())
    window.addEventListener("test-mode-changed", handleChange)
    window.addEventListener("storage", handleChange)

    return () => {
      window.removeEventListener("test-mode-changed", handleChange)
      window.removeEventListener("storage", handleChange)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-100 bg-amber-500 text-amber-950 text-center py-1.5 px-4 text-xs font-medium">
      <AlertTriangle className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" />
      Test mode — using dummy Medicare and payment data. Not for real patients.
    </div>
  )
}
