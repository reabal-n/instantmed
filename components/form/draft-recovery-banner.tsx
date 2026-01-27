"use client"

import { Clock } from "lucide-react"

/**
 * Draft Recovery Banner Component
 */
export function DraftRecoveryBanner({
  onRecover,
  onDiscard,
  draftAge,
}: {
  onRecover: () => void
  onDiscard: () => void
  draftAge?: string | null
}) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">
            Unsaved draft found
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            You have an unsaved draft{draftAge ? ` from ${draftAge}` : ""}. Would you like to recover it?
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-md transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onRecover}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
          >
            Recover
          </button>
        </div>
      </div>
    </div>
  )
}
