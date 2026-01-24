import * as React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-3',
}

export function LoadingSpinner({
  className,
  size = 'md',
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

type LoadingDotsProps = React.HTMLAttributes<HTMLDivElement>

export function LoadingDots({ className, ...props }: LoadingDotsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
      <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
      <div className="size-2 animate-bounce rounded-full bg-primary" />
    </div>
  )
}

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
}

export function LoadingOverlay({
  className,
  message,
  ...props
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  )
}
