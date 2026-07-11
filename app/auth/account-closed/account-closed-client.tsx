"use client"

import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { clearInstantMedBrowserCaches } from "@/lib/security/browser-cache-cleanup"
import { createClient } from "@/lib/supabase/client"

export function AccountClosedClient() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    void Promise.allSettled([
      clearInstantMedBrowserCaches(),
      supabase.auth.signOut({ scope: "local" }),
    ])
  }, [supabase])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <section
        aria-labelledby="account-closed-title"
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-md shadow-primary/[0.06]"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 id="account-closed-title" className="mt-5 text-2xl font-semibold text-foreground">
          This account is closed
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You&apos;ve been signed out, and signing in again won&apos;t reopen this account. Clinical and payment records are retained as required.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
