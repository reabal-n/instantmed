import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  HeartPulse,
  type LucideIcon,
  Pill,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Timer,
} from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { FaqCtaSection } from "@/components/marketing/sections/faq-cta-section"
import { WaitCounter } from "@/components/marketing/wait-counter"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
} from "@/components/seo/healthcare-schema"
import { Button } from "@/components/ui/button"
import { getWaitState } from "@/lib/brand/wait-counter"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { GUARANTEE, GUARANTEE_LABEL } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

/**
 * `/consult` · the canonical detailed services index.
 *
 * Preserves the SEO surface for "online doctor" queries while routing every
 * visitor to one of the active structured services InstantMed actually
 * accepts. Each service gets a substantive block (price, who-it's-for,
 * what's included, how-it-works, CTA) so the page does the heavy lifting
 * of explaining the offering up front.
 *
 * History: replaced the General Consult landing page on 2026-05-20 with a
 * thin services overview. Rebuilt as the detailed services index on
 * 2026-05-25 so the page earns the traffic Google sends it instead of
 * bouncing visitors into a generic card grid.
 */

interface DetailedService {
  id: string
  slug: string
  name: string
  href: string
  priceLabel: string
  priceTier?: string
  icon: LucideIcon
  accent: string
  forWho: string
  includes: string[]
  steps: [string, string, string]
  ctaLabel: string
}

const services: DetailedService[] = [
  {
    id: "med-cert",
    slug: "med-cert-sick",
    name: "Medical certificate",
    href: "/request?service=med-cert",
    priceLabel: `From ${PRICING_DISPLAY.MED_CERT}`,
    priceTier: `1 day ${PRICING_DISPLAY.MED_CERT} · 2 day ${PRICING_DISPLAY.MED_CERT_2DAY} · 3 day ${PRICING_DISPLAY.MED_CERT_3DAY}`,
    icon: FileText,
    accent: "text-primary bg-primary/10",
    forWho:
      "You're unwell today and need a certificate for work, study, or to support a family member.",
    includes: [
      "1, 2, or 3-day duration",
      "PDF certificate with a verifiable reference number",
      "Reviewed during AEST hours by an Australian doctor",
      GUARANTEE,
    ],
    steps: [
      "Tell us what's going on (4 short questions)",
      "Doctor reviews in writing during AEST hours",
      "Certificate delivered to your dashboard and email",
    ],
    ctaLabel: "Start a certificate",
  },
  {
    id: "repeat-script",
    slug: "common-scripts",
    name: "Repeat prescription",
    href: "/request?service=prescription",
    priceLabel: PRICING_DISPLAY.REPEAT_SCRIPT,
    icon: Pill,
    accent: "text-success bg-success-light",
    forWho:
      "You're already on a medication you trust and just need a fresh script without a clinic visit.",
    includes: [
      "eScript token delivered to your phone",
      "Accepted at every chemist in Australia",
      "Reviewed during AEST hours by an Australian doctor",
      GUARANTEE,
    ],
    steps: [
      "Search and confirm your medication",
      "Doctor reviews your history",
      "eScript token sent the moment it's written",
    ],
    ctaLabel: "Start a repeat",
  },
  {
    id: "ed",
    slug: "consult-ed",
    name: "ED assessment",
    href: "/request?service=consult&subtype=ed",
    priceLabel: PRICING_DISPLAY.MENS_HEALTH,
    icon: HeartPulse,
    accent: "text-brand-coral bg-brand-coral/10",
    forWho:
      "You'd like help with erections and prefer a structured, private consult over a clinic appointment.",
    includes: [
      "Validated IIEF-5 screening",
      "Daily, as-needed, or doctor-decides options",
      "eScript if clinically appropriate",
      GUARANTEE,
    ],
    steps: [
      "Confidential intake (about 10 minutes)",
      "Doctor reviews safety + preferences",
      "eScript or a clear next step in writing",
    ],
    ctaLabel: "Start ED assessment",
  },
  {
    id: "hair-loss",
    slug: "consult-hair-loss",
    name: "Hair loss assessment",
    href: "/request?service=consult&subtype=hair_loss",
    priceLabel: PRICING_DISPLAY.HAIR_LOSS,
    icon: Scissors,
    accent: "text-primary bg-primary/10",
    forWho:
      "You're noticing thinning or recession and want to slow or reverse it without the GP back-and-forth.",
    includes: [
      "Norwood-scale visual + medical history",
      "Doctor reviews treatment suitability",
      "eScript if clinically appropriate",
      GUARANTEE,
    ],
    steps: [
      "Tell us your goals and history",
      "Doctor reviews against safety screen",
      "Approved treatment, referral, or a clear next step",
    ],
    ctaLabel: "Start hair loss assessment",
  },
  {
    id: "womens-health",
    slug: "consult-womens-health",
    name: "Women's health",
    href: "/request?service=consult&subtype=womens_health",
    priceLabel: PRICING_DISPLAY.WOMENS_HEALTH,
    icon: ShieldCheck,
    accent: "text-primary bg-primary/10",
    forWho:
      "You have UTI symptoms, or you want to start, switch, or continue the contraceptive pill, without the clinic wait.",
    includes: [
      "Structured UTI or contraception screen with safety checks",
      "Doctor reviews suitability",
      "eScript if clinically appropriate",
      GUARANTEE,
    ],
    steps: [
      "Tell us your symptoms or what you need",
      "Doctor reviews against the safety screen",
      "eScript, referral, or a clear next step in writing",
    ],
    ctaLabel: "Start women's health assessment",
  },
]

