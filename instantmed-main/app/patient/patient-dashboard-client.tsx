"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WelcomeCelebration } from "@/components/shared/welcome-celebration"

interface PatientDashboardClientProps {
  showWelcome: boolean
  firstName: string
}

export function PatientDashboardClient({ showWelcome, firstName }: PatientDashboardClientProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (showWelcome) {
      // Small delay for smoother experience
      const timer = setTimeout(() => {
        setShowCelebration(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showWelcome])

  const handleDismiss = () => {
    setShowCelebration(false)
    // Remove the query param from URL
    router.replace("/patient", { scroll: false })
  }

  if (!showCelebration) return null

  return <WelcomeCelebration firstName={firstName} onDismiss={handleDismiss} />
}
