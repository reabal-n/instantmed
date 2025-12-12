'use client'

import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import { createFormTimestamp, validateBotProtection } from '@/lib/security/bot-protection'

interface ProtectedFormProps {
  children: ReactNode
  onSubmit: (formData: FormData) => Promise<void>
  className?: string
}

/**
 * Form wrapper with bot protection (honeypot + timing)
 */
export function ProtectedForm({ children, onSubmit, className }: ProtectedFormProps) {
  const [timestamp, setTimestamp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [botError, setBotError] = useState<string | null>(null)

  // Generate timestamp on mount
  useEffect(() => {
    setTimestamp(createFormTimestamp())
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBotError(null)

    const formData = new FormData(e.currentTarget)

    // Validate bot protection
    const botCheck = validateBotProtection({
      _ft: formData.get('_ft') as string,
      website: formData.get('website') as string,
      _hp_field: formData.get('_hp_field') as string,
    })

    if (!botCheck.valid) {
      // Silent fail for bots, but show error if legitimate user is too fast
      if (botCheck.reason?.includes('quickly')) {
        setBotError('Please wait a moment before submitting.')
      }
      return
    }

    // Remove protection fields before sending
    formData.delete('_ft')
    formData.delete('website')
    formData.delete('_hp_field')

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Hidden timestamp field */}
      <input type="hidden" name="_ft" value={timestamp} />

      {/* Honeypot fields - hidden from users, bots will fill them */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
        <label htmlFor="_hp_field">Leave empty</label>
        <input
          type="text"
          id="_hp_field"
          name="_hp_field"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {botError && (
        <div className="text-sm text-red-600 mb-4">{botError}</div>
      )}

      {children}
    </form>
  )
}
