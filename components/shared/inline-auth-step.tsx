"use client"

import { CheckCircle,Loader2, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect,useState } from "react"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/observability/logger"
import { useAuth } from "@/lib/supabase/auth-provider"
import { createClient } from "@/lib/supabase/client"

interface InlineAuthStepProps {
  onBack: () => void
  onAuthComplete: (userId: string, profileId: string) => void
  serviceName: string
}

export function InlineAuthStep({ onBack, onAuthComplete, serviceName }: InlineAuthStepProps) {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)

  // Handle auth - when user is signed in, ensure profile and complete flow
  useEffect(() => {
    const completeAuth = async () => {
      if (!isLoaded || !isSignedIn || !user || profileChecked) return

      setIsLoading(true)
      setProfileChecked(true)

      try {
        // Fetch or create profile from Supabase
        const response = await fetch('/api/profile/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          const { profileId } = await response.json()
          if (profileId) {
            onAuthComplete(user.id, profileId)
            router.refresh()
          }
        } else {
          setError("Failed to set up your profile")
        }
      } catch (err) {
        logger.error("Auth completion error", { component: 'InlineAuthStep' }, err instanceof Error ? err : undefined)
        setError("Failed to complete authentication")
      } finally {
        setIsLoading(false)
      }
    }

    completeAuth()
  }, [isLoaded, isSignedIn, user, profileChecked, onAuthComplete, router])

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    const returnUrl = window.location.pathname + window.location.search
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
      },
    })
    if (oauthError) {
      setError("Failed to start Google sign in")
    }
  }

  const handleEmailSignIn = () => {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    router.push(`/sign-in?redirect=${returnUrl}`)
  }

  // If loading (checking auth status)
  if (isLoading || !isLoaded) {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Completing sign in...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we set up your account</p>
      </div>
    )
  }

  // If already signed in, show authenticated state
  if (isSignedIn && user) {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">You&apos;re signed in</h2>
        <p className="text-sm text-muted-foreground">Continuing to complete your request...</p>
      </div>
    )
  }

  // Default: show sign in options
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
          <Shield className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Almost there!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account or sign in to complete your {serviceName} request
        </p>
      </div>

      {error && <div className="p-3 rounded-xl bg-destructive-light border border-destructive-border text-sm text-destructive">{error}</div>}

      <div className="space-y-3">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-background hover:bg-muted text-foreground border border-border shadow-sm"
        >
          <GoogleIcon className="mr-2 h-5 w-5" />
          Continue with Google
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button onClick={handleEmailSignIn} disabled={isLoading} className="w-full h-12 rounded-xl btn-glow">
          Sign in with email
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">Terms</Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
      </p>

      <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground hover:text-foreground">
        Back to questionnaire
      </Button>
    </div>
  )
}
