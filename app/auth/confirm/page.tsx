import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthConfirmClient } from "./auth-confirm-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Secure confirmation | InstantMed",
  description: "Confirm a one-time InstantMed account action.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

function ConfirmFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="h-80 w-full max-w-md animate-pulse rounded-2xl border border-border/50 bg-card" />
    </main>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <AuthConfirmClient />
    </Suspense>
  )
}
