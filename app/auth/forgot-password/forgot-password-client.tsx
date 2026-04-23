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


export function ForgotPasswordClient() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await requestPasswordReset(email)
      if (result.success) {
        setIsSuccess(true)
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
        <main className="min-h-screen bg-hero pt-32 pb-20">
          <div className="max-w-md mx-auto px-4">
            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-success-light flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Check Your Email</h1>
              <p className="text-muted-foreground mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset
                your password.
              </p>
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button onClick={() => setIsSuccess(false)} className="text-primary-600 hover:text-primary-700 hover:underline">
                  try again
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
      <main className="min-h-screen bg-hero pt-32 pb-20">
        <div className="max-w-md mx-auto px-4">
          <div className="glass-card rounded-3xl p-8">
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
              <h1 className="text-2xl font-semibold">Forgot Password?</h1>
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="rounded-xl"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full rounded-xl h-12 bg-primary hover:bg-primary-600 shadow-soft hover:shadow-soft-md">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/sign-in" className="text-primary-600 hover:text-primary-700 hover:underline">
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
