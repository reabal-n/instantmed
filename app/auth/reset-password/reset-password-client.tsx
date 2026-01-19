"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"


export function ResetPasswordClient() {
  const router = useRouter()
  const _searchParams = useSearchParams()
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [_isSuccess, _setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    try {
      // This app uses Supabase Auth.
      // Direct users to the standard password reset flow.
      setError("Please use the 'Forgot password?' link on the sign-in page to reset your password.")
      setTimeout(() => {
        router.push("/auth/forgot-password")
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (_isSuccess) {
    return (
      <>
        <Navbar variant="marketing" />
        <main className="min-h-screen bg-hero pt-32 pb-20">
          <div className="container max-w-md mx-auto px-4">
            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Password Reset</h1>
              <p className="text-muted-foreground mb-6">Your password has been updated. Redirecting to login...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar variant="marketing" />
      <main className="min-h-screen bg-hero pt-32 pb-20">
        <div className="container max-w-md mx-auto px-4">
          <div className="glass-card rounded-3xl p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Reset Your Password</h1>
              <p className="text-muted-foreground mt-2">Enter your new password below</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full rounded-xl h-12 bg-primary hover:bg-primary-600 shadow-soft hover:shadow-soft-md">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 hover:underline">
                Sign in
              </Link>
            </p>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              If this page doesn&apos;t work, use the{" "}
              <Link href="/auth/forgot-password" className="text-primary-600 hover:text-primary-700 hover:underline">
                password reset page
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
