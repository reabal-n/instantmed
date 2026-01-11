"use client"
/* eslint-disable no-console -- Error boundary intentionally uses console */

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, LogIn, Home } from "lucide-react"

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[AuthError]", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-linear-to-b from-background to-muted/30">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dawn-500/10 mb-6">
          <AlertTriangle className="h-8 w-8 text-dawn-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-muted-foreground mb-6">
          We had trouble signing you in. Please try again or use a different method.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/auth/login">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            Return home
          </Link>
        </div>
      </div>
    </div>
  )
}
