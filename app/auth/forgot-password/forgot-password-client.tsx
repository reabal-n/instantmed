"use client"

import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

import { requestPasswordReset } from "@/app/actions/account"
import { StickerIcon } from "@/components/icons/stickers"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PASSWORD_RESET_RESEND_COOLDOWN_MS = 30 * 1000
const PASSWORD_RESET_COOLDOWN_MESSAGE = "Give it 30 seconds before sending another reset email."

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [lastResetLinkSentAt, setLastResetLinkSentAt] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (lastResetLinkSentAt && Date.now() - lastResetLinkSentAt < PASSWORD_RESET_RESEND_COOLDOWN_MS) {
      setError(PASSWORD_RESET_COOLDOWN_MESSAGE)
      setIsSuccess(false)
      return
    }

    setIsLoading(true)

    try {
      const result = await requestPasswordReset(email)
      if (result.success) {
        setIsSuccess(true)
        setLastResetLinkSentAt(Date.now())
        toast.success("Reset link sent to your email")
      } else {
        setError(result.error || "Failed to send reset link")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <>
        <Navbar variant="marketing" />
        <main className="min-h-screen bg-background pt-32 pb-20">
          <div className="max-w-md mx-auto px-4">
            <div className="rounded-2xl border border-border/50 bg-white p-8 text-center shadow-md shadow-primary/[0.06] dark:bg-card">
              <div className="mx-auto w-16 h-16 rounded-full bg-success-light flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
              <p className="text-muted-foreground mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset
                your password.
              </p>
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button onClick={() => setIsSuccess(false)} className="font-medium text-primary hover:text-primary/80 hover:underline">
                  Send another reset email
                </button>
              </p>
            </div>
          </div>
        </main>
        <Footer variant="minimal" />
      </>
    )
  }

  return (
    <>
      <Navbar variant="marketing" />
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="max-w-md mx-auto px-4">
          <div className="rounded-2xl border border-border/50 bg-white p-8 shadow-md shadow-primary/[0.06] dark:bg-card">
            <Link
              href="/sign-in"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>

            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <StickerIcon name="email" size={64} />
              </div>
              <h1 className="text-2xl font-semibold">Forgot password?</h1>
              <p className="text-muted-foreground mt-2">No worries, we&apos;ll send you reset instructions.</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive-light border border-destructive-border text-destructive text-sm mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                    setLastResetLinkSentAt(null)
                  }}
                  placeholder="Enter your email"
                  className="rounded-xl"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading || !email.trim()} className="w-full rounded-xl h-12">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/sign-in" className="font-medium text-primary hover:text-primary/80 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}
