"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, RotateCcw, Trash2 } from "lucide-react"

const STORAGE_KEY = "instantmed_form_draft"
const EXPIRY_HOURS = 24

interface FormDraft {
  data: Record<string, unknown>
  service: string
  step: number
  savedAt: number
  email?: string
}

export function useFormRecovery(service: string) {
  const [draft, setDraft] = useState<FormDraft | null>(null)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)

  // Load draft on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed: FormDraft = JSON.parse(stored)
        const hoursSinceSave = (Date.now() - parsed.savedAt) / (1000 * 60 * 60)

        if (hoursSinceSave < EXPIRY_HOURS && parsed.service === service) {
          setDraft(parsed)
          // Only show modal if there's meaningful data
          if (Object.keys(parsed.data).length > 2) {
            setShowRecoveryModal(true)
          }
        } else {
          // Expired or different service, clear it
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [service])

  // Save draft
  const saveDraft = useCallback(
    (data: Record<string, unknown>, step: number, email?: string) => {
      const draftData: FormDraft = {
        data,
        service,
        step,
        savedAt: Date.now(),
        email,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData))
      setDraft(draftData)
    },
    [service],
  )

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setDraft(null)
    setShowRecoveryModal(false)
  }, [])

  // Restore draft
  const restoreDraft = useCallback(() => {
    setShowRecoveryModal(false)
    return draft
  }, [draft])

  // Dismiss recovery modal but keep draft
  const dismissRecovery = useCallback(() => {
    setShowRecoveryModal(false)
  }, [])

  return {
    draft,
    showRecoveryModal,
    saveDraft,
    clearDraft,
    restoreDraft,
    dismissRecovery,
  }
}

interface FormRecoveryModalProps {
  isOpen: boolean
  service: string
  savedAt: number
  onRestore: () => void
  onStartFresh: () => void
  onDismiss: () => void
}

export function FormRecoveryModal({
  isOpen,
  service,
  savedAt,
  onRestore,
  onStartFresh,
  onDismiss,
}: FormRecoveryModalProps) {
  if (!isOpen) return null

  const timeAgo = getTimeAgo(savedAt)
  const serviceName = getServiceName(service)

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0A0F1C]/60 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-scale-in shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 hover:bg-muted rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="w-6 h-6 text-primary" />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1">Welcome back!</h2>

          <p className="text-sm text-muted-foreground mb-6">
            You started a {serviceName} request {timeAgo}. Want to pick up where you left off?
          </p>

          <div className="space-y-2">
            <Button onClick={onRestore} className="w-full rounded-full btn-premium text-[#0A0F1C] font-medium">
              <RotateCcw className="w-4 h-4 mr-2" />
              Continue my request
            </Button>

            <Button onClick={onStartFresh} variant="outline" className="w-full rounded-full bg-transparent">
              <Trash2 className="w-4 h-4 mr-2" />
              Start fresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getTimeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60))
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  return "yesterday"
}

function getServiceName(service: string): string {
  const names: Record<string, string> = {
    "medical-certificate": "medical certificate",
    prescriptions: "prescription",
    pathology: "pathology referral",
    referrals: "referral",
  }
  return names[service] || "request"
}
