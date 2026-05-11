"use client"

/**
 * Step Error Boundary - Catches and displays errors within step components
 *
 * Provides user-friendly error UI with retry and reset options.
 */

import { AlertTriangle, Home,RefreshCw } from "lucide-react"
import { Component, type ReactNode } from "react"

import { RequestButton } from "./request-button"

/** PostHog client shape injected by the SDK's script tag */
interface PostHogClient {
  capture: (event: string, props: Record<string, unknown>) => void
}

interface WindowWithPostHog {
  posthog?: PostHogClient
}

interface StepErrorBoundaryProps {
  children: ReactNode
  stepId: string
  onRetry?: () => void
  onReset?: () => void
}

interface StepErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class StepErrorBoundary extends Component<
  StepErrorBoundaryProps,
  StepErrorBoundaryState
> {
  constructor(props: StepErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): StepErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const pathname = typeof window !== "undefined" ? window.location.pathname : "unknown"
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          boundary: "request-step",
          route: pathname,
          step_id: this.props.stepId,
        },
        extra: {
          componentStack: errorInfo.componentStack,
        },
      })
    })
    // Log error to monitoring service in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(`Step error in ${this.props.stepId}:`, error)
    }
    
    // Send to PostHog if the client-side SDK is loaded
    if (typeof window !== 'undefined') {
      const ph = (window as unknown as WindowWithPostHog).posthog
      if (ph) {
        ph.capture('step_error', {
          step_id: this.props.stepId,
          route: pathname,
          error_message: error.message,
          error_stack: error.stack,
        })
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4 animate-in fade-in">
          <div role="alert" className="relative rounded-lg border border-danger bg-danger/10 p-3 text-danger">
            <AlertTriangle className="absolute left-3 top-3 h-4 w-4" />
            <h5 className="mb-1 pl-6 font-medium leading-none tracking-tight">
              Something went wrong
            </h5>
            <div className="mt-2 pl-6 text-sm">
              <p className="text-sm mb-4">
                We encountered an issue loading this step. Your progress has been saved.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs bg-destructive/10 p-2 rounded mb-4">
                  <summary className="cursor-pointer font-medium">Technical details</summary>
                  <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <RequestButton
                  size="sm"
                  variant="outline"
                  onClick={this.handleRetry}
                  className="gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try again
                </RequestButton>
                <RequestButton
                  size="sm"
                  variant="ghost"
                  onClick={() => window.location.href = '/'}
                  className="gap-2"
                >
                  <Home className="w-3.5 h-3.5" />
                  Go home
                </RequestButton>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
