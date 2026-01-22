'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  isOnline, 
  createConnectionListener, 
  getPendingActions,
  dequeueAction,
  incrementRetry,
  markSyncAttempt,
  type QueuedAction 
} from '@/lib/flow/offline-queue'
import { createLogger } from '@/lib/observability/logger'

const logger = createLogger('use-connection-status')

const MAX_RETRIES = 3

interface UseConnectionStatusReturn {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  syncPending: () => Promise<void>
}

/**
 * Hook to manage connection status and offline queue sync
 * 
 * Usage:
 * ```tsx
 * const { isOnline, pendingCount, isSyncing, syncPending } = useConnectionStatus()
 * ```
 */
export function useConnectionStatus(
  onSync?: (action: QueuedAction) => Promise<boolean>
): UseConnectionStatusReturn {
  const [online, setOnline] = useState(() => isOnline())
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Update pending count
  const updatePendingCount = useCallback(() => {
    setPendingCount(getPendingActions().length)
  }, [])

  // Sync pending actions
  const syncPending = useCallback(async () => {
    if (!isOnline() || isSyncing) return
    
    const actions = getPendingActions()
    if (actions.length === 0) return
    
    setIsSyncing(true)
    markSyncAttempt()
    
    logger.info('Starting offline queue sync', { actionCount: actions.length })
    
    for (const action of actions) {
      try {
        // Use custom sync handler if provided
        if (onSync) {
          const success = await onSync(action)
          if (success) {
            dequeueAction(action.id)
            logger.info('Action synced successfully', { actionId: action.id, type: action.type })
          } else {
            const retries = incrementRetry(action.id)
            if (retries >= MAX_RETRIES) {
              dequeueAction(action.id)
              logger.warn('Action dropped after max retries', { actionId: action.id, type: action.type })
            }
          }
        } else {
          // Default: just dequeue (no-op sync)
          dequeueAction(action.id)
        }
      } catch (error) {
        logger.error('Failed to sync action', { actionId: action.id }, error instanceof Error ? error : undefined)
        incrementRetry(action.id)
      }
    }
    
    setIsSyncing(false)
    updatePendingCount()
  }, [isSyncing, onSync, updatePendingCount])

  // Listen for connection changes
  useEffect(() => {
    updatePendingCount()
    
    const cleanup = createConnectionListener(
      () => {
        setOnline(true)
        // Auto-sync when back online
        syncPending()
      },
      () => {
        setOnline(false)
      }
    )
    
    return cleanup
  }, [syncPending, updatePendingCount])

  return {
    isOnline: online,
    pendingCount,
    isSyncing,
    syncPending,
  }
}
