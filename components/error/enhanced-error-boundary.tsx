"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("error-boundary")

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  resetKeys?: unknown[]
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

/**
 * Enhanced Error Boundary
 * 
 * Features:
 * - Beautiful error UI with recovery options
 * - Automatic error reporting to Sentry
 * - Expandable error details for debugging
 * - Reset on key changes
 * - Custom fallback support
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log error
    logger.error("React error boundary caught error", {
      error: error.message,
      componentStack: errorInfo.componentStack,
    })

    // Report to Sentry
    Sentry.withScope((scope) => {
      scope.setExtra("componentStack", errorInfo.componentStack)
      Sentry.captureException(error)
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      )
      if (hasKeyChanged) {
        this.reset()
      }
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
  }

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We've been notified and are working on a fix. Try refreshing or go back to safety.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.reset} className="flex-1 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                <Button variant="outline" asChild className="flex-1 gap-2">
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    Go home
                  </Link>
                </Button>
              </div>

              {(this.props.showDetails || process.env.NODE_ENV === "development") && (
                <div className="pt-4 border-t">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    <Bug className="h-4 w-4" />
                    <span>Technical details</span>
                    <ChevronDown
                      className={`h-4 w-4 ml-auto transition-transform ${
                        this.state.showDetails ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {this.state.showDetails && (
                    <div className="mt-3 space-y-2">
                      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <p className="font-mono text-xs text-destructive break-all">
                          {this.state.error?.message}
                        </p>
                      </div>
                      {this.state.errorInfo?.componentStack && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Component stack
                          </summary>
                          <pre className="mt-2 p-2 rounded bg-muted overflow-auto max-h-[200px] text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Functional wrapper for easier use with hooks
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  return function WithErrorBoundary(props: P) {
    return (
      <EnhancedErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </EnhancedErrorBoundary>
    )
  }
}

/**
 * Hook-friendly error boundary using React 18 error handling
 */
export function ErrorBoundaryCard({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    logger.error("Error boundary triggered", { error: error.message, digest: error.digest })
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild className="flex-1 gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
          {error.digest && (
            <p className="text-center text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