interface ComingSoonService {
  id: string
  name: string
  description: string
  icon: LucideIcon
  priceLabel: string
}

const comingSoon: ComingSoonService[] = [
  {
    id: "weight_loss",
    name: "Weight management",
    description: "Structured program for weight management with clinician oversight.",
    icon: Briefcase,
    priceLabel: "Coming soon",
  },
]

const overviewFaqs = [
  {
    question: "Will the doctor call me?",
    answer:
      "Our services are form-first. The doctor reviews your questionnaire and responds in writing with a decision, a prescription, or a referral. We only call if something clinically important is missing.",
  },
  {
    question: "Can I get a prescription online?",
    answer:
      "Yes, through the specific services above. Repeat Prescription for medication you already take. ED or Hair Loss Assessment for those conditions. Medical Certificate doesn't involve prescribing.",
  },
  {
    question: "How is this different from a GP visit?",
    answer:
      "You get an AHPRA-registered Australian doctor without the waiting room, for the conditions we treat. We can't physically examine you, so anything that needs an in-person exam still needs a GP.",
  },
  {
    question: "Is my information private?",
    answer:
      "Doctor-patient confidentiality applies fully. Health information is encrypted and never shared with employers, insurers, or third parties. This is a private service, so nothing appears on your Medicare statement.",
  },
  {
    question: "How much does it cost?",
    answer: `Medical certificates from ${PRICING_DISPLAY.MED_CERT}. Repeat prescriptions ${PRICING_DISPLAY.REPEAT_SCRIPT}. ED, hair loss, and women's health assessments ${PRICING_DISPLAY.MENS_HEALTH}. Flat fee, no Medicare rebate. ${GUARANTEE}`,
  },
  {
    question: "What if my concern doesn't fit any of these?",
    answer:
      "See your regular GP. We're a focused service; sending you to the right person beats taking your money for something outside our scope. If it's urgent, call your GP, an after-hours service, or 000.",
  },
  {
    question: "What about referrals or pathology requests?",
    answer:
      "Not offered as a standalone service yet. If a referral or test is clinically appropriate during one of our active services, the doctor will include it at no extra charge.",
  },
]

export const metadata: Metadata = {
  title: "Online Doctor Services in Australia | InstantMed",
  description:
    `See an Australian doctor online for medical certificates, repeat prescriptions, ED, hair loss, or women's health. Form-first review, no waiting room, AHPRA-registered. From ${PRICING_DISPLAY.MED_CERT}.`,
  openGraph: {
    title: "Online Doctor Services | InstantMed",
    description:
      "Medical certificates, repeat prescriptions, ED, hair loss, and women's health assessments. Form-first review by Australian doctors.",
    type: "website",
    url: "https://instantmed.com.au/consult",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Doctor Services | InstantMed",
    description:
      "Medical certificates, repeat prescriptions, ED, hair loss, and women's health assessments. Form-first review by Australian doctors.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/consult",
  },
}

