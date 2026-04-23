"use client"

import { AlertTriangle, Home,RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRef,useState } from "react"

import { Button } from "@/components/ui/button"
import { ErrorRefChip } from "@/components/ui/error-ref-chip"

export default function GuideError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCount = useRef(0)
  const maxRetries = 3

  const handleRetry = async () => {
    if (retryCount.current >= maxRetries) return
    retryCount.current += 1
    setIsRetrying(true)
    try {
      reset()
    } finally {
      setTimeout(() => setIsRetrying(false), 1000)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 dark:bg-destructive/15 mb-6" aria-hidden="true">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">Error loading guide</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong loading this guide. Please try again.
        </p>

        <ErrorRefChip digest={error.digest} />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || retryCount.current >= maxRetries}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Retrying..." : retryCount.current >= maxRetries ? "Please try again later" : "Try again"}
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
