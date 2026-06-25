"use client"

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  HeartPulse,
  Lock,
  type LucideIcon,
  ShieldCheck,
  Stethoscope,
  WalletCards,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { ArticleVisuals } from "@/components/blog/article-visuals"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { FAQSection } from "@/components/sections/faq-section"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import type { RenderableArticleVisual } from "@/lib/blog/visuals"
import { PRICING_DISPLAY } from "@/lib/constants"
import { MEDICAL_CERTIFICATE_ONLINE_FAQ } from "@/lib/data/medical-certificate-online-faq"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"
import { GUARANTEE, MED_CERT_WEDGE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const REQUEST_HREF = buildMedCertRequestHref({ duration: "1" })
const MONEY_PAGE_HREF = "/medical-certificate"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "med-cert",
  analyticsId: "medical-certificate-online",
  sticky: {
    ctaText: `Request a certificate - ${PRICING_DISPLAY.FROM_MED_CERT}`,
    ctaHref: REQUEST_HREF,
    mobileSummary: "Medical certificate - Doctor-reviewed",
    responseTime: "Requests submit 24/7",
  },
}

const HERO_FACTS = [
  {
    icon: WalletCards,
    label: "Cost",
    value: PRICING_DISPLAY.FROM_MED_CERT,
    body: `${PRICING_DISPLAY.MED_CERT} for 1 day, ${PRICING_DISPLAY.MED_CERT_2DAY} for 2 days, ${PRICING_DISPLAY.MED_CERT_3DAY} for 3 days.`,
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Form first",
    body: "The secure form takes about 3 minutes. A doctor reviews the request before any certificate is issued.",
  },
  {
    icon: ShieldCheck,
    label: "Boundary",
    value: "Routine only",
    body: "Short sick, carer, or study absence. Urgent symptoms and high-stakes documents need another pathway.",
  },
] as const

const HOW_IT_WORKS = [
  {
    title: "Start the certificate request",
    body: "Choose work, study, or carer leave and tell the doctor what happened, when symptoms started, and which dates you are asking to cover.",
  },
  {
    title: "Complete the safety screen",
    body: "The form checks for symptoms that should not wait for a routine online certificate, such as chest pain, severe breathing trouble, dehydration, severe pain, or mental health crisis.",
  },
  {
    title: "Doctor review",
    body: "An AHPRA-registered Australian doctor reviews the information. They can approve, decline, or ask for more detail if the story is unclear.",
  },
  {
    title: "Digital outcome",
    body: "If approved, the certificate is delivered as a secure PDF with verification details. If declined, the request is refunded.",
  },
] as const

const SUITABLE_ITEMS = [
  "You are in Australia and aged 18 or over.",
  "You need short absence evidence for work, study, or carer's leave.",
  "The absence is 1 to 3 days and the symptoms are non-urgent.",
  "You can clearly describe the symptoms, timing, and impact on your ability to attend duties.",
  "You understand the doctor may decline or recommend in-person care if online review is not suitable.",
] as const

const NOT_COVERED_ITEMS = [
  "Emergency symptoms, severe injury, or symptoms getting worse quickly.",
  "Workers compensation, WorkCover, TAC, NDIS, insurance, court, tribunal, custody, jury, aviation, firearm, or fitness-for-driving documents.",
  "Centrelink medical certificate forms, disability support evidence, long-term capacity reports, or return-to-work capacity assessments.",
  "Exam deferral, special consideration, or assessment-specific university documents that need a different institutional form.",
  "Requests for a guaranteed certificate, guaranteed employer acceptance, or a document that hides clinically important facts.",
] as const

const RED_FLAGS = [
  "Chest pain, pressure, pain spreading to jaw or arm, severe breathlessness, collapse, fainting, or stroke symptoms.",
  "Severe abdominal pain, blood in vomit or stool, severe dehydration, inability to keep fluids down, or vomiting that is not settling.",
  "High fever with confusion, stiff neck, rash that does not fade when pressed, or feeling severely unwell.",
  "Severe headache that is sudden, new neurological symptoms, head injury, or weakness on one side.",
  "Thoughts of self-harm, immediate mental health danger, or feeling unable to stay safe.",
  "Pregnancy-related bleeding, severe pain, reduced fetal movement, fainting, or severe vomiting.",
] as const

