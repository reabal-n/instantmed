'use client'

import { ArrowLeft, X, Cloud, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FlowTopBarProps {
  serviceName: string
  onBack?: () => void
  onClose?: () => void
  showBack?: boolean
  isSaving?: boolean
  lastSavedAt?: string | null
  className?: string
}

export function FlowTopBar({
  serviceName,
  onBack,
  onClose,
  showBack = true,
  isSaving = false,
  lastSavedAt,
  className,
}: FlowTopBarProps) {
  // Format last saved time
  const formatSavedTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/40 dark:border-white/10',
        className
      )}
    >
      <div className="max-w-2xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Left: Back button */}
        <div className="w-16">
          {showBack && onBack && (
            <motion.button
              onClick={onBack}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm font-medium -ml-1 py-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </motion.button>
          )}
        </div>

        {/* Center: Service name + save status */}
        <div className="flex-1 text-center">
          <h1 className="text-sm font-semibold text-slate-900 truncate">{serviceName}</h1>
          
          {/* Save status - subtle */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 h-4">
            {isSaving ? (
              <motion.div 
                className="flex items-center gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                <span>Saving</span>
              </motion.div>
            ) : lastSavedAt ? (
              <div className="flex items-center gap-1">
                <Cloud className="h-2.5 w-2.5 text-emerald-500" />
                <span>Saved {formatSavedTime(lastSavedAt)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Close button */}
        <div className="w-16 flex justify-end">
          {onClose && (
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/70 dark:hover:bg-gray-800/60 backdrop-blur-lg rounded-xl transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  )
}
