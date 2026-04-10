"use client"

/**
 * Inline waitlist email capture for Coming Soon service cards.
 * Fires a PostHog `waitlist_signup` event on submission.
 * Stores signup in localStorage to show "You're on the list" state.
 */

import { useState, useCallback } from "react"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2 } from "lucide-react"

const STORAGE_KEY = "instantmed_waitlist"

function getSignups(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function markSignedUp(serviceId: string) {
  const signups = getSignups()
  signups[serviceId] = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signups))
}

interface WaitlistCaptureProps {
  serviceId: string
  serviceName: string
}

export function WaitlistCapture({ serviceId, serviceName }: WaitlistCaptureProps) {
  const posthog = usePostHog()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(() => getSignups()[serviceId] ?? false)
  const [error, setError] = useState("")

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = email.trim()

      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError("Enter a valid email")
        return
      }

      posthog?.capture("waitlist_signup", {
        service: serviceId,
        service_name: serviceName,
      })

      markSignedUp(serviceId)
      setSubmitted(true)
      setError("")
    },
    [email, posthog, serviceId, serviceName],
  )

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 mt-2.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="text-[11px] text-muted-foreground">
          You&apos;re on the list
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2.5 space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError("")
          }}
          className="h-7 text-xs px-2.5 flex-1"
          aria-label={`Email for ${serviceName} waitlist`}
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="h-7 text-[11px] px-2.5 shrink-0"
        >
          Notify me
        </Button>
      </div>
      {error && (
        <p className="text-[10px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
