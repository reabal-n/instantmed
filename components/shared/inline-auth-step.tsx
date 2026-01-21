"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Loader2, Shield, CheckCircle } from "lucide-react"
import { logger } from "@/lib/observability/logger"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

interface InlineAuthStepProps {
  onBack: () => void
  onAuthComplete: (userId: string, profileId: string) => void
  serviceName: string
}

export function InlineAuthStep({ onBack, onAuthComplete, serviceName }: InlineAuthStepProps) {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()
  const { openSignIn } = useClerk()

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)

  // Handle auth - when user is signed in via Clerk, ensure profile and complete flow
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

  const handleSignIn = () => {
    // Open Clerk sign-in modal or redirect
    const returnUrl = window.location.pathname + window.location.search
    openSignIn({
      afterSignInUrl: returnUrl,
      afterSignUpUrl: returnUrl,
    })
  }

  const handleEmailSignIn = () => {
    // Redirect to sign-in page with return URL
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

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      <div className="space-y-3">
        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
        >
          <GoogleIcon className="mr-2 h-5 w-5" />
          Continue with Google
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">or</span>
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
