'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/observability/logger'
import Link from 'next/link'

interface FlowErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface FlowErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary specifically for intake flows
 * Provides graceful degradation with recovery options
 */
export class FlowErrorBoundary extends Component<FlowErrorBoundaryProps, FlowErrorBoundaryState> {
  constructor(props: FlowErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FlowErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    logger.error('Flow error boundary caught error', { error: error.message, stack: error.stack, componentStack: errorInfo.componentStack })
    
    // Track in PostHog if available
    if (typeof window !== 'undefined') {
      const ph = (window as unknown as { posthog?: { capture: (event: string, props: Record<string, unknown>) => void } }).posthog
      ph?.capture('flow_error_boundary_triggered', {
        error_message: error.message,
        error_stack: error.stack,
        component_stack: errorInfo.componentStack,
      })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We hit an unexpected issue. Your progress has been saved automatically.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
              
              <Button asChild>
                <Link href="/" className="gap-2">
                  <Home className="w-4 h-4" />
                  Go home
                </Link>
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <summary className="text-xs font-medium text-slate-500 cursor-pointer">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
