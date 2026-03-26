"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function FlowError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, { tags: { boundary: "flow" } })
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 dark:bg-destructive/15">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm text-center">
        We hit a snag loading your request. Please try again.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground/60 font-mono">Ref: {error.digest}</p>}
      <Button onClick={reset} size="sm"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  )
}
