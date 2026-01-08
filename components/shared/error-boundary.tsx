"use client"

import type React from "react"

import { Component, type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home, Copy, Check, MessageSquare, ChevronDown } from "lucide-react"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** Optional error reporting callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Show technical details option */
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

/**
 * Report error to backend for monitoring
 */
async function reportError(error: Error, errorInfo: React.ErrorInfo): Promise<void> {
  try {
    // In production, send to error tracking service (e.g., Sentry, LogRocket)
    const _errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.group("🚨 Error Report")
      // eslint-disable-next-line no-console
      console.error("Error:", error)
      // eslint-disable-next-line no-console
      console.error("Component Stack:", errorInfo.componentStack)
      // eslint-disable-next-line no-console
      console.groupEnd()
    }

    // In production, send to your error tracking endpoint
    // await fetch("/api/errors", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(errorReport),
    // })
  } catch {
    // Silently fail error reporting
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Report error
    reportError(error, errorInfo)
    
    // Call optional callback
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  errorInfo?: React.ErrorInfo
  onRetry: () => void
  showDetails?: boolean
}

function ErrorFallback({ error, errorInfo, onRetry, showDetails = true }: ErrorFallbackProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyErrorDetails = async () => {
    const details = `
Error: ${error?.message || "Unknown error"}
Stack: ${error?.stack || "No stack trace"}
Component Stack: ${errorInfo?.componentStack || "No component stack"}
URL: ${typeof window !== "undefined" ? window.location.href : "N/A"}
Time: ${new Date().toISOString()}
    `.trim()

    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers - not much we can do
      void details
    }
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        We encountered an unexpected error. Please try refreshing the page or contact support if the problem
        persists.
      </p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={onRetry} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button asChild className="rounded-xl">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/contact">
            <MessageSquare className="mr-2 h-4 w-4" />
            Contact Support
          </Link>
        </Button>
      </div>

      {/* Technical Details (collapsible) */}
      {showDetails && error && (
        <div className="mt-8 w-full max-w-lg">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
            Technical details
          </button>
          
          {detailsOpen && (
            <div className="mt-4 p-4 rounded-xl bg-muted/50 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Error Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyErrorDetails}
                  className="h-7 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-40 p-2 bg-background rounded-lg">
                {error.message}
                {error.stack && (
                  <>
                    {"\n\n"}
                    {error.stack.split("\n").slice(1, 5).join("\n")}
                  </>
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Minimal error boundary for small components
 */
export class MinimalErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>Failed to load this section</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-primary hover:underline mt-1"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
