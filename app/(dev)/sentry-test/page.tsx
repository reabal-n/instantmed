"use client"

/**
 * Sentry Test Page - Development Only
 * 
 * Quick verification page for Sentry error capture.
 * Only renders in development mode.
 * 
 * Use this to verify:
 * 1. Client-side errors are captured
 * 2. Server-side errors are captured  
 * 3. Error boundaries work correctly
 */

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Bug, Server, Monitor, CheckCircle } from "lucide-react"

// Only allow in development
const isDev = process.env.NODE_ENV === "development"

export default function SentryTestPage() {
  const [clientEventId, setClientEventId] = useState<string | null>(null)
  const [serverResult, setServerResult] = useState<{ ok: boolean; eventId?: string; error?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Block in production
  if (!isDev) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Available</AlertTitle>
          <AlertDescription>
            This page is only available in development mode.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const triggerClientError = () => {
    const error = new Error("[Sentry Test] Client-side error from dev test page")
    error.name = "SentryDevTestError"
    
    const eventId = Sentry.captureException(error, {
      tags: {
        source: "sentry_test_page",
        type: "client_error",
        environment: "development",
      },
      extra: {
        intentional: true,
        triggered_at: new Date().toISOString(),
      },
    })
    
    setClientEventId(eventId)
    // eslint-disable-next-line no-console
    console.log(`[SENTRY_TEST] Client error captured. Event ID: ${eventId}`)
  }

  const triggerServerError = async () => {
    setIsLoading(true)
    setServerResult(null)
    
    try {
      // Call the boom-500 route (works in PLAYWRIGHT mode)
      // For dev, we'll call edge-canary with capture action
      const response = await fetch("/api/test/edge-canary?action=capture")
      const data = await response.json()
      
      if (data.eventId) {
        setServerResult({ ok: true, eventId: data.eventId })
      } else if (response.status === 404) {
        // PLAYWRIGHT mode not enabled - capture locally instead
        const error = new Error("[Sentry Test] Server-side simulation from dev test page")
        const eventId = Sentry.captureException(error, {
          tags: { source: "sentry_test_page", type: "server_simulation" },
        })
        setServerResult({ ok: true, eventId })
      } else {
        setServerResult({ ok: false, error: data.error || "Unknown error" })
      }
    } catch (err) {
      setServerResult({ ok: false, error: err instanceof Error ? err.message : "Request failed" })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerUnhandledError = () => {
    // This will throw and should be caught by error boundary / Sentry
    throw new Error("[Sentry Test] Unhandled error from dev test page - should trigger error boundary")
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="h-6 w-6" />
          Sentry Test Page
        </h1>
        <p className="text-muted-foreground">
          Verify Sentry error capture is working correctly in development.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Development Only</AlertTitle>
        <AlertDescription>
          This page triggers intentional errors for testing. Check your Sentry dashboard
          at <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="underline">sentry.io</a> to 
          verify errors appear.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {/* Client Error */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Client-Side Error
            </CardTitle>
            <CardDescription>
              Captures an error in the browser and sends to Sentry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={triggerClientError} variant="outline">
              Trigger Client Error
            </Button>
            {clientEventId && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Event ID:</strong> <code className="text-xs">{clientEventId}</code>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Server Error */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Server-Side Error
            </CardTitle>
            <CardDescription>
              Captures an error on the server (via API route or simulation).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={triggerServerError} variant="outline" disabled={isLoading}>
              {isLoading ? "Testing..." : "Trigger Server Error"}
            </Button>
            {serverResult && (
              <Alert className={serverResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                {serverResult.ok ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Event ID:</strong> <code className="text-xs">{serverResult.eventId}</code>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {serverResult.error}
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Unhandled Error */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Unhandled Error (Caution)
            </CardTitle>
            <CardDescription>
              Throws an unhandled error that should trigger the error boundary.
              This will crash the page - you&apos;ll need to navigate back.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={triggerUnhandledError} variant="destructive">
              Trigger Unhandled Error
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="text-xs font-mono space-y-1">
          <p>NODE_ENV: {process.env.NODE_ENV}</p>
          <p>SENTRY_DSN: {process.env.NEXT_PUBLIC_SENTRY_DSN ? "✓ Set" : "✗ Not set"}</p>
        </CardContent>
      </Card>
    </div>
  )
}
