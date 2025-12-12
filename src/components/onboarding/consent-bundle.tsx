'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, FileText, AlertCircle, Loader2 } from 'lucide-react'
import type { ConsentDefinition } from '@/lib/consent/types'
import type { ConsentType } from '@/types/database'
import { 
  getConsentsForService, 
  getRequiredConsents,
  generateConsentHash 
} from '@/lib/consent/definitions'

interface ConsentBundleProps {
  serviceType: string
  intakeId: string
  patientId: string
  onComplete: () => void
  onBack: () => void
}

interface ConsentState {
  type: ConsentType
  checked: boolean
  required: boolean
}

export function ConsentBundle({
  serviceType,
  intakeId,
  patientId,
  onComplete,
  onBack,
}: ConsentBundleProps) {
  const [consents, setConsents] = useState<ConsentState[]>([])
  const [consentDefs, setConsentDefs] = useState<ConsentDefinition[]>([])
  const [expandedConsent, setExpandedConsent] = useState<ConsentType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load consents for this service type
  useEffect(() => {
    const allConsents = getConsentsForService(serviceType)
    const requiredTypes = new Set(
      getRequiredConsents(serviceType).map((c) => c.type)
    )

    setConsentDefs(allConsents)
    setConsents(
      allConsents.map((c) => ({
        type: c.type,
        checked: false,
        required: requiredTypes.has(c.type),
      }))
    )
  }, [serviceType])

  const handleCheckConsent = (type: ConsentType, checked: boolean) => {
    setConsents((prev) =>
      prev.map((c) => (c.type === type ? { ...c, checked } : c))
    )
    setError(null)
  }

  const allRequiredChecked = consents
    .filter((c) => c.required)
    .every((c) => c.checked)

  const handleSubmit = async () => {
    if (!allRequiredChecked) {
      setError('Please accept all required consents to continue.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare consent data
      const consentData = consents
        .filter((c) => c.checked)
        .map((c) => {
          const def = consentDefs.find((d) => d.type === c.type)!
          return {
            type: c.type,
            version: def.version,
            textHash: generateConsentHash(def.fullText),
          }
        })

      // Submit to API
      const response = await fetch('/api/consent/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId,
          patientId,
          consents: consentData,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record consents')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getConsentDef = (type: ConsentType) =>
    consentDefs.find((d) => d.type === type)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Review & Accept Terms
        </h2>
        <p className="mt-2 text-muted-foreground">
          Please review and accept the following terms to proceed with your
          consultation.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Consent Items */}
      <div className="space-y-4">
        {consents.map((consent) => {
          const def = getConsentDef(consent.type)
          if (!def) return null

          return (
            <div
              key={consent.type}
              className={cn(
                'rounded-lg border p-4 transition-all',
                consent.checked
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  id={consent.type}
                  checked={consent.checked}
                  onCheckedChange={(checked) =>
                    handleCheckConsent(consent.type, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={consent.type}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="font-medium text-foreground">
                      {def.title}
                    </span>
                    {consent.required && (
                      <span className="text-xs text-destructive font-medium">
                        Required
                      </span>
                    )}
                  </label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {def.summary}
                  </p>

                  {/* Read Full Terms Dialog */}
                  <Dialog
                    open={expandedConsent === consent.type}
                    onOpenChange={(open) =>
                      setExpandedConsent(open ? consent.type : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <button className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" />
                        Read full terms
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>{def.title}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed">
                            {def.fullText}
                          </pre>
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setExpandedConsent(null)}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={() => {
                            handleCheckConsent(consent.type, true)
                            setExpandedConsent(null)
                          }}
                        >
                          I Accept
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legal Notice */}
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>
          By checking the boxes above and proceeding, you are providing your
          electronic signature and consent. Your consent will be recorded with a
          timestamp and may be used for legal and regulatory compliance purposes.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="sm:w-auto">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!allRequiredChecked || isSubmitting}
          className="flex-1 sm:flex-none sm:min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue to Review'
          )}
        </Button>
      </div>
    </div>
  )
}
