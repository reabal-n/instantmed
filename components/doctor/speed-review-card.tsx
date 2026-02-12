"use client"

/**
 * Speed Review Card Component
 * 
 * P2 DOCTOR_WORKLOAD_AUDIT: Streamlined view for clean cases meeting all criteria:
 * - Eligibility passed ✓
 * - No red flags ✓
 * - Standard duration (1-3 days) ✓
 * - No backdating ✓
 * 
 * Safety Guardrail: Random 10% of "clean" cases require full review (spot-check).
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  ChevronDown, 
  Zap,
  AlertTriangle,
  User,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SpeedReviewCardProps {
  patientName: string
  serviceType: string
  duration?: string
  mainSymptom?: string
  symptomStart?: string
  isCleanCase: boolean
  requiresSpotCheck?: boolean
  onApproveAndNext: () => void
  onExpandFullView: () => void
  className?: string
}

export function SpeedReviewCard({
  patientName,
  serviceType,
  duration,
  mainSymptom,
  symptomStart,
  isCleanCase,
  requiresSpotCheck = false,
  onApproveAndNext,
  onExpandFullView,
  className,
}: SpeedReviewCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // If spot check required, show warning
  if (requiresSpotCheck) {
    return (
      <Card className={cn("border-amber-300 bg-amber-50/50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800">Spot Check Required</span>
            <Badge variant="outline" className="text-xs bg-amber-100 border-amber-300">
              Random 10% Audit
            </Badge>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            This case requires full review as part of quality assurance spot-checking.
          </p>
          <Button onClick={onExpandFullView} className="w-full">
            Open Full Review
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isCleanCase) {
    return null
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
    <Card 
      className={cn(
        "border-emerald-200 bg-emerald-50/30 transition-all",
        isHovered && "shadow-md border-emerald-300",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-emerald-800">Speed Review</span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Clean Case
          </Badge>
        </div>

        {/* Case Summary */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{patientName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{serviceType}</span>
            {duration && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{duration}</span>
              </>
            )}
          </div>
          
          {mainSymptom && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Symptoms:</span>
              <span>{mainSymptom}</span>
            </div>
          )}
          
          {symptomStart && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Started:</span>
              <span>{symptomStart}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={onApproveAndNext}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve & Next
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-700 rounded">⌘A</kbd>
          </Button>
          <Button
            variant="outline"
            onClick={onExpandFullView}
            className="border-emerald-300 hover:bg-emerald-100"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Full View
          </Button>
        </div>

        {/* Checklist Summary */}
        <div className="mt-3 pt-3 border-t border-emerald-200">
          <div className="flex flex-wrap gap-2 text-xs text-emerald-700">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Eligibility
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> No flags
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Standard duration
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> No backdating
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

/**
 * Determines if a case qualifies for speed review
 */
export function isCleanCase(intake: {
  answers?: Record<string, unknown>
  status?: string
  created_at?: string
}): boolean {
  const answers = intake.answers || {}
  
  // Must be paid status
  if (intake.status !== "paid") return false
  
  // No emergency symptoms
  if (answers.emergency_symptoms || answers.has_emergency_symptoms) return false
  
  // No red flags
  if (answers.red_flags_detected) return false
  
  // Standard duration (1-3 days for med certs)
  const duration = answers.duration as string | undefined
  if (duration) {
    const days = parseInt(duration, 10)
    if (isNaN(days) || days > 3) return false
  }
  
  // No backdating (start date not before today)
  const startDate = answers.start_date as string | undefined
  if (startDate) {
    const start = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (start < today) return false
  }
  
  return true
}

/**
 * Determines if this case should be a random spot-check
 * 10% of clean cases require full review
 */
export function requiresSpotCheck(): boolean {
  return Math.random() < 0.1
}
