"use client"

import { AlertTriangle, Home, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { ErrorRefChip } from "@/components/ui/error-ref-chip"
import { CONTACT_EMAIL } from "@/lib/constants"

export default function ContactError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { boundary: "contact" },
        extra: { digest: error.digest },
      })
    })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning-light mb-6">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t load the contact page. You can still reach us directly.
        </p>

        <ErrorRefChip digest={error.digest} />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            <Mail className="inline h-3.5 w-3.5 mr-1.5" />
            Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
