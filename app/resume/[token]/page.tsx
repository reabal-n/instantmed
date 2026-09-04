import { ArrowRight, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BrandLogo } from "@/components/shared/brand-logo"
import { Button } from "@/components/ui/button"
import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"

import { continueGuestCheckoutResume } from "./actions"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Continue to secure payment | InstantMed",
  description: "Continue an InstantMed request to secure payment.",
  robots: { index: false, follow: false },
  referrer: "strict-origin",
}

export default async function ResumeCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ recovery_proof?: string }>
}) {
  const { token } = await params
  const tokenResult = verifyCheckoutResumeToken(token)

  if (!tokenResult) {
    redirect("/request?error=expired_link")
  }

  const query = await searchParams
  const continueAction = continueGuestCheckoutResume.bind(
    null,
    token,
    query.recovery_proof ?? null,
  )

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-16"
    >
      <section
        aria-labelledby="resume-checkout-title"
        className="w-full max-w-md rounded-2xl border border-border/50 bg-white p-8 text-center shadow-md shadow-primary/[0.06] dark:bg-card"
      >
        <BrandLogo size="md" className="mb-7 justify-center" priority />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Secure checkout
        </p>
        <h1
          id="resume-checkout-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
        >
          Continue your saved request
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your request stays unchanged until you choose to continue. We&apos;ll
          check it again before opening secure payment.
        </p>

        <form action={continueAction} className="mt-6">
          <Button type="submit" className="h-12 w-full rounded-xl">
            Continue to secure payment
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </section>
    </main>
  )
}
