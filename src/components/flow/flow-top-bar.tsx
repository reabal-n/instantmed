'use client'

import { ArrowLeft, X, Cloud, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        'sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-100',
        className
      )}
    >
      <div className="max-w-3xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Left: Back button */}
        <div className="w-20">
          {showBack && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-600 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>

        {/* Center: Service name + save status */}
        <div className="flex-1 text-center">
          <h1 className="text-sm font-semibold text-slate-900">{serviceName}</h1>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
            {isSaving ? (
              <>
                <Cloud className="h-3 w-3 animate-pulse" />
                <span>Saving...</span>
              </>
            ) : lastSavedAt ? (
              <>
                <Cloud className="h-3 w-3 text-emerald-500" />
                <span>Saved {formatSavedTime(lastSavedAt)}</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                <span>Not saved</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Close button */}
        <div className="w-20 flex justify-end">
          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
