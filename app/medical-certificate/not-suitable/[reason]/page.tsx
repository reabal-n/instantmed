import { ArrowRight, CheckCircle2, ClipboardList, FileX2, ShieldAlert } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { MarketingFooter } from "@/components/marketing"
import { Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import {
  getUnsupportedMedCertUseCase,
  UNSUPPORTED_MED_CERT_SLUGS,
} from "@/lib/medical-cert/unsupported-use-cases"

interface PageProps {
  params: Promise<{ reason: string }>
}

export const revalidate = 86400

export function generateStaticParams() {
  return UNSUPPORTED_MED_CERT_SLUGS.map((reason) => ({ reason }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reason } = await params
  const useCase = getUnsupportedMedCertUseCase(reason)

  if (!useCase) {
    return {
      title: "Unsupported certificate request | InstantMed",
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `${useCase.title} | InstantMed`,
    description: useCase.summary,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/medical-certificate/not-suitable/${useCase.slug}`,
    },
  }
}

export default async function UnsupportedMedCertReasonPage({ params }: PageProps) {
  const { reason } = await params
  const useCase = getUnsupportedMedCertUseCase(reason)

  if (!useCase) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-linear-to-b from-primary/[0.04] to-background px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-warning-border bg-warning-light px-3 py-1 text-xs font-semibold text-warning">
                <ShieldAlert className="h-3.5 w-3.5" />
                {useCase.eyebrow}
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {useCase.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {useCase.summary}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/medical-certificate">
                    Routine sick certificate
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/what-we-wont-do">What we won&apos;t do</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-6 shadow-md shadow-primary/[0.06]">
              <div className="flex items-start gap-4">
                <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                  <FileX2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Why we block this</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{useCase.whyNot}</p>
                </div>
              </div>

              <div className="mt-6 rounded-md border border-border/60 bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  InstantMed can still help when
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {useCase.instantMedCanHelpWhen}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">What to do instead</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use the pathway that matches the decision being made.</p>
              </div>
            </div>

            <ol className="space-y-3">
              {useCase.nextSteps.map((step, index) => (
                <li
                  key={step}
                  className="grid grid-cols-[2rem_1fr] gap-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm shadow-primary/[0.03]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
