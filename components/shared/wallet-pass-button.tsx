'use client'

import { useState } from 'react'
import { Smartphone, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WalletPassButtonProps {
  certificateId: string
  patientName: string
  issueDate: string
  expiryDate?: string
  className?: string
}

/**
 * Apple/Google Wallet pass button for medical certificates
 * Allows patients to add their certificate to their phone's wallet app
 */
export function WalletPassButton({
  certificateId,
  patientName,
  issueDate,
  expiryDate,
  className
}: WalletPassButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAddToWallet() {
    setIsLoading(true)
    setError(null)

    try {
      // Detect device type
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)

      if (isIOS) {
        // Generate Apple Wallet pass
        const response = await fetch('/api/wallet/apple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            certificateId,
            patientName,
            issueDate,
            expiryDate,
          }),
        })

        if (!response.ok) throw new Error('Failed to generate pass')

        // Download the .pkpass file
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `InstantMed-Certificate-${certificateId}.pkpass`
        a.click()
        URL.revokeObjectURL(url)
      } else if (isAndroid) {
        // Generate Google Wallet pass
        const response = await fetch('/api/wallet/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            certificateId,
            patientName,
            issueDate,
            expiryDate,
          }),
        })

        if (!response.ok) throw new Error('Failed to generate pass')

        const { saveUrl } = await response.json()
        window.open(saveUrl, '_blank')
      } else {
        setError('Wallet passes are only available on mobile devices')
        return
      }

      setIsAdded(true)
    } catch {
      setError('Failed to add to wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAdded) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-700 dark:text-emerald-400",
        className
      )}>
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Added to wallet</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <Button
        onClick={handleAddToWallet}
        disabled={isLoading}
        variant="outline"
        className="w-full gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Smartphone className="w-4 h-4" />
        )}
        Add to Wallet
      </Button>
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
}

/**
 * Wallet pass options showing both Apple and Google wallet buttons
 */
export function WalletPassOptions({
  certificateId,
  patientName: _patientName,
  issueDate: _issueDate,
  expiryDate: _expiryDate,
  className
}: WalletPassButtonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-foreground">Add to phone wallet</p>
      <div className="flex gap-3">
        {/* Apple Wallet */}
        <button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          onClick={() => {
            // In production, this would trigger the Apple Wallet flow
            window.open(`/api/wallet/apple?id=${certificateId}`, '_blank')
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <span className="text-sm font-medium">Apple Wallet</span>
        </button>

        {/* Google Wallet */}
        <button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          onClick={() => {
            // In production, this would trigger the Google Wallet flow
            window.open(`/api/wallet/google?id=${certificateId}`, '_blank')
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm font-medium text-foreground">Google Wallet</span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Keep your certificate handy on your phone
      </p>
    </div>
  )
}
