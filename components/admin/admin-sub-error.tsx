"use client"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function AdminSubError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, { tags: { boundary: "admin-sub" } })
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-destructive-light">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm text-center">
        This section encountered an error. Try refreshing or return to the admin dashboard.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground/60 font-mono">Ref: {error.digest}</p>}
      <Button onClick={reset} size="sm"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  )
}
