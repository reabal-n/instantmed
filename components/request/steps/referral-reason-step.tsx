"use client"

/**
 * Referral Reason Step - Coming Soon
 * Referrals are not yet available in the unified flow
 */

import { FileText, Bell, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface ReferralReasonStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

export default function ReferralReasonStep({ onBack }: ReferralReasonStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Coming soon badge */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Referrals coming soon</h2>
        <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">
          We&apos;re working on making specialist referrals available through InstantMed.
        </p>
      </div>

      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Bell className="w-4 h-4" />
        <AlertDescription className="text-xs">
          In the meantime, you can request a referral through a general consultation. 
          Our doctors can provide referral letters for specialists.
        </AlertDescription>
      </Alert>

      {/* Alternative options */}
      <div className="space-y-3 pt-2">
        <p className="text-sm font-medium text-center">What you can do now:</p>
        <div className="grid gap-2">
          <a 
            href="/request?service=consult"
            className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <p className="font-medium text-sm">Request a consultation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ask a doctor for a referral letter during your consult
            </p>
          </a>
          <a 
            href="/contact"
            className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <p className="font-medium text-sm">Contact us</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Have questions about referrals? We&apos;re here to help
            </p>
          </a>
        </div>
      </div>

      {/* Back button */}
      <Button 
        variant="outline" 
        onClick={onBack} 
        className="w-full h-12 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Go back
      </Button>
    </div>
  )
}
