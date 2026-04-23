"use client"

import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { ErrorRefChip } from "@/components/ui/error-ref-chip"

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "patient-notifications" } })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6">
      <AlertTriangle className="h-8 w-8 text-warning mb-4" />
      <h2 className="text-lg font-semibold mb-2">Failed to load notifications</h2>
      <ErrorRefChip digest={error.digest} />
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}
