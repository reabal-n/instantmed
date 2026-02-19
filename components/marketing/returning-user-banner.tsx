'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  getUserData, 
  isReturningUser, 
  isPreviousCustomer,
  getPersonalizedGreeting,
  getSuggestedService,
} from '@/lib/user/returning-user'

interface ReturningUserBannerProps {
  className?: string
  variant?: 'banner' | 'inline' | 'card'
}

const SERVICE_URLS: Record<string, string> = {
  'med-cert': '/request?service=med-cert',
  'repeat-prescription': '/request?service=prescription',
  'general-consult': '/request?service=consult',
}

export function ReturningUserBanner({ className, variant = 'banner' }: ReturningUserBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  
  // Check on client only
  const [userData] = useState(() => {
    if (typeof window === 'undefined') return null
    return getUserData()
  })

  const [returning] = useState(() => {
    if (typeof window === 'undefined') return false
    return isReturningUser()
  })

  const [previousCustomer] = useState(() => {
    if (typeof window === 'undefined') return false
    return isPreviousCustomer()
  })

  if (!returning || isDismissed || !userData) return null

  const greeting = getPersonalizedGreeting()
  const suggestedService = getSuggestedService()

  if (variant === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          className
        )}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span>{greeting || 'Welcome back'}</span>
      </motion.div>
    )
  }

  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'p-4 rounded-xl bg-primary/5 border border-primary/10',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">
              {greeting || 'Welcome back'}
            </p>
            {suggestedService && (
              <p className="text-sm text-muted-foreground mt-1">
                Continue where you left off?
              </p>
            )}
          </div>
          {suggestedService && (
            <Button
              asChild
              size="sm"
              variant="secondary"
            >
              <Link href={SERVICE_URLS[suggestedService.service] || '/'}>
                {suggestedService.name}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </motion.div>
    )
  }

  // Default: banner variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          'relative overflow-hidden bg-linear-to-r from-primary/10 via-primary/5 to-transparent',
          'border-b border-primary/10',
          className
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {greeting || 'Welcome back'}
                  {previousCustomer && ' — thanks for being a customer'}
                </p>
                {suggestedService && (
                  <p className="text-xs text-muted-foreground">
                    Need another {suggestedService.name}?
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {suggestedService && (
                <Button
                  asChild
                  size="sm"
                  variant="default"
                  className="hidden sm:flex"
                >
                  <Link href={SERVICE_URLS[suggestedService.service] || '/'}>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              )}
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Pre-fill form fields with stored user data
 */
export function usePrefilledUserData() {
  const [userData] = useState(() => {
    if (typeof window === 'undefined') return null
    return getUserData()
  })

  return {
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    dateOfBirth: userData?.dateOfBirth || '',
    hasData: !!userData,
  }
}
