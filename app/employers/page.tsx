import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { BulkVerificationPanel } from "@/components/employers/bulk-verification-panel"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

export const metadata: Metadata = {
  title: "Certificate Verification for Employers | InstantMed",
  description:
    "HR teams can verify InstantMed medical certificate authenticity, check document dates, and confirm privacy-limited certificate details without seeing diagnosis information.",
  openGraph: {
    title: "Certificate Verification for Employers | InstantMed",
    description:
      "Verify InstantMed certificate authenticity with privacy-limited results for HR and payroll teams.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/employers",
  },
}

const trustPrimitives = [
  {
    icon: Search,
    label: getApprovedClaim("employer_verify_authenticity"),
  },
  {
    icon: LockKeyhole,
    label: getApprovedClaim("employer_privacy_limited"),
  },
  {
    icon: BadgeCheck,
    label: "AHPRA doctor details",
  },
  {
    icon: FileCheck2,
    label: "Policy stays with you",
  },
] as const

const confirmationItems = [
  "Whether the code matches an InstantMed certificate",
  "The certificate type and issue date",
  "The stated absence period on the document",
  "A masked patient name for document matching",
  "The issuing clinic and doctor line",
  "Whether the certificate has been revoked or replaced",
]

const faqs = [
  {
    question: "Does verification show the employee's diagnosis?",
    answer:
      "No. The result is privacy-limited and only shows document facts needed to compare the certificate.",
  },
  {
    question: "Does InstantMed decide whether a workplace should accept a certificate?",
    answer:
      "No. Verification confirms whether the document matches our records. Your workplace policy and the circumstances still matter.",
  },
  {
    question: "Can HR teams verify more than one certificate?",
    answer:
      "Yes. Paste up to 25 certificate codes into the bulk checker on this page.",
  },
]

export default function EmployersPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script
        id="employer-faq-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <Navbar variant="marketing" />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-hero pt-28 pb-14 sm:pt-32 sm:pb-18">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:px-10">
            <div>
              <Badge variant="info" shape="pill" className="mb-5">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                For employers and HR teams
              </Badge>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Certificate verification for HR teams
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Check whether an InstantMed medical certificate matches our
                records, without exposing diagnosis details or turning HR into
                a clinical reviewer.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6">
                  <Link href="#bulk-verifier">
                    <Search className="h-4 w-4" aria-hidden />
                    Bulk verify
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <Link href="/verify">Single certificate</Link>
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {trustPrimitives.map((item) => {
                  const Icon = item.icon
                  return (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm shadow-primary/[0.03] dark:bg-card"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {item.label}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:bg-card dark:shadow-none">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Verification result
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Privacy-limited certificate match
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  Verified
                </Badge>
              </div>
              <div className="space-y-3 py-5">
                {[
                  ["Certificate", "IM-WORK-20260101-04827391"],
                  ["Patient", "S... M..."],
                  ["Period", "08 Jan 2026 to 09 Jan 2026"],
                  ["Type", "Work medical certificate"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-info-border bg-info-light px-4 py-3 text-sm text-info">
                Confirms document authenticity only. Workplace decisions stay
                with your policy.
              </div>
            </div>
          </div>
        </section>

        <RegulatoryPartners className="border-y border-border/30 bg-muted/20 dark:bg-white/[0.02]" />

        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
            <BulkVerificationPanel />
          </div>
        </section>

        <section className="border-y border-border/40 bg-muted/25 py-14 dark:bg-white/[0.03] sm:py-16">
          <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                What verification confirms
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Enough to compare the certificate. Nothing extra.
              </h2>
              <p className="mt-4 text-muted-foreground">
                The result is deliberately narrow. HR gets authenticity,
                dates, and a masked identity check. Medical details stay out of
                the workplace verification flow.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {confirmationItems.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <p className="text-sm text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                HR operating note
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
                Verification is not a policy override.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                If a code verifies, it means the document matches our records.
                Your organisation still decides how it handles evidence,
                absence rules, and any follow-up with the employee.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Check the code",
                  body: "Match the reference on the PDF or QR result against the verification response.",
                },
                {
                  title: "Compare the dates",
                  body: "Use the stated period and issue date. Do not ask for diagnosis details.",
                },
                {
                  title: "Escalate carefully",
                  body: `If something looks wrong, email ${CONTACT_EMAIL} with the certificate reference only.`,
                },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-border/60 bg-white p-5 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/25 py-12 dark:bg-white/[0.03]">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Need help with a certificate reference?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send the certificate reference only. Do not send employee
                medical details unless we ask for them.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Contact support
              </a>
            </Button>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
