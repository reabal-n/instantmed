"use client"

/**
 * Step Error Boundary - Catches and displays errors within step components
 * 
 * Provides user-friendly error UI with retry and reset options.
 */

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
    // Log error to monitoring service in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(`Step error in ${this.props.stepId}:`, error)
    }
    
    // Could send to PostHog or other error tracking here
    if (typeof window !== 'undefined' && (window as unknown as { posthog?: { capture: (event: string, props: Record<string, unknown>) => void } }).posthog) {
      (window as unknown as { posthog: { capture: (event: string, props: Record<string, unknown>) => void } }).posthog.capture('step_error', {
        step_id: this.props.stepId,
        error_message: error.message,
        error_stack: error.stack,
      })
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
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={this.handleRetry}
                  className="gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try again
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.location.href = '/'}
                  className="gap-2"
                >
                  <Home className="w-3.5 h-3.5" />
                  Go home
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
