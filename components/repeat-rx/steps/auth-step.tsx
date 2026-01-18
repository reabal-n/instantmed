"use client"

/**
 * Auth Step - Repeat Prescription Intake
 * 
 * Handles authentication options: sign in or continue as guest.
 * ~120 lines - well under 200 line limit.
 */

import { Button } from "@/components/ui/button"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { RefreshCw, Check } from "lucide-react"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"
import { TrustStrip } from "../shared/trust-strip"

interface AuthStepProps {
  onSignIn: () => void
  onGuest: () => void
  isLoading: boolean
}

export function AuthStep({ onSignIn, onGuest, isLoading }: AuthStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">{REPEAT_RX_COPY.titles.main}</h1>
        <p className="text-muted-foreground">{REPEAT_RX_COPY.titles.subtitle}</p>
      </div>

      {/* Auth Options */}
      <div className="space-y-4">
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="font-semibold">{REPEAT_RX_COPY.auth.heading}</h2>
          <p className="text-sm text-muted-foreground">
            {REPEAT_RX_COPY.auth.subtitle}
          </p>

          {/* Sign In Button */}
          <Button
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <ButtonSpinner className="mr-2" /> : null}
            {REPEAT_RX_COPY.auth.signInButton}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Guest Button */}
          <Button
            variant="outline"
            onClick={onGuest}
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 hover:bg-white/85 dark:hover:bg-slate-900/80 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {REPEAT_RX_COPY.auth.guestButton}
          </Button>
        </div>

        {/* Benefits of signing in */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)] space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Sign in for the best experience:
          </p>
          <ul className="space-y-1.5">
            {REPEAT_RX_COPY.auth.signInBenefits.map((benefit, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <TrustStrip />
    </div>
  )
}
