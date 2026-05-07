"use client"

import { Loader2 } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/supabase/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type GoogleAccountLinkCardProps = {
  accountLabel: "doctor" | "admin" | "patient"
  redirectPath: string
  className?: string
}

export function GoogleAccountLinkCard({
  accountLabel,
  redirectPath,
  className,
}: GoogleAccountLinkCardProps) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [isLinking, setIsLinking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const linkedProviders = useMemo(() => {
    const providers = new Set<string>()
    const appProviders = user?.app_metadata?.providers
    if (Array.isArray(appProviders)) {
      appProviders.forEach((provider) => {
        if (typeof provider === "string") providers.add(provider)
      })
    }
    user?.identities?.forEach((identity) => {
      if (identity.provider) providers.add(identity.provider)
    })
    return providers
  }, [user?.app_metadata?.providers, user?.identities])

  const googleLinked = linkedProviders.has("google")

  const handleLinkGoogle = useCallback(async () => {
    if (typeof window === "undefined") return
    setIsLinking(true)
    setMessage(null)

    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    })

    if (error) {
      setIsLinking(false)
      setMessage(error.message || "Could not start Google linking.")
    }
  }, [redirectPath, supabase.auth])

  return (
    <div className={cn("space-y-3 rounded-lg bg-muted/35 p-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white">
            <GoogleIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Google sign-in</p>
            <p className="text-xs text-muted-foreground">
              Use Google or email for this {accountLabel} account.
            </p>
          </div>
        </div>
        <Badge variant={googleLinked ? "success" : "outline"} size="sm" className="shrink-0">
          {googleLinked ? "Linked" : "Not linked"}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        This connects Google to your current InstantMed account, so you don&apos;t accidentally create a second profile.
      </p>

      {message && (
        <p className="rounded-md border border-destructive-border bg-destructive-light px-3 py-2 text-xs text-destructive">
          {message}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleLinkGoogle}
        disabled={googleLinked || isLinking}
      >
        {isLinking ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4 mr-2" />
        )}
        {googleLinked ? "Google connected" : "Link Google"}
      </Button>
    </div>
  )
}
