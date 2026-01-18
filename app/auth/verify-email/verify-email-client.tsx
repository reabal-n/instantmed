"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
} from "lucide-react"
import { resendVerificationEmail } from "@/app/actions/resend-verification"

interface VerifyEmailClientProps {
  email?: string | null
  error?: string | null
  isVerified: boolean
}

export function VerifyEmailClient({ email, error, isVerified }: VerifyEmailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle")
  const [resendError, setResendError] = useState<string | null>(null)

  const handleResend = () => {
    setResendStatus("idle")
    setResendError(null)
    
    startTransition(async () => {
      const result = await resendVerificationEmail()
      
      if (result.success) {
        setResendStatus("success")
      } else {
        setResendStatus("error")
        setResendError(result.error || "Failed to send verification email")
      }
    })
  }

  const handleCheckVerification = () => {
    router.refresh()
  }

  // Success state
  if (isVerified) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Email verified</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been verified. You can now access all features.
          </p>

          <Button asChild className="w-full sm:w-auto">
            <Link href="/patient">
              Continue to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Pending verification state
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-6">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-muted-foreground mb-2">
          We sent a verification link to:
        </p>
        {email && (
          <p className="font-medium text-foreground mb-6">{email}</p>
        )}

        {/* Error display */}
        {(error || resendError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error || resendError}</span>
          </div>
        )}

        {/* Resend success */}
        {resendStatus === "success" && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Verification email sent. Check your inbox.</span>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={isPending}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Sending..." : "Resend verification email"}
          </Button>

          <Button
            onClick={handleCheckVerification}
            className="w-full"
          >
            I&apos;ve verified my email
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
