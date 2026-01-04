"use client"

import { motion } from "framer-motion"
import { cn } from '@/lib/utils'
import { Button } from '@/components/uix'
import {
  FileText,
  Inbox,
  Search,
  MessageSquare,
  AlertCircle,
  Plus,
  RefreshCw,
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
  /** Enable floating animation */
  animate?: boolean
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  animate = true,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-5 shadow-lg"
        animate={animate ? { 
          y: [0, -6, 0],
        } : undefined}
        transition={animate ? { 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        } : undefined}
      >
        <Icon className="w-8 h-8 text-muted-foreground" />
      </motion.div>
      <motion.h3 
        className="text-lg font-semibold mb-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p 
          className="text-sm text-muted-foreground max-w-sm mb-5 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            onClick={action.onClick}
            asChild={!!action.href}
            className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
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
        </motion.div>
      )}
    </motion.div>
  )
}

// Pre-built empty states with enhanced animations
export function EmptyRequests() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center mb-6 shadow-xl"
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <FileText className="w-12 h-12 text-indigo-500" />
      </motion.div>
      <motion.h3 
        className="text-xl font-semibold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        No requests yet
      </motion.h3>
      <motion.p 
        className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Get started with your first consultation. Our doctors are ready to help.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button asChild className="rounded-xl btn-premium shadow-lg hover:shadow-xl transition-shadow">
          <a href="/start">
            <Plus className="w-4 h-4 mr-2" />
            Start your first request
          </a>
        </Button>
      </motion.div>
    </motion.div>
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
    <motion.div 
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-6 shadow-xl"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <span className="text-5xl">🎉</span>
      </motion.div>
      <motion.h3 
        className="text-xl font-semibold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        All caught up!
      </motion.h3>
      <motion.p 
        className="text-sm text-muted-foreground max-w-sm leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        No requests waiting for review. Take a well-deserved break.
      </motion.p>
    </motion.div>
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
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div 
        className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5"
        animate={{ 
          x: [0, -3, 3, -3, 0],
        }}
        transition={{ 
          duration: 0.5, 
          delay: 0.2,
        }}
      >
        <AlertCircle className="w-8 h-8 text-destructive" />
      </motion.div>
      <h3 className="text-lg font-semibold text-destructive mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="rounded-xl">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </motion.div>
  )
}
