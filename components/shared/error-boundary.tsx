"use client"

import type React from "react"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
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
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => this.setState({ hasError: false })} className="rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button asChild className="rounded-xl">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
