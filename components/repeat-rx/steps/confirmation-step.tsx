"use client"

/**
 * Confirmation Step - Repeat Prescription Intake
 * 
 * Success confirmation after payment.
 * ~80 lines - well under 200 line limit.
 */

import { CheckCircle, Clock, Mail } from "lucide-react"
import { StepHeader } from "../shared"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ConfirmationStepProps {
  referenceNumber?: string
  email?: string
}

export function ConfirmationStep({ referenceNumber, email }: ConfirmationStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title="Request submitted!"
        subtitle="A doctor will review your request shortly"
        emoji="🎉"
      />

      {/* Success indicator */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
      </div>

      {/* Reference number */}
      {referenceNumber && (
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground mb-1">Reference number</p>
          <p className="font-mono font-bold text-lg">{referenceNumber}</p>
        </div>
      )}

      {/* What happens next */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">What happens next?</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 text-sm">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>A doctor will review your request within 1-2 hours</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              You&apos;ll receive an SMS with your eScript
              {email && ` and email confirmation at ${email}`}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button asChild className="w-full">
          <Link href="/account">View my requests</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  )
}
