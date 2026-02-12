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
    <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Looking for extended time off?</p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              Absences longer than 2 days are best handled through a doctor consultation. 
              The doctor can assess your situation and provide appropriate documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
