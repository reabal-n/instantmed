"use client"

/**
 * Connection Status Banner
 * 
 * Shows offline/online status and pending sync count.
 * Appears at top of request flow when offline.
 */

import { motion, AnimatePresence } from "framer-motion"
import { WifiOff, CloudOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConnectionStatus } from "@/hooks/use-connection-status"

interface ConnectionBannerProps {
  className?: string
}

export function ConnectionBanner({ className }: ConnectionBannerProps) {
  const { isOnline, pendingCount, isSyncing, syncPending } = useConnectionStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={className}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                You&apos;re offline
              </span>
              {pendingCount > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  • {pendingCount} change{pendingCount !== 1 ? 's' : ''} saved locally
                </span>
              )}
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Changes will sync when back online
            </span>
          </div>
        </motion.div>
      )}
      
      {isOnline && pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={className}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-100"
              onClick={syncPending}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync now
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Compact connection indicator for header
 */
export function ConnectionIndicator() {
  const { isOnline, pendingCount, isSyncing } = useConnectionStatus()

  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5">
      {!isOnline ? (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <WifiOff className="w-3 h-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Offline</span>
        </div>
      ) : isSyncing ? (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Syncing</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <CloudOff className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{pendingCount}</span>
        </div>
      ) : null}
    </div>
  )
}
