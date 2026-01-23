'use client'

import { useState, useEffect } from 'react'
import { Zap, User, Clock, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ReturningPatientBannerProps {
  className?: string
}

interface SavedPatientData {
  firstName: string
  lastVisit: string
  lastService: string
  email: string
}

/**
 * Returning patient express lane banner
 * Recognizes returning patients and offers faster checkout
 */
export function ReturningPatientBanner({ className }: ReturningPatientBannerProps) {
  const [patientData, setPatientData] = useState<SavedPatientData | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const saved = localStorage.getItem('instantmed_patient_profile')
        if (saved) {
          const data = JSON.parse(saved)
          // Only show if last visit was within 90 days
          const lastVisitDate = new Date(data.lastVisit)
          const daysSinceVisit = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSinceVisit <= 90) {
            setPatientData(data)
          }
        }
      } catch {
        // Ignore errors reading local storage
      }
    }
    void loadPatientData()
  }, [])

  if (!patientData || isDismissed) {
    return null
  }

  return (
    <div className={cn(
      "bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-6",
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Welcome back, {patientData.firstName}!
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your details are saved from your last visit. Get your {patientData.lastService} even faster.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="sm" className="rounded-full">
                <Link href="/request?express=true">
                  Express checkout
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>~2 min with saved details</span>
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Compact returning patient indicator
 */
export function ReturningPatientIndicator({ firstName, className }: { firstName: string; className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm",
      className
    )}>
      <User className="w-4 h-4" />
      <span>Welcome back, {firstName}</span>
    </div>
  )
}

/**
 * Save patient profile for returning visits
 */
export function savePatientProfile(data: {
  firstName: string
  email: string
  service: string
}) {
  try {
    const profile: SavedPatientData = {
      firstName: data.firstName,
      email: data.email,
      lastVisit: new Date().toISOString(),
      lastService: data.service,
    }
    localStorage.setItem('instantmed_patient_profile', JSON.stringify(profile))
  } catch {
    // Ignore errors writing to local storage
  }
}

/**
 * Clear saved patient profile
 */
export function clearPatientProfile() {
  try {
    localStorage.removeItem('instantmed_patient_profile')
  } catch {
    // Ignore errors
  }
}
