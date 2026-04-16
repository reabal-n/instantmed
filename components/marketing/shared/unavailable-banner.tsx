import { AlertCircle } from "lucide-react"

import { CONTACT_EMAIL } from "@/lib/constants"

interface UnavailableBannerProps {
  /** Whether the banner is visible */
  show: boolean
}

export function UnavailableBanner({ show }: UnavailableBannerProps) {
  if (!show) return null

  return (
    <div className="sticky top-0 z-40 mx-4 mt-2 mb-0 rounded-2xl border border-warning-border bg-warning-light px-4 py-3 flex items-center gap-3">
      <AlertCircle className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-warning">
          This service is temporarily unavailable.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-200">
          We&apos;ll be back soon.{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline hover:no-underline"
          >
            Contact us
          </a>{" "}
          if you have questions.
        </p>
      </div>
    </div>
  )
}
