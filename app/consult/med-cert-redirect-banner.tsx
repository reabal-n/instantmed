'use client'

import { Info } from 'lucide-react'

/**
 * Contextual banner shown when users are redirected from the medical certificate flow
 * because they need more than 2 days off work.
 * 
 * Tone: Informational, not promotional. Explains why they're here without being pushy.
 */
export function MedCertRedirectBanner() {
  return (
    <div className="bg-info-light border-b border-info-border">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-info mt-0.5 shrink-0" />
          <div className="text-sm text-info">
            <p className="font-medium">Looking for extended time off?</p>
            <p className="text-info mt-0.5">
              Absences longer than 2 days are best handled through a doctor consultation. 
              The doctor can assess your situation and provide appropriate documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
