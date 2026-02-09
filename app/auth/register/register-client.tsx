"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/supabase-auth-provider"
import { isValidRedirect } from "@/lib/utils"


export function RegisterClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams?.get("redirect") || "/account"
  // Validate and sanitize redirect URL to prevent open redirect attacks
  const redirectTo = isValidRedirect(rawRedirect) ? rawRedirect : "/account"
  const { isSignedIn, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isSignedIn) {
        // Already signed in, go to redirect destination
        router.replace(redirectTo)
      } else {
        // Redirect to sign-up page
        const signUpUrl = `/auth/register?redirect=${encodeURIComponent(redirectTo)}`
        router.replace(signUpUrl)
      }
    }
  }, [isLoading, isSignedIn, router, redirectTo])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to sign up...</p>
      </div>
    </div>
  )
}
