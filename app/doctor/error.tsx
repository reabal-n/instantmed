"use client"
/* eslint-disable no-console -- Error boundary intentionally uses console */

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, LayoutDashboard, Users, MessageCircle, Mail } from "lucide-react"

export default function DoctorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[DoctorError]", error)
    Sentry.captureException(error, {
      tags: { boundary: "doctor" },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Error loading dashboard</h1>
        <p className="text-muted-foreground mb-6">
          The doctor dashboard encountered an error. Patient data is safe.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/doctor/queue">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Queue
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t space-y-3">
          <Link
            href="/doctor/patients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="h-4 w-4" />
            View patients list
          </Link>

          <div className="block">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Contact support
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/60">
            <Mail className="inline h-3 w-3 mr-1" />
            support@instantmed.com.au
          </p>
        </div>
      </div>
    </div>
  )
}
