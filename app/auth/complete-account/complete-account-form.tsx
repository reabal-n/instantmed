"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Check, Loader2, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import confetti from "canvas-confetti"

export function CompleteAccountForm({
  requestId,
  email,
}: {
  requestId?: string
  email?: string
  /** @deprecated sessionId is kept for backwards compatibility but no longer used */
  sessionId?: string
}) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !requestId) {
      setError("Missing required information")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      console.log("[v0] Creating account for guest:", email)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        console.error("[v0] Auth error:", authError)
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError("Failed to create account")
        return
      }

      console.log("[v0] Account created, user ID:", authData.user.id)

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.6 },
      })

      setTimeout(() => {
        router.push(`/patient/requests/success?request_id=${requestId}`)
      }, 1000)
    } catch (err) {
      console.error("[v0] Error completing account:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8 glass-card">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Create your account to access your medical certificate and track your request.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email || ""} disabled className="bg-muted/50" />
        </div>

        <div>
          <Label htmlFor="password">Create Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a secure password"
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || !password || password.length < 8}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Create Account & Access Certificate
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Already have an account?{" "}
        <a href={`/auth/login?redirect=/patient/requests/${requestId}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </Card>
  )
}