export default async function ConsultOverviewPage() {
  const liveWait = await getWaitState()
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Online Doctor Services", url: "https://instantmed.com.au/consult" },
        ]}
      />
      {services.map((service) => (
        <MedicalServiceSchema
          key={service.id}
          name={service.name}
          description={service.forWho}
          price={String(
            service.id === "med-cert"
              ? PRICING.MED_CERT
              : service.id === "repeat-script"
                ? PRICING.REPEAT_SCRIPT
                : service.id === "ed"
                  ? PRICING.MENS_HEALTH
                  : service.id === "womens-health"
                    ? PRICING.WOMENS_HEALTH
                    : PRICING.HAIR_LOSS,
          )}
        />
      ))}
      <FAQSchema faqs={overviewFaqs} />
      <HealthArticleSchema
        title="Online Doctor Services in Australia"
        description="Medical certificates, repeat prescriptions, ED, hair loss, and women's health assessments. Form-first review by AHPRA-registered Australian doctors."
        url="/consult"
      />

      {/* Hero · tightened mobile padding so the first service card peeks
          into a 375x812 viewport before the patient scrolls (2026-05-25
          video-review fix). */}
      <section className="border-b border-border/40 bg-background pt-8 pb-8 sm:pt-16 sm:pb-10 lg:pt-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:mb-4">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            See an Australian doctor online
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            We treat focused services, properly. Pick the one that fits and a doctor responds in writing.
          </p>
          {/* Brand signature device #1 · live wait counter (BRAND.md §6.1).
              WaitCounter self-hides when the data source returns variant='hidden'. */}
          <div className="mt-4 flex items-center justify-center">
            <WaitCounter state={liveWait} variant="inline" />
          </div>
          <ul className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:mt-6">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              AHPRA-registered doctors
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Reviewed during AEST hours
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              {GUARANTEE_LABEL}
            </li>
          </ul>
        </div>
      </section>

      {/* Editorial lifestyle photo, primary. Sits between the hero and the
          services grid as a warm visual handoff. */}
      <section aria-hidden="true" className="bg-background pt-2 pb-6 sm:pt-4 sm:pb-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/40 shadow-md shadow-primary/[0.06]">
            <Image
              src="/images/consult-1.webp"
              alt="Person on a quiet phone consult with an Australian doctor"
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 1024px) calc(100vw - 4rem), 768px"
            />
          </div>
        </div>
      </section>

      {/* Active services · detailed blocks */}
      <section id="services" className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.id}
                id={service.id}
                className="flex flex-col rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] transition-shadow duration-200 hover:shadow-lg dark:bg-card sm:p-8"
              >
                {/* Header: icon + name + price */}
                <header className="flex items-start gap-4">
                  <span
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                      service.accent,
                    )}
                    aria-hidden="true"
                  >
                    <service.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {service.name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {service.priceLabel}
                    </p>
                    {service.priceTier ? (
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {service.priceTier}
                      </p>
                    ) : null}
                  </div>
                </header>

                <p className="mt-4 text-sm text-muted-foreground">{service.forWho}</p>

                {/* What's included */}
                <ul className="mt-4 space-y-2">
                  {service.includes.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {/* How it works · compact numbered steps */}
                <ol className="mt-5 space-y-2 rounded-xl border border-border/40 bg-muted/30 p-4">
                  {service.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 flex-1" />

                <Button asChild size="lg" className="mt-2 w-full">
                  <Link href={service.href}>
                    {service.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>

          {/* Coming soon · quieter, greyed cards */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {comingSoon.map((service) => (
              <div
                key={service.id}
                className="relative flex items-start gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-5 opacity-80"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <service.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      Coming soon
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Outside-our-scope footnote · one quiet line, no amber alert. */}
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Outside our scope? See your regular GP. Urgent? Call your GP, an after-hours service, or
            000.
          </p>
        </div>
      </section>

      {/* Trust + how it works at a glance · single calm strip */}
      <section className="border-t border-border/40 bg-muted/20 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ul className="grid gap-6 text-center sm:grid-cols-3">
            <li>
              <ClipboardCheck className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Structured intake</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Form-first means the doctor has what they need on first read.
              </p>
            </li>
            <li>
              <Timer className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">AEST-hours review</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reviewed by an Australian doctor during AEST hours. No appointment, no waiting room.
              </p>
            </li>
            <li>
              <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">{GUARANTEE_LABEL}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {GUARANTEE} We'd rather route you correctly than keep your money.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <FaqCtaSection
        faqs={overviewFaqs}
        subtitle="Everything about our online doctor services."
      />
    </>
  )
}
