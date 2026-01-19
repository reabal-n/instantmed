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
import { BrandLogo } from "@/components/shared/brand-logo"

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
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <div className="absolute top-6 left-6">
          <BrandLogo size="sm" href="/" />
        </div>
        
        <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight mb-2">Email verified</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been verified. You can now access all features.
          </p>

          <Button asChild className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-primary/25">
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="absolute top-6 left-6">
        <BrandLogo size="sm" href="/" />
      </div>
      
      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6">
          <Mail className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">Check your email</h1>
        <p className="text-muted-foreground mb-1 text-sm">
          We sent a verification link to:
        </p>
        {email && (
          <p className="font-medium text-foreground mb-6">{email}</p>
        )}

        {/* Error display */}
        {(error || resendError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error || resendError}</span>
          </div>
        )}

        {/* Resend success */}
        {resendStatus === "success" && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-left">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Verification email sent. Check your inbox.</span>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={isPending}
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Sending..." : "Resend verification email"}
          </Button>

          <Button
            onClick={handleCheckVerification}
            className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            I&apos;ve verified my email
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <Link href="/contact" className="text-primary hover:text-primary/80 font-medium transition-colors">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
