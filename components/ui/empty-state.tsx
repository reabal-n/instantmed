import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  FileText,
  Inbox,
  Search,
  MessageSquare,
  AlertCircle,
  Plus,
  type LucideIcon,
} from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outline"
          onClick={action.onClick}
          asChild={!!action.href}
        >
          {action.href ? (
            <a href={action.href}>
              <Plus className="w-4 h-4 mr-2" />
              {action.label}
            </a>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {action.label}
            </>
          )}
        </Button>
      )}
    </div>
  )
}

// Pre-built empty states
export function EmptyRequests() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-indigo-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No requests yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Get started with your first consultation. Our doctors are ready to help.
      </p>
      <Button asChild className="rounded-xl btn-premium">
        <a href="/start">
          <Plus className="w-4 h-4 mr-2" />
          Start your first request
        </a>
      </Button>
    </div>
  )
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages"
      description="Messages with your doctor will appear here."
    />
  )
}

export function EmptySearch() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search or filters."
    />
  )
}

export function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-6 animate-bounce-slow">
        <span className="text-4xl">🎉</span>
      </div>
      <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        No requests waiting for review. Take a well-deserved break.
      </p>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
      className="text-destructive"
    />
  )
}