const CERTIFICATE_DETAILS = [
  {
    icon: FileText,
    title: "What the certificate usually says",
    body: "Routine certificates focus on whether you were unable to attend work or study duties, the dates covered, and doctor-issued verification details.",
  },
  {
    icon: Lock,
    title: "What it usually does not need",
    body: "Your employer usually does not need your private diagnosis for ordinary personal leave evidence. Employer policies may vary.",
  },
  {
    icon: CalendarDays,
    title: "How long it can cover",
    body: "InstantMed supports routine 1-day, 2-day, and 3-day certificate requests. Longer absences usually need continuity from a GP.",
  },
] as const

const REVIEW_OUTCOMES = [
  {
    icon: CheckCircle2,
    title: "Approved",
    body: "The doctor decides the request is clinically appropriate and issues the PDF certificate for the dates they can support.",
  },
  {
    icon: Clock3,
    title: "More information",
    body: "The doctor asks for clarification if the timing, symptoms, identity details, or requested certificate type is unclear.",
  },
  {
    icon: XCircle,
    title: "Declined",
    body: "The request is outside scope, unsafe, or needs in-person care. The request is refunded and you are directed to the safer option.",
  },
] as const

const INTERNAL_LINKS = [
  {
    title: "Medical certificate service",
    href: MONEY_PAGE_HREF,
    body: "The main service page for starting a short medical certificate request.",
  },
  {
    title: "Cold and flu",
    href: "/conditions/cold-and-flu",
    body: "Common respiratory symptoms that can affect work or study attendance.",
  },
  {
    title: "Gastro",
    href: "/conditions/gastro",
    body: "Vomiting and diarrhoea can require short absence evidence, especially in food-handling roles.",
  },
  {
    title: "Back pain",
    href: "/conditions/back-pain",
    body: "A common reason for short work absence when movement or duties are affected.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Chest pain is not a routine certificate request. Check urgent-care boundaries first.",
  },
  {
    title: "Prescriptions",
    href: "/prescriptions",
    body: "For existing regular medicines, use the repeat prescription review pathway.",
  },
] as const

const SOURCES = [
  {
    title: "Fair Work Ombudsman: Notice and medical certificates",
    href: "https://www.fairwork.gov.au/leave/sick-and-carers-leave/paid-sick-and-carers-leave/notice-and-medical-certificates",
    body: "Explains evidence for paid sick and carer's leave, including medical certificates and the reasonable-person standard.",
  },
  {
    title: "Fair Work Ombudsman: Sick and carer's leave",
    href: "https://www.fairwork.gov.au/leave/sick-and-carers-leave",
    body: "Australian workplace leave context, notice, and evidence requirements.",
  },
  {
    title: "Medical Board of Australia: Telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Guidance on the standard expected of doctors when care is delivered by telehealth.",
  },
  {
    title: "AHPRA: Information for practitioners who provide virtual care",
    href: "https://www.ahpra.gov.au/Resources/Information-for-practitioners-who-provide-virtual-care.aspx",
    body: "National regulator information about professional obligations in virtual care.",
  },
  {
    title: "RACGP: Medical certificates, more than just paperwork",
    href: "https://www1.racgp.org.au/ajgp/2024/supplement-november/medical-certificates",
    body: "Australian GP discussion of medical certificates and why certificate wording matters.",
  },
  {
    title: "Services Australia: Centrelink Medical Certificate form SU415",
    href: "https://www.servicesaustralia.gov.au/su415",
    body: "Shows why Centrelink medical certificates are a different functional-capacity document, not a routine short sick-leave certificate.",
  },
  {
    title: "Healthdirect: Chest pain",
    href: "https://www.healthdirect.gov.au/chest-pain",
    body: "Australian urgent-care advice for chest pain and symptoms that require emergency help.",
  },
  {
    title: "Healthdirect: Vomiting",
    href: "https://www.healthdirect.gov.au/vomiting",
    body: "Australian patient information on vomiting, dehydration, and when to seek urgent medical attention.",
  },
  {
    title: "Healthdirect: Mental health helplines",
    href: "https://www.healthdirect.gov.au/mental-health-helplines",
    body: "Australian crisis and helpline information for suicidal thoughts or mental health crisis.",
  },
] as const

