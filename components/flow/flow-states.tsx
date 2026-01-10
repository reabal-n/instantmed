'use client'

import { motion } from 'framer-motion'
import { 
  AlertTriangle, 
  WifiOff, 
  RefreshCw, 
  Home, 
  ChevronRight,
  Frown,
  Clock,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================
// ERROR STATE
// ============================================

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onGoHome?: () => void
  variant?: 'default' | 'network' | 'notFound' | 'eligibility'
  className?: string
}

export function ErrorState({
  title,
  message,
  onRetry,
  onGoHome,
  variant = 'default',
  className,
}: ErrorStateProps) {
  const variants = {
    default: {
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      defaultTitle: 'Something went wrong',
      defaultMessage: 'We encountered an error. Please try again.',
    },
    network: {
      icon: WifiOff,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      defaultTitle: 'No connection',
      defaultMessage: 'Check your internet and try again.',
    },
    notFound: {
      icon: Frown,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      defaultTitle: 'Not found',
      defaultMessage: 'This page doesn\'t exist or has been moved.',
    },
    eligibility: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      defaultTitle: 'Not eligible',
      defaultMessage: 'Based on your answers, this service may not be right for you.',
    },
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8',
        className
      )}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 200, delay: 0.1 }}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-5',
          config.iconBg
        )}
      >
        <Icon className={cn('w-8 h-8', config.iconColor)} />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {title || config.defaultTitle}
      </h2>

      {/* Message */}
      <p className="text-sm text-slate-500 max-w-xs mb-6">
        {message || config.defaultMessage}
      </p>

      {/* Emergency notice for eligibility */}
      {variant === 'eligibility' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 max-w-sm">
          <p className="text-xs text-amber-800">
            <strong>If this is an emergency:</strong> Call 000 immediately.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="flex-1 h-11"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
        {onGoHome && (
          <Button
            onClick={onGoHome}
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Go home
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>

      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      
      {message && (
        <p className="text-sm text-slate-500 max-w-xs mb-4">{message}</p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          size="sm"
          className="h-9"
        >
          {action.label}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </motion.div>
  )
}

// ============================================
// LOADING STATE
// ============================================

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center p-8',
        className
      )}
    >
      {/* Spinner */}
      <div className="relative w-10 h-10 mb-4">
        <motion.div
          className="absolute inset-0 border-2 border-emerald-200 rounded-full"
        />
        <motion.div
          className="absolute inset-0 border-2 border-emerald-500 rounded-full border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <p className="text-sm text-slate-500">{message}</p>
    </motion.div>
  )
}

// ============================================
// WAITING STATE (for async operations)
// ============================================

interface WaitingStateProps {
  title: string
  message?: string
  showTimer?: boolean
  className?: string
}

export function WaitingState({ 
  title, 
  message, 
  showTimer: _showTimer = false,
  className 
}: WaitingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8',
        className
      )}
    >
      {/* Animated clock */}
      <motion.div
        className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-5"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Clock className="w-7 h-7 text-emerald-600" />
      </motion.div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      
      {message && (
        <p className="text-sm text-slate-500 max-w-xs">{message}</p>
      )}

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-emerald-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ============================================
// SUCCESS STATE
// ============================================

interface SuccessStateProps {
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function SuccessState({
  title,
  message,
  action,
  className,
}: SuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8',
        className
      )}
    >
      {/* Checkmark animation */}
      <motion.div
        className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 200, delay: 0.1 }}
      >
        <motion.svg
          className="w-8 h-8 text-emerald-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M5 12l5 5L20 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          />
        </motion.svg>
      </motion.div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      
      {message && (
        <p className="text-sm text-slate-500 max-w-xs mb-6">{message}</p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          className="h-11 bg-emerald-600 hover:bg-emerald-700"
        >
          {action.label}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </motion.div>
  )
}
