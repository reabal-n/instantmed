"use client"

/**
 * Extended Duration Interstitial
 * 
 * Shown when a patient requests a medical certificate for more than 2 days.
 * Explains why a consultation is required and preserves entered data.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  Stethoscope, 
  ArrowRight, 
  CheckCircle,
  Info
} from "lucide-react"

interface ExtendedDurationInterstitialProps {
  /** Data from the current intake to preserve */
  preservedData?: {
    certType?: string
    symptoms?: string[]
    symptomDetails?: string
    startDate?: string
    email?: string
  }
  /** Called when user decides to go back */
  onGoBack?: () => void
  /** Custom class name */
  className?: string
}

export function ExtendedDurationInterstitial({
  preservedData,
  onGoBack,
  className,
}: ExtendedDurationInterstitialProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleContinueToConsult = () => {
    setIsNavigating(true)
    
    // Build query params preserving user data
    const params = new URLSearchParams({
      source: "med_cert",
      reason: "extended_duration",
      intended_duration: "more_than_2_days",
    })
    
    // Preserve entered data
    if (preservedData?.certType) {
      params.set("cert_type", preservedData.certType)
    }
    if (preservedData?.symptoms?.length) {
      params.set("symptoms", preservedData.symptoms.join(","))
    }
    if (preservedData?.symptomDetails) {
      params.set("symptom_details", preservedData.symptomDetails)
    }
    if (preservedData?.startDate) {
      params.set("start_date", preservedData.startDate)
    }
    if (preservedData?.email) {
      params.set("email", preservedData.email)
    }
    
    router.push(`/consult?${params.toString()}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="max-w-md mx-auto space-y-6 p-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title & Explanation */}
        <div className="text-center space-y-3">
          <h2 className="text-xl font-semibold">
            Longer certificates need a quick consult
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Medical certificates for more than 2 days require a brief doctor consultation 
            to ensure we can properly assess your situation.
          </p>
        </div>

        {/* What to expect */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4 text-primary" />
            What to expect
          </div>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>Your details will be transferred automatically</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>A doctor will review your request and may call briefly</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>Certificate issued same day if approved</span>
            </li>
          </ul>
        </div>

        {/* Timing */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Usually completed within 1-2 hours</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleContinueToConsult}
            disabled={isNavigating}
            className="w-full h-12 rounded-xl"
          >
            {isNavigating ? (
              "Transferring..."
            ) : (
              <>
                Continue to consultation
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          
          {onGoBack && (
            <Button
              variant="ghost"
              onClick={onGoBack}
              disabled={isNavigating}
              className="w-full"
            >
              Go back and select 1-2 days
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
