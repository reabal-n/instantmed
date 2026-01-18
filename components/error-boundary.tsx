"use client"

import React, { ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as Sentry from "@sentry/nextjs"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report error to Sentry for production visibility
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
      tags: { boundary: "react-error-boundary" },
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!, this.resetError) || (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="text-center max-w-md">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-6">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <Button onClick={this.resetError} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
