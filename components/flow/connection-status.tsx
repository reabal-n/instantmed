'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  className?: string
}

/**
 * Connection status indicator for flows
 * Shows offline warning and pending sync count
 */
export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { isOnline, pendingCount, isSyncing } = useConnectionStatus()

  // Only show when offline or has pending actions
  const shouldShow = !isOnline || pendingCount > 0

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
            isOnline
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700',
            className
          )}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline - changes saved locally</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing {pendingCount} changes...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <Cloud className="w-3.5 h-3.5" />
              <span>{pendingCount} pending</span>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Compact offline indicator (icon only)
 */
export function OfflineIndicator({ className }: ConnectionStatusProps) {
  const { isOnline } = useConnectionStatus()

  if (isOnline) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'w-6 h-6 rounded-full bg-red-100 flex items-center justify-center',
        className
      )}
      title="You're offline - changes saved locally"
    >
      <CloudOff className="w-3.5 h-3.5 text-red-600" />
    </motion.div>
  )
}
