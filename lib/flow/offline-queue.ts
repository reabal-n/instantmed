/**
 * Offline Queue - Connection Recovery for Flow Actions
 * 
 * Queues flow actions when offline and replays them when connection is restored.
 * Uses localStorage for persistence and navigator.onLine for detection.
 */

import { createLogger } from '@/lib/observability/logger'

const logger = createLogger('offline-queue')

const QUEUE_KEY = 'flow_offline_queue'
const MAX_QUEUE_SIZE = 50
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export type QueuedActionType = 'save_draft' | 'update_answer' | 'complete_step'

export interface QueuedAction {
  id: string
  type: QueuedActionType
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

interface OfflineQueueState {
  actions: QueuedAction[]
  lastSyncAttempt: number | null
}

/**
 * Get queue from localStorage
 */
function getQueue(): OfflineQueueState {
  if (typeof window === 'undefined') {
    return { actions: [], lastSyncAttempt: null }
  }
  
  try {
    const stored = localStorage.getItem(QUEUE_KEY)
    if (!stored) {
      return { actions: [], lastSyncAttempt: null }
    }
    
    const state: OfflineQueueState = JSON.parse(stored)
    
    // Filter out stale actions
    const now = Date.now()
    state.actions = state.actions.filter(a => now - a.timestamp < MAX_AGE_MS)
    
    return state
  } catch {
    return { actions: [], lastSyncAttempt: null }
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(state: OfflineQueueState): void {
  if (typeof window === 'undefined') return
  
  try {
    // Limit queue size
    if (state.actions.length > MAX_QUEUE_SIZE) {
      state.actions = state.actions.slice(-MAX_QUEUE_SIZE)
    }
    
    localStorage.setItem(QUEUE_KEY, JSON.stringify(state))
  } catch (error) {
    logger.warn('Failed to save offline queue', { error })
  }
}

/**
 * Generate unique action ID
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Add action to offline queue
 */
export function queueAction(
  type: QueuedActionType,
  payload: Record<string, unknown>
): string {
  const action: QueuedAction = {
    id: generateActionId(),
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  }
  
  const state = getQueue()
  state.actions.push(action)
  saveQueue(state)
  
  logger.info('Action queued for offline sync', { type, actionId: action.id })
  
  return action.id
}

/**
 * Remove action from queue (after successful sync)
 */
export function dequeueAction(actionId: string): void {
  const state = getQueue()
  state.actions = state.actions.filter(a => a.id !== actionId)
  saveQueue(state)
}

/**
 * Get all pending actions
 */
export function getPendingActions(): QueuedAction[] {
  return getQueue().actions
}

/**
 * Clear all queued actions
 */
export function clearQueue(): void {
  saveQueue({ actions: [], lastSyncAttempt: null })
}

/**
 * Mark sync attempt
 */
export function markSyncAttempt(): void {
  const state = getQueue()
  state.lastSyncAttempt = Date.now()
  saveQueue(state)
}

/**
 * Increment retry count for an action
 */
export function incrementRetry(actionId: string): number {
  const state = getQueue()
  const action = state.actions.find(a => a.id === actionId)
  
  if (action) {
    action.retries++
    saveQueue(state)
    return action.retries
  }
  
  return 0
}

/**
 * Hook to listen for online/offline status changes
 */
export function createConnectionListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  
  const handleOnline = () => {
    logger.info('Connection restored')
    onOnline()
  }
  
  const handleOffline = () => {
    logger.info('Connection lost')
    onOffline()
  }
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
