"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as Sentry from "@sentry/nextjs"

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "patient-documents" } })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6">
      <AlertTriangle className="h-8 w-8 text-amber-500 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Failed to load documents</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {error.digest && <span className="font-mono text-xs">Ref: {error.digest}</span>}
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}