function InfoCard({
  title,
  body,
  icon: Icon,
  className,
}: {
  title: string
  body: string
  icon: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none",
        className,
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function SectionShell({
  id,
  pill,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string
  pill: string
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn("py-10 sm:py-14 lg:py-20", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-4 text-balance">
            {title}
          </Heading>
          {subtitle && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}

function Checklist({
  items,
  tone = "safe",
}: {
  items: readonly string[]
  tone?: "safe" | "caution"
}) {
  const Icon = tone === "safe" ? CheckCircle2 : AlertTriangle
  const iconClass = tone === "safe" ? "text-emerald-600" : "text-amber-600"

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function MedicalCertificateOnlineHero({
  isDisabled,
  heroCTARef,
  handleHeroCTA,
}: {
  isDisabled: boolean
  heroCTARef: React.RefObject<HTMLDivElement>
  handleHeroCTA: () => void
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/6 via-background to-background py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <Reveal className="min-w-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card">
            <Stethoscope className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            AHPRA-registered doctor review
          </div>

          <Heading level="display" className="max-w-3xl text-balance">
            Medical certificate online Australia
          </Heading>

          <p data-speakable className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Request a routine work, study, or carer's leave certificate from home.
            Fill a secure form, an Australian doctor reviews it, and the certificate
            is issued only if clinically appropriate.
          </p>

          <div className="mt-6 rounded-2xl border border-border/50 bg-white p-4 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
            <p className="text-sm font-semibold text-foreground">Practical answer</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {MED_CERT_WEDGE} Prices start at {PRICING_DISPLAY.MED_CERT} for a
              1-day request. You do not need Medicare for this private certificate
              pathway. The boundary is simple: it suits short, non-urgent absence
              evidence, not emergencies, complex legal documents, or long-term
              capacity reports.
            </p>
          </div>

          <div ref={heroCTARef} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" disabled={isDisabled} onClick={handleHeroCTA}>
              <Link href={isDisabled ? "/contact" : REQUEST_HREF}>
                Request doctor review
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={MONEY_PAGE_HREF}>Compare certificate options</Link>
            </Button>
          </div>

          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{GUARANTEE} Employer and institution policies may vary.</span>
          </p>
        </Reveal>

        <Reveal delay={0.06} className="grid gap-3 self-start">
          {HERO_FACTS.map((fact) => (
            <div
              key={fact.label}
              className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <fact.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{fact.label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{fact.value}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{fact.body}</p>
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

export function MedicalCertificateOnlineLanding({
  visuals,
}: {
  visuals: RenderableArticleVisual[]
}) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({
        isDisabled,
        heroCTARef,
        handleHeroCTA,
        handleHowItWorksCTA,
        handleFinalCTA,
        handleFAQOpen,
      }) => (
        <>
          <MedicalCertificateOnlineHero
            isDisabled={isDisabled}
            heroCTARef={heroCTARef}
            handleHeroCTA={handleHeroCTA}
          />

          <SectionShell
            pill="How it works"
            title="A certificate request is a clinical review, not an automatic download."
            subtitle="The form is short because the use case is narrow. The doctor still has to decide whether the request is clinically reasonable."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            pill="Eligibility"
            title="When online review can fit, and when it should not."
            subtitle="The useful question is not whether a certificate is online. It is whether the doctor can responsibly assess the absence without a physical examination or a different legal form."
            className="bg-muted/30 dark:bg-white/[0.02]"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-primary/[0.04] dark:border-emerald-900/60 dark:bg-card dark:shadow-none">
                <div className="mb-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-foreground">Usually suitable to request</h3>
                </div>
                <Checklist items={SUITABLE_ITEMS} />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-md shadow-primary/[0.04] dark:border-amber-900/60 dark:bg-card dark:shadow-none">
                <div className="mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-foreground">Not covered by this pathway</h3>
                </div>
                <Checklist items={NOT_COVERED_ITEMS} tone="caution" />
              </div>
            </div>
          </SectionShell>

          <SectionShell
            pill="Workplace evidence"
            title="Fair Work focuses on reasonable evidence, not the room you were in."
            subtitle="For ordinary sick or carer's leave, the evidence needs to support that you were entitled to the leave. A telehealth certificate can do that when the doctor has enough information and the request is suitable."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {CERTIFICATE_DETAILS.map((item) => (
                <InfoCard key={item.title} title={item.title} body={item.body} icon={item.icon} />
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-border/50 bg-white p-5 text-sm leading-relaxed text-muted-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
              <p>
                Fair Work lists medical certificates and statutory declarations as
                examples of evidence. It does not say that ordinary sick leave evidence
                must come from an in-person appointment. Your employer can still apply
                its own lawful evidence policy, so the safe copy is: doctor-issued,
                clinically assessed, and employer policies may vary.
              </p>
            </div>
          </SectionShell>

          <SectionShell
            pill="Safety"
            title="Use emergency or in-person care when the symptoms are bigger than paperwork."
            subtitle="A certificate can wait. Chest pain, severe dehydration, pregnancy red flags, severe pain, or mental health crisis should not."
            className="bg-rose-50/55 dark:bg-rose-950/10"
          >
            <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-md shadow-primary/[0.04] dark:border-rose-900/60 dark:bg-card dark:shadow-none">
              <div className="mb-5 flex items-start gap-3">
                <HeartPulse className="mt-0.5 h-6 w-6 text-rose-600" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Red flags and urgent boundaries</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Call 000 for emergencies. If you are unsure whether something is
                    urgent, choose urgent care first and sort the certificate later.
                  </p>
                </div>
              </div>
              <Checklist items={RED_FLAGS} tone="caution" />
            </div>
          </SectionShell>

          <SectionShell
            pill="Costs"
            title="Medicare, PBS, and pricing: what matters for certificates."
            subtitle="Medical certificates are private documentation requests. They are different from prescription or consultation pathways."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={WalletCards}
                title="Flat certificate fees"
                body={`The request fee is ${PRICING_DISPLAY.MED_CERT}, ${PRICING_DISPLAY.MED_CERT_2DAY}, or ${PRICING_DISPLAY.MED_CERT_3DAY} depending on the requested duration.`}
              />
              <InfoCard
                icon={ShieldCheck}
                title="No Medicare card required"
                body="Medicare is optional for this private certificate pathway. Prescription and consult pathways have different identity requirements."
              />
              <InfoCard
                icon={ClipboardCheck}
                title="Decline refund"
                body="If the doctor declines the request, the request is refunded. A decline is a clinical safety outcome, not a service failure."
              />
            </div>
          </SectionShell>

          <SectionShell
            pill="Visual guide"
            title="The decision points that matter before you request a certificate."
            subtitle="These figures summarize the scope, safety boundary, and evidence pathway. The same details are rendered in HTML below each image."
            className="bg-muted/30 dark:bg-white/[0.02]"
          >
            <ArticleVisuals visuals={visuals} imageLoading="eager" />
          </SectionShell>

          <SectionShell
            pill="Outcomes"
            title="What can happen after you submit."
            subtitle="The request has three honest outcomes. The fastest one is not always the safest one."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {REVIEW_OUTCOMES.map((outcome) => (
                <InfoCard key={outcome.title} icon={outcome.icon} title={outcome.title} body={outcome.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            pill="Alternatives"
            title="Related pages before you choose a pathway."
            subtitle="If your need is not a routine short certificate, one of these routes may fit better."
            className="bg-muted/30 dark:bg-white/[0.02]"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INTERNAL_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    {item.title}
                    <ArrowRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </Link>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            pill="Sources"
            title="References used for this page."
            subtitle="This page is written for Australian patients and cites public Australian authorities where possible."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <h3 className="text-base font-semibold text-foreground">{source.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{source.body}</p>
                </a>
              ))}
            </div>
          </SectionShell>

          <FAQSection
            id="medical-certificate-online-faq"
            pill="FAQ"
            title="Online medical certificate questions"
            subtitle="Static answers, also included in FAQPage structured data."
            items={MEDICAL_CERTIFICATE_ONLINE_FAQ}
            initialCount={6}
            onFAQOpen={handleFAQOpen}
          />

          <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-4xl rounded-3xl border border-border/50 bg-white p-6 text-center shadow-lg shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-8 lg:p-12">
              <SectionPill>Start here</SectionPill>
              <Heading level="h2" className="mt-4 text-balance">
                Request a medical certificate review online.
              </Heading>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Complete the secure form. A doctor reviews and decides whether a
                certificate is clinically appropriate. No guaranteed issue, no
                guaranteed employer outcome.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" disabled={isDisabled} onClick={handleFinalCTA}>
                  <Link href={isDisabled ? "/contact" : REQUEST_HREF}>
                    Request doctor review
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" onClick={handleHowItWorksCTA}>
                  <Link href={MONEY_PAGE_HREF}>See the main service page</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{GUARANTEE}</p>
            </div>
          </section>
        </>
      )}
    </LandingPageShell>
  )
}
