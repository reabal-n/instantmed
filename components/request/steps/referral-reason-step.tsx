"use client"

/**
 * Referral Reason Step - Referral type and reason
 * Stub implementation - to be fully implemented
 */

import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface ReferralReasonStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

export default function ReferralReasonStep({ onNext: _onNext }: ReferralReasonStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Referral details</h2>
        <p className="text-muted-foreground mt-1">
          Tell us what type of referral you need
        </p>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Step implementation pending
      </p>
    </div>
  )
}
