"use client"

import { motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface EmailVerificationGateProps {
  email: string
  isVerified: boolean
  onResendVerification: () => Promise<{ success: boolean; error?: string }>
  children: React.ReactNode
  className?: string
}

/**
 * Gate component that requires email verification before showing document download
 * Used to ensure patients verify their email before receiving sensitive medical documents
 */
export function EmailVerificationGate({
  email,
  isVerified,
  onResendVerification,
  children,
  className,
}: EmailVerificationGateProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isPending, startTransition] = useTransition()
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleResend = () => {
    setResendStatus("idle")
    setErrorMessage(null)
    
    startTransition(async () => {
      const result = await onResendVerification()
      if (result.success) {
        setResendStatus("success")
      } else {
        setResendStatus("error")
        setErrorMessage(result.error || "Failed to send verification email")
      }
    })
  }

  // If verified, show the children (document download)
  if (isVerified) {
    return <>{children}</>
  }

  // Show verification required message
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="p-6 border-warning-border bg-warning-light">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="h-12 w-12 rounded-full bg-warning-light flex items-center justify-center">
            <Mail className="h-6 w-6 text-warning" />
          </div>

          {/* Message */}
          <div>
            <h3 className="font-semibold text-lg">Verify your email first</h3>
            <p className="text-sm text-muted-foreground mt-1">
              For your security, please verify your email before accessing your medical documents.
            </p>
          </div>

          {/* Email display */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-card border text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{email}</span>
          </div>

          {/* Status messages */}
          {resendStatus === "success" && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Verification email sent. Check your inbox.</span>
            </div>
          )}

          {resendStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={handleResend}
              disabled={isPending}
              variant="outline"
              className={cn(
                "w-full sm:w-auto",
                resendStatus === "success" && "border-success-border text-success"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Sent
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend verification email
                </>
              )}
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact support
            </a>
          </p>
        </div>
      </Card>
    </motion.div>
  )
}

/**
 * Inline verification banner for use in intake detail pages
 */
interface VerificationBannerProps {
  onResend: () => Promise<{ success: boolean; error?: string }>
  className?: string
}

export function EmailVerificationBanner({ onResend, className }: VerificationBannerProps) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const handleResend = () => {
    startTransition(async () => {
      const result = await onResend()
      if (result.success) {
        setSent(true)
      }
    })
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-xl bg-warning-light border border-warning-border",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-warning shrink-0" />
        <p className="text-sm text-warning">
          <strong>Verify your email</strong> to download documents
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleResend}
        disabled={isPending || sent}
        className="shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : sent ? (
          "Sent"
        ) : (
          "Resend"
        )}
      </Button>
    </div>
  )
}
