"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogIn, UserPlus, ArrowRight, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

interface ServiceAuthGateProps {
  title?: string
  description?: string
}

export function ServiceAuthGate({
  title = "Sign in to continue",
  description = "Create an account or log in to submit your request.",
}: ServiceAuthGateProps) {
  const pathname = usePathname()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Encode the current path for redirect after auth
  const redirectParam = encodeURIComponent(pathname)

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const supabase = createClient()
      const redirectUrl =
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${window.location.origin}/auth/callback?redirect=${redirectParam}`

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      })
    } catch (error) {
      console.error("Google sign-in error:", error)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="glass-card rounded-2xl p-8 max-w-md mx-auto text-center animate-scale-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 mx-auto shadow-lg shadow-primary/20">
        <LogIn className="h-7 w-7 text-primary-foreground" />
      </div>

      <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button asChild className="w-full rounded-xl btn-glow">
          <Link href={`/auth/register?redirect=${redirectParam}`}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create account
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full rounded-xl bg-white/50 hover:bg-white/80">
          <Link href={`/auth/login?redirect=${redirectParam}`}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign in with email
          </Link>
        </Button>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        Already have an account with pending requests?{" "}
        <Link href={`/auth/login?redirect=${redirectParam}`} className="text-primary hover:underline">
          Check your dashboard
          <ArrowRight className="inline ml-0.5 h-3 w-3" />
        </Link>
      </p>
    </div>
  )
}
