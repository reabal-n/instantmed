"use client"

import { CheckCircle2, Mail } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"

import { RequestButton } from "@/components/request/request-button"
import { requestCx } from "@/components/request/request-cx"
import { Input } from "@/components/ui/input"
import { usePostHog } from "@/lib/analytics/posthog-context"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { validateEmail } from "@/lib/request/validation"

import { useRequestStore } from "./store"

interface EarlyRecoveryEmailCaptureProps {
  serviceType: UnifiedServiceType
  certType?: string
  selectedDays: number | null
  startOffset: number | null
  medicationCount?: number
}

interface EarlyRecoveryEmailCaptureState {
  serviceType: UnifiedServiceType
  email?: string
  hasProfile?: boolean
  certType?: string
  selectedDays: number | null
  startOffset: number | null
  medicationCount?: number
}

export function normalizeRecoveryEmailInput(value: string) {
  return value.trim().toLowerCase()
}

export function shouldShowEarlyRecoveryEmailCapture({
  serviceType,
  email,
  hasProfile,
  certType,
  selectedDays,
  startOffset,
  medicationCount,
}: EarlyRecoveryEmailCaptureState) {
  const hasKnownIdentity = hasProfile || Boolean(email?.trim())
  if (hasKnownIdentity) return false

  if (serviceType === "prescription" || serviceType === "repeat-script") {
    return (medicationCount ?? 0) > 0
  }

  return (
    serviceType === "med-cert" &&
    Boolean(certType) &&
    selectedDays !== null &&
    startOffset !== null
  )
}

export function EarlyRecoveryEmailCapture({
  serviceType,
  certType,
  selectedDays,
  startOffset,
  medicationCount,
}: EarlyRecoveryEmailCaptureProps) {
  const { email, authContext, setIdentity } = useRequestStore()
  const posthog = usePostHog()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const shouldShow = useMemo(
    () =>
      shouldShowEarlyRecoveryEmailCapture({
        serviceType,
        email,
        hasProfile: authContext.hasProfile,
        certType,
        selectedDays,
        startOffset,
        medicationCount,
      }),
    [authContext.hasProfile, certType, email, medicationCount, selectedDays, serviceType, startOffset],
  )

  const handleSave = useCallback(() => {
    const normalizedEmail = normalizeRecoveryEmailInput(inputRef.current?.value ?? inputValue)
    const nextError = validateEmail(normalizedEmail)

    if (nextError) {
      setError(nextError)
      setSaved(false)
      return
    }

    setIdentity({ email: normalizedEmail })
    setError(null)
    setSaved(true)
    posthog?.capture("early_recovery_email_captured", {
      service_type: serviceType,
      step: serviceType === "med-cert" ? "certificate" : "medication",
      has_cert_type: Boolean(certType),
      duration: selectedDays,
      medication_count: medicationCount,
    })
  }, [certType, inputValue, medicationCount, posthog, selectedDays, serviceType, setIdentity])

  if (!shouldShow && !saved) return null

  return (
    <section
      aria-label="Save request progress"
      className="rounded-2xl border border-primary/15 bg-primary/5 p-3 shadow-md shadow-primary/[0.04] dark:bg-primary/10"
    >
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm shadow-primary/[0.05] dark:bg-card">
          {saved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {saved ? "Progress saved" : "Want a link if you pause?"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {saved
              ? "If you stop here, we can send a secure link to finish this request."
              : "Add your email and we can help you resume this request. No marketing emails."}
          </p>
        </div>
      </div>

      {!saved && (
        <div className="mt-3 flex gap-2 max-[420px]:flex-col">
          <Input
            ref={inputRef}
            id="early-recovery-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={inputValue}
            isInvalid={Boolean(error)}
            errorMessage={error ?? undefined}
            onChange={(event) => {
              setInputValue(event.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleSave()
              }
            }}
          />
          <RequestButton
            variant="outline"
            className={requestCx("h-11 shrink-0 px-4 max-[420px]:w-full")}
            onClick={handleSave}
          >
            Save link
          </RequestButton>
        </div>
      )}
    </section>
  )
}
