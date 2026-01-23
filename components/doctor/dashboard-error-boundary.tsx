"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { logger } from "@/lib/observability/logger"

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackDescription?: string
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("Dashboard component error", { componentStack: errorInfo.componentStack }, error)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">
                {this.props.fallbackTitle || "Unable to load this section"}
              </CardTitle>
            </div>
            <CardDescription>
              {this.props.fallbackDescription || 
                "Something went wrong. The rest of the dashboard should still work."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={this.handleRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Wrapper for async components that might fail
export function withDashboardErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackTitle?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <DashboardErrorBoundary fallbackTitle={fallbackTitle}>
        <WrappedComponent {...props} />
      </DashboardErrorBoundary>
    )
  }
}
