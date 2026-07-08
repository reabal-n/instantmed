"use client"

import { CheckCircle2, Mail } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { FormField } from "@/components/request/form-field"
import { Input } from "@/components/ui/input"
import { usePostHog } from "@/lib/analytics/posthog-context"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { validateEmail } from "@/lib/request/validation"
import { cn } from "@/lib/utils"
import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"
import { detectEmailTypo } from "@/lib/validation/email-typo"

import { useRequestStore } from "../store"

interface InlineRecoveryEmailFieldProps {
  serviceType: UnifiedServiceType
  stepId: string
  className?: string
}

const AUTO_SAVE_DELAY_MS = 700

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return value.length > 0 && validateEmail(value) === null
}

export function InlineRecoveryEmailField({
  serviceType,
  stepId,
  className,
}: InlineRecoveryEmailFieldProps) {
  const posthog = usePostHog()
  const { email, setIdentity } = useRequestStore()
  const initialEmail = normalizeEmail(email)
  const [value, setValue] = useState(initialEmail)
  const [touched, setTouched] = useState(false)
  const [savedEmail, setSavedEmail] = useState(isValidEmail(initialEmail) ? initialEmail : "")
  const capturedEmailRef = useRef(savedEmail)
  const invalidReportedRef = useRef("")
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true

    posthog?.capture("early_email_field_viewed", {
      service_type: serviceType,
      step_id: stepId,
      prefilled: Boolean(savedEmail),
    })

    if (savedEmail) {
      posthog?.capture("early_email_prefilled", {
        service_type: serviceType,
        step_id: stepId,
      })
    }
  }, [posthog, savedEmail, serviceType, stepId])

  useEffect(() => {
    const nextEmail = normalizeEmail(email)
    if (!nextEmail || nextEmail === value) return
    setValue(nextEmail)
    if (isValidEmail(nextEmail)) {
      setSavedEmail(nextEmail)
      capturedEmailRef.current = nextEmail
    }
  }, [email, value])

  const normalizedValue = normalizeEmail(value)
  const validationError = normalizedValue ? validateEmail(normalizedValue) : null
  const error = touched ? validationError : null
  const typo = useMemo(() => detectEmailTypo(normalizedValue), [normalizedValue])
  const relayNote = useMemo(() => {
    if (!isValidEmail(normalizedValue)) return null
    return getRelayEmailMessage(detectRelayEmail(normalizedValue))
  }, [normalizedValue])
  const isSaved = savedEmail.length > 0 && savedEmail === normalizedValue && !validationError
  const showSavedMessage = isSaved && !relayNote && !typo.hasTypo
  const showTypoSuggestion = typo.hasTypo && Boolean(typo.suggested)
  const showRelayNote = Boolean(relayNote && !typo.hasTypo && !error)

  const reportInvalid = useCallback(() => {
    if (!normalizedValue || !validationError || invalidReportedRef.current === normalizedValue) {
      return
    }
    invalidReportedRef.current = normalizedValue
    posthog?.capture("early_email_invalid", {
      service_type: serviceType,
      step_id: stepId,
    })
  }, [normalizedValue, posthog, serviceType, stepId, validationError])

  const saveEmail = useCallback((candidate: string, source: "auto" | "blur" | "enter" | "suggestion") => {
    const nextEmail = normalizeEmail(candidate)

    if (!isValidEmail(nextEmail)) {
      return false
    }

    setIdentity({ email: nextEmail })
    setSavedEmail(nextEmail)

    if (capturedEmailRef.current !== nextEmail) {
      capturedEmailRef.current = nextEmail
      posthog?.capture("early_email_autosaved", {
        service_type: serviceType,
        step_id: stepId,
        source,
      })
      // Preserve the previous event name for existing PostHog insights.
      posthog?.capture("early_recovery_email_captured", {
        service_type: serviceType,
        step_id: stepId,
      })
    }

    return true
  }, [posthog, serviceType, setIdentity, stepId])

  useEffect(() => {
    if (!isValidEmail(normalizedValue) || isSaved) return

    const timer = setTimeout(() => {
      saveEmail(normalizedValue, "auto")
    }, AUTO_SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [isSaved, normalizedValue, saveEmail])

  const applySuggestion = () => {
    if (!typo.suggested) return
    setValue(typo.suggested)
    setTouched(true)
    saveEmail(typo.suggested, "suggestion")
  }

  return (
    <div
      data-intake-recovery-email-field="true"
      className={cn(
        "rounded-xl border border-border/50 bg-muted/35 px-3 py-2.5 dark:bg-white/[0.04]",
        className,
      )}
    >
      <FormField
        label="Email (optional)"
        hint="Optional. We'll save progress and email a resume link if you stop."
        icon={Mail}
        error={error || undefined}
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setTouched(false)
            if (savedEmail) setSavedEmail("")
          }}
          onBlur={() => {
            setTouched(true)
            if (!saveEmail(value, "blur")) reportInvalid()
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            setTouched(true)
            if (!saveEmail(value, "enter")) reportInvalid()
          }}
          placeholder="you@example.com"
          aria-label="Email for request recovery"
          isInvalid={Boolean(error)}
          endContent={
            isSaved ? (
              <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Email saved" />
            ) : undefined
          }
        />
      </FormField>

      {(showSavedMessage || showTypoSuggestion || showRelayNote) && (
        <div className="mt-1.5" aria-live="polite">
          {showSavedMessage && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Progress email saved.
            </p>
          )}
          {showTypoSuggestion && typo.suggested && (
            <p className="text-xs text-muted-foreground">
              Did you mean{" "}
              <button
                type="button"
                onClick={applySuggestion}
                className="rounded text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {typo.suggested}
              </button>
              ?
            </p>
          )}
          {showRelayNote && relayNote && (
            <p className="text-xs text-muted-foreground">
              {relayNote}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
