"use client"

import { Gift } from "lucide-react"
import Link from "next/link"

interface ReferralStripProps {
  /** Context text, e.g. "who needs their medication renewed" */
  contextText: string
}

export function ReferralStrip({ contextText }: ReferralStripProps) {
  return (
    <div className="py-6 border-t border-border/30 dark:border-white/10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-muted-foreground">
          <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" aria-hidden="true" />
          Know someone {contextText}?{" "}
          <Link href="/patient" className="text-primary hover:underline font-medium">
            Refer a friend
          </Link>
          {" "}- you both get $5 off.
        </p>
      </div>
    </div>
  )
}
