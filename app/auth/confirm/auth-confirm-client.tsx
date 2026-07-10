"use client"

import { AlertTriangle, ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, useSyncExternalStore } from "react"

import { BrandLogo } from "@/components/shared/brand-logo"
import { Button } from "@/components/ui/button"
import {
  type AuthConfirmationActionType,
  consumeAuthEmailConfirmation,
  isAuthConfirmationActionType,
  readAuthConfirmationParams,
  selectAuthConfirmationParams,
} from "@/lib/auth/auth-confirmation"
import { createClient } from "@/lib/supabase/client"

const confirmationCopy: Record<AuthConfirmationActionType, {
  eyebrow: string
  title: string
  body: string
  button: string
}> = {
  magiclink: {
    eyebrow: "Secure sign-in",
    title: "Continue to InstantMed",
    body: "Confirm below to finish signing in. This one-time link stays unused until you continue.",
    button: "Continue to sign in",
  },
  signup: {
    eyebrow: "Account setup",
    title: "Confirm your account",
    body: "Confirm below to finish setting up your InstantMed account.",
    button: "Confirm account",
  },
  invite: {
    eyebrow: "Account invitation",
    title: "Accept your invitation",
    body: "Confirm below to accept this invitation and continue securely.",
    button: "Accept invitation",
  },
  recovery: {
    eyebrow: "Account recovery",
    title: "Continue to reset your password",
    body: "Confirm below to open the password reset form. Your password will not change until you choose a new one.",
    button: "Continue to password reset",
  },
  email_change: {
    eyebrow: "Account security",
    title: "Confirm this email change",
    body: "Confirm below to approve the requested change to your InstantMed sign-in email.",
    button: "Confirm email change",
  },
}

type ConfirmationError = "expired_or_invalid" | "invalid_link" | "temporarily_unavailable" | null
type ConfirmationParams = ReturnType<typeof readAuthConfirmationParams>

function subscribeToLocationHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange)
  return () => window.removeEventListener("hashchange", onStoreChange)
}

function getLocationHash() {
  return window.location.hash
}

function getServerHash() {
  return ""
}

export function AuthConfirmClient() {
  const searchParams = useSearchParams()
  const locationHash = useSyncExternalStore(
    subscribeToLocationHash,
    getLocationHash,
    getServerHash,
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<ConfirmationError>(null)
  const [errorTokenHash, setErrorTokenHash] = useState<string | null>(null)
  const [retainedConfirmation, setRetainedConfirmation] = useState<ConfirmationParams | null>(null)

  const liveConfirmation = readAuthConfirmationParams(searchParams, locationHash)
  const {
    tokenHash,
    actionType: actionTypeValue,
    next,
  } = selectAuthConfirmationParams(liveConfirmation, retainedConfirmation)
  const actionType = isAuthConfirmationActionType(actionTypeValue)
    ? actionTypeValue
    : null
  const hasValidLink = Boolean(tokenHash && actionType)
  const copy = actionType ? confirmationCopy[actionType] : null

  const handleConfirm = async () => {
    if (!hasValidLink || !actionType) {
      setError("invalid_link")
      return
    }

    setIsConfirming(true)
    setError(null)
    setErrorTokenHash(null)
    setRetainedConfirmation({ tokenHash, actionType, next })

    // Remove the one-time hash from browser history before it is consumed.
    window.history.replaceState(null, "", "/auth/confirm")

    try {
      const supabase = createClient()
      const result = await consumeAuthEmailConfirmation({
        tokenHash,
        actionType,
        next,
      }, (input) => supabase.auth.verifyOtp(input))

      if (!result.success) {
        setError(result.error)
        setErrorTokenHash(tokenHash)
        setIsConfirming(false)
        return
      }

      window.location.replace(result.destination)
    } catch {
      setError("temporarily_unavailable")
      setErrorTokenHash(tokenHash)
      setIsConfirming(false)
    }
  }

  const recoveryHref = actionType === "recovery" ? "/auth/forgot-password" : "/sign-in"
  const recoveryLabel = actionType === "recovery" ? "Request a new reset link" : "Request a new sign-in link"
  const visibleError = error && errorTokenHash === tokenHash ? error : null
  const errorMessage = visibleError === "temporarily_unavailable"
    ? "We couldn't confirm this link right now. Check your connection and try again."
    : "This confirmation link is invalid or has expired. Request a fresh link and try again."

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <section
        aria-labelledby="auth-confirm-title"
        className="w-full max-w-md rounded-2xl border border-border/50 bg-white p-8 text-center shadow-md shadow-primary/[0.06] dark:bg-card"
      >
        <BrandLogo size="md" className="mb-7 justify-center" />

        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${hasValidLink ? "bg-primary/10 text-primary" : "bg-warning-light text-warning"}`}>
          {hasValidLink ? (
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          {copy?.eyebrow ?? "Secure confirmation"}
        </p>
        <h1 id="auth-confirm-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {copy?.title ?? "This link can't be confirmed"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {copy?.body ?? "The confirmation details are missing or incomplete."}
        </p>

        {visibleError && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-5 rounded-xl border border-destructive-border bg-destructive-light px-4 py-3 text-left text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        {hasValidLink ? (
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="mt-6 h-12 w-full rounded-xl"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Confirming securely...
              </>
            ) : (
              <>
                {copy?.button}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        ) : (
          <Button asChild className="mt-6 h-12 w-full rounded-xl">
            <Link href={recoveryHref}>{recoveryLabel}</Link>
          </Button>
        )}

        {visibleError && hasValidLink && (
          <Link
            href={recoveryHref}
            className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary/80 hover:underline"
          >
            {recoveryLabel}
          </Link>
        )}

        <p className="mt-6 border-t border-border/50 pt-5 text-xs leading-5 text-muted-foreground">
          Didn&apos;t request this? You can close this page. Nothing changes unless you confirm.
        </p>
      </section>
    </main>
  )
}
