'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, FileText, Pill, Stethoscope, Scale, ChevronRight, X, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DraftSummary } from '@/lib/flow/draft/types'
import { getStepLabel, calculateProgress } from '@/lib/flow/draft/types'

// Service icons
const SERVICE_ICONS: Record<string, React.ElementType> = {
  'medical-certificate': FileText,
  'prescription': Pill,
  'referral': Stethoscope,
  'weight-management': Scale,
}

interface ResumePromptProps {
  drafts: DraftSummary[]
  onResume: (draftId: string) => void
  onStartFresh: () => void
  onDelete?: (draftId: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * Resume prompt component shown when user has incomplete drafts
 */
export function ResumePrompt({
  drafts,
  onResume,
  onStartFresh,
  onDelete,
  isLoading = false,
  className,
}: ResumePromptProps) {
  const [showAll, setShowAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Only show first draft by default
  const visibleDrafts = showAll ? drafts : drafts.slice(0, 1)
  const hasMoreDrafts = drafts.length > 1

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  // Handle delete
  const handleDelete = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation()
    if (!onDelete) return

    setDeletingId(draftId)
    try {
      await onDelete(draftId)
    } finally {
      setDeletingId(null)
    }
  }

  if (drafts.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Welcome back!
            </h2>
            <p className="text-sm text-slate-500">
              You have {drafts.length === 1 ? 'an unfinished request' : `${drafts.length} unfinished requests`}
            </p>
          </div>
        </div>
      </div>

      {/* Draft list */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleDrafts.map((draft) => {
            const Icon = SERVICE_ICONS[draft.serviceSlug] || FileText
            const progress = draft.progress || calculateProgress(draft.currentStep)
            const isDeleting = deletingId === (draft.id || draft.sessionId)

            return (
              <motion.button
                key={draft.id || draft.sessionId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onResume(draft.id || draft.sessionId)}
                disabled={isLoading || isDeleting}
                className={cn(
                  'w-full text-left rounded-xl border-2 p-4 transition-all duration-200',
                  'hover:shadow-md hover:border-emerald-300',
                  'border-slate-200 bg-white dark:bg-slate-900',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-slate-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {draft.serviceName}
                      </h3>
                      {onDelete && (
                        <button
                          onClick={(e) => handleDelete(e, draft.id || draft.sessionId)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(draft.updatedAt)}
                      </span>
                      <span>
                        {progress}% complete · {getStepLabel(draft.currentStep)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="shrink-0 w-5 h-5 text-slate-300" />
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {/* Show more button */}
        {hasMoreDrafts && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-center py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Show {drafts.length - 1} more request{drafts.length > 2 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-3">
        <Button
          variant="outline"
          onClick={onStartFresh}
          disabled={isLoading}
          className="flex-1"
        >
          Start fresh
        </Button>
        <Button
          onClick={() => onResume(drafts[0].id || drafts[0].sessionId)}
          disabled={isLoading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </motion.div>
  )
}

/**
 * Compact inline resume banner
 */
interface ResumeBannerProps {
  draft: DraftSummary
  onResume: () => void
  onDismiss: () => void
  className?: string
}

export function ResumeBanner({
  draft,
  onResume,
  onDismiss,
  className,
}: ResumeBannerProps) {
  const Icon = SERVICE_ICONS[draft.serviceSlug] || FileText
  const progress = draft.progress || calculateProgress(draft.currentStep)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3',
        className
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-emerald-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-emerald-900 truncate">
          Continue your {draft.serviceName.toLowerCase()}?
        </p>
        <p className="text-xs text-emerald-700">
          {progress}% complete
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDismiss}
          className="p-1 text-emerald-600 hover:text-emerald-800"
        >
          <X className="h-4 w-4" />
        </button>
        <Button
          size="sm"
          onClick={onResume}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Resume
        </Button>
      </div>
    </motion.div>
  )
}
