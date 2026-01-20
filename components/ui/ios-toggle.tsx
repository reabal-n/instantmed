'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface IOSToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: React.ReactNode
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * iOS-style toggle switch with spring animation
 * Used for binary confirmations per refined intake spec
 */
export function IOSToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: IOSToggleProps) {
  const sizes = {
    sm: { track: 'w-10 h-6', thumb: 'w-5 h-5', translate: 'translate-x-4' },
    md: { track: 'w-12 h-7', thumb: 'w-6 h-6', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-8', thumb: 'w-7 h-7', translate: 'translate-x-6' },
  }

  const { track, thumb, translate } = sizes[size]

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* Toggle switch */}
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
          track,
          checked
            ? 'bg-emerald-500 border-emerald-500/40'
            : 'bg-slate-200 border-slate-200/60',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        <motion.span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-md',
            thumb
          )}
          initial={false}
          animate={{
            x: checked ? parseInt(translate.replace('translate-x-', '')) * 4 : 2,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          style={{ marginTop: '0.5px' }}
        />
      </motion.button>

      {/* Label and description */}
      {(label || description) && (
        <div 
          className="flex-1 min-w-0 cursor-pointer select-none"
          onClick={handleToggle}
        >
          {label && (
            <p className={cn(
              'text-sm font-medium',
              checked ? 'text-slate-900' : 'text-slate-700'
            )}>
              {label}
            </p>
          )}
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  className?: string
}

/**
 * Segmented control with sliding background pill
 * Used for mutually exclusive options per refined intake spec
 */
export function SegmentedControl({
  value,
  onChange,
  options,
  disabled = false,
  className,
}: SegmentedControlProps) {
  const selectedIndex = options.findIndex(opt => opt.value === value)

  return (
    <div
      className={cn(
        'relative inline-flex p-1 bg-slate-100 rounded-xl',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Sliding background pill */}
      {selectedIndex >= 0 && (
        <motion.div
          className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm"
          initial={false}
          animate={{
            left: `calc(${(selectedIndex / options.length) * 100}% + 4px)`,
            width: `calc(${100 / options.length}% - 8px)`,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
        />
      )}

      {/* Options */}
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              'relative z-10 flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
              isSelected
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-800'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
