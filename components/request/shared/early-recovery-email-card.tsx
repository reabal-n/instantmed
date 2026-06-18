"use client"

import { CheckCircle2, Mail } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePostHog } from "@/lib/analytics/posthog-context"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { validateEmail } from "@/lib/request/validation"
import { cn } from "@/lib/utils"
import { detectEmailTypo } from "@/lib/validation/email-typo"

import { useRequestStore } from "../store"

interface EarlyRecoveryEmailCardProps {
  serviceType: UnifiedServiceType
  stepId: string
  className?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return value.length > 0 && validateEmail(value) === null
}

export function EarlyRecoveryEmailCard({
  serviceType,
  stepId,
  className,
}: EarlyRecoveryEmailCardProps) {
  const posthog = usePostHog()
  const { email, setIdentity } = useRequestStore()
  const initialEmail = normalizeEmail(email)
  const [value, setValue] = useState(initialEmail)
  const [touched, setTouched] = useState(false)
  const [savedEmail, setSavedEmail] = useState(isValidEmail(initialEmail) ? initialEmail : "")
  const capturedEmailRef = useRef(savedEmail)

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
  const canSave = isValidEmail(normalizedValue)
  const isSaved = savedEmail.length > 0 && savedEmail === normalizedValue && !validationError

  const saveEmail = useCallback((candidate: string) => {
    const nextEmail = normalizeEmail(candidate)
    setTouched(true)

    if (!isValidEmail(nextEmail)) {
      return
    }

    setIdentity({ email: nextEmail })
    setSavedEmail(nextEmail)

    if (capturedEmailRef.current !== nextEmail) {
      capturedEmailRef.current = nextEmail
      posthog?.capture("early_recovery_email_captured", {
        service_type: serviceType,
        step_id: stepId,
      })
    }
  }, [posthog, serviceType, setIdentity, stepId])

  const applySuggestion = () => {
    if (!typo.suggested) return
    setValue(typo.suggested)
    saveEmail(typo.suggested)
  }

  return (
    <QuestionCard
      compact
      className={cn(
        "border-primary/20 bg-primary/[0.04] shadow-sm shadow-primary/[0.04]",
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isSaved ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mail className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Save your place</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Optional. Add your email and we can send a resume link if you get interrupted.
            </p>
          </div>

          {isSaved ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Resume email saved.
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2 max-sm:flex-col">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    if (savedEmail) setSavedEmail("")
                  }}
                  onBlur={() => {
                    if (canSave) saveEmail(value)
                    else if (normalizedValue) setTouched(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      saveEmail(value)
                    }
                  }}
                  placeholder="you@example.com"
                  aria-label="Email for request recovery"
                  isInvalid={Boolean(error)}
                  errorMessage={error || undefined}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveEmail(value)}
                  disabled={!normalizedValue}
                  className="h-12 shrink-0"
                >
                  Save
                </Button>
              </div>
              {typo.hasTypo && typo.suggested && (
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
            </div>
          )}
        </div>
      </div>
    </QuestionCard>
  )
}
