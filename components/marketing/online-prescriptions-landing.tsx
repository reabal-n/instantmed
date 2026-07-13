"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  HeartPulse,
  Lock,
  type LucideIcon,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  WalletCards,
  XCircle,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import type { ReactNode, RefObject } from "react"

import { ArticleVisuals } from "@/components/blog/article-visuals"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import type { RenderableArticleVisual } from "@/lib/blog/visuals"
import { ONLINE_PRESCRIPTIONS_FAQ } from "@/lib/data/online-prescriptions-faq"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

// FAQ sits below the fold — lazy-load its client chunk to trim initial JS / TBT.
// ssr stays on (default) so the FAQ content stays server-rendered for SEO.
// Matches the ED / hair-loss / women's-health landing pattern.
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((m) => m.FAQSection),
  { loading: () => <div className="min-h-[300px]" /> },
)

const MONEY_PAGE_HREF = "/prescriptions"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "scripts",
  analyticsId: "online-prescriptions",
  sticky: {
    ctaText: "See repeat prescription service",
    ctaHref: MONEY_PAGE_HREF,
    mobileSummary: "Online prescription guide",
  },
}

const HERO_FACTS = [
  {
    icon: WalletCards,
    label: "Fees",
    value: "Two separate costs",
    body: "A doctor review fee and the pharmacy medicine cost are separate. Current service pricing is listed on the service page.",
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Form first",
    body: "Requests submit 24/7 and are reviewed around the clock. Review timing depends on clinical detail.",
  },
  {
    icon: ShieldCheck,
    label: "Boundary",
    value: "Repeat only",
    body: "For medicines you already take. New, unclear, urgent, or complex requests need another pathway.",
  },
] as const

const HOW_IT_WORKS = [
  {
    title: "Find your current medicine details",
    body: "Use the label, old prescription, pharmacy app, or GP record so the medicine name, strength, dose, and timing are not guessed. The secure form asks for the detail privately, not in the public URL.",
  },
  {
    title: "Complete the safety form",
    body: "The form asks about your medical conditions, allergies, other medicines, recent monitoring, pregnancy or breastfeeding context where relevant, and whether anything has changed since the last prescription.",
  },
  {
    title: "Doctor review",
    body: "An AHPRA-registered Australian doctor reviews the request. They may approve, message or call for more information, decline, or recommend in-person care.",
  },
  {
    title: "eScript if approved",
    body: "If the doctor decides a prescription is clinically appropriate, an electronic prescription token can be sent by SMS or email for use at your chosen pharmacy.",
  },
] as const

const SUITABLE_ITEMS = [
  "You are in Australia, aged 18 or over, and can provide Medicare details for prescription records.",
  "The request is for a medicine previously prescribed to you by a doctor.",
  "Your dose and routine are stable, and you are not asking for a dose increase or treatment change.",
  "You can provide current medicine details, allergies, medical conditions, other medicines, and usual-prescriber context.",
  "Any required monitoring, such as recent blood pressure readings or blood tests, is up to date or available to discuss.",
  "You understand that the doctor may contact you, decline, or recommend in-person care if remote review is not suitable.",
] as const

const NOT_COVERED_ITEMS = [
  "A first prescription for a new or unclear problem.",
  "Controlled, sedating, dependence-forming, or otherwise high-risk medicines.",
  "Emergency symptoms, symptoms worsening quickly, overdose, poisoning, or severe allergic reaction.",
  "Dose changes, side effects, treatment failure, recent hospital care, or missing monitoring results.",
  "Medicines that need physical examination, specialist supervision, real-time monitoring, or regular GP continuity.",
  "Requests that depend on a promised prescription or a specific medicine outcome.",
] as const

const SAFETY_CHECKS = [
  "why you take the medicine and whether the underlying condition is stable",
  "the exact current medicine, strength, dose, frequency, repeats, and last supply",
  "allergies, side effects, pregnancy or breastfeeding context, kidney or liver disease, and other conditions",
  "other prescribed, pharmacy, complementary, or recreational substances that could affect safety",
  "monitoring needs such as blood pressure, blood tests, symptom control, or specialist follow-up where relevant",
  "whether the story suggests in-person care, urgent care, your regular GP, or a pharmacist medication review",
] as const

const RED_FLAGS = [
  "Chest pain, severe shortness of breath, collapse, fainting, blue lips, or stroke symptoms.",
  "Severe allergic reaction, swelling of the face or throat, wheeze, or trouble breathing after a medicine.",
  "Overdose, poisoning, accidental double dosing, severe confusion, or severe drowsiness.",
  "Severe infection signs, high fever with confusion, rapidly worsening pain, or feeling severely unwell.",
  "Suicidal thoughts, immediate mental health danger, or feeling unable to stay safe.",
  "Pregnancy-related bleeding, severe abdominal pain, reduced fetal movement, fainting, or severe vomiting.",
] as const

const SCOPE_CARDS = [
  {
    icon: RotateCcw,
    title: "Covered",
    body: "A one-off doctor review for an existing regular medicine when the history is stable and the doctor has enough information to assess safety.",
  },
  {
    icon: MessageCircle,
    title: "May need contact",
    body: "Unclear medicine details, missing monitoring, new side effects, recent dose changes, or conflicting answers can lead to a call or message before any decision.",
  },
  {
    icon: XCircle,
    title: "Not covered",
    body: "Emergency symptoms, controlled or dependence-forming medicines, complex monitoring, new treatment requests, or a request that depends on a promised result.",
  },
] as const

const COST_AND_ESCRIPT = [
  {
    icon: WalletCards,
    title: "Doctor review fee",
    body: `The service charges a one-off fee for the doctor's review, not pharmacy supply. Current pricing is listed on the repeat prescription service page. ${GUARANTEE}`,
  },
  {
    icon: FileText,
    title: "Medicare and records",
    body: "Medicare details are required for prescription and consultation requests because they support identity, clinical records, and electronic prescribing workflows.",
  },
  {
    icon: ClipboardCheck,
    title: "PBS and pharmacy price",
    body: "If approved, the pharmacy confirms the medicine cost. PBS status, eligibility, brand choice, premiums, and pharmacy pricing can affect what you pay.",
  },
  {
    icon: Lock,
    title: "eScript token",
    body: "An eScript token is a link sent by SMS or email. You present it at your chosen pharmacy, or forward it to a pharmacy if they offer preparation or delivery.",
  },
] as const

const AFTER_SUBMIT = [
  {
    icon: CheckCircle2,
    title: "Approved",
    body: "The doctor decides a prescription is clinically appropriate and sends the outcome digitally. The pharmacy still completes normal dispensing checks.",
  },
  {
    icon: MessageCircle,
    title: "More information",
    body: "The doctor asks for clarification about medicines, monitoring, symptoms, identity, allergies, or usual-prescriber context before deciding.",
  },
  {
    icon: AlertTriangle,
    title: "Declined",
    body: "The request is outside scope or not safe enough online. You are directed to a safer next step and the request is refunded.",
  },
] as const

const INTERNAL_LINKS = [
  {
    title: "Repeat prescription service",
    href: MONEY_PAGE_HREF,
    body: "The main service page for starting a repeat medication review.",
  },
  {
    title: "Asthma",
    href: "/conditions/asthma",
    body: "Regular medicine renewals may be unsafe if breathing symptoms are not controlled.",
  },
  {
    title: "High cholesterol",
    href: "/conditions/high-cholesterol",
    body: "Stable long-term medicines often depend on monitoring and cardiovascular risk context.",
  },
  {
    title: "Type 2 diabetes",
    href: "/conditions/type-2-diabetes",
    body: "Diabetes medicines often need blood test context and continuity with a regular GP.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Chest pain is an urgent-care symptom, not an online prescription request.",
  },
  {
    title: "Medical certificate online",
    href: "/medical-certificate-online",
    body: "For short absence evidence when illness affects work or study attendance.",
  },
] as const

const SOURCES = [
  {
    title: "Medical Board of Australia: Telehealth consultations with patients",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "National Board guidance on telehealth standards, identity, consent, records, prescribing, and when in-person care is needed.",
  },
  {
    title: "Ahpra: Information for practitioners who provide virtual care",
    href: "https://www.ahpra.gov.au/Resources/Information-for-practitioners-who-provide-virtual-care.aspx",
    body: "Professional-obligations guidance for virtual care, including suitability, patient safety, records, and prescribing cautions.",
  },
  {
    title: "TGA: Advertising health services involving therapeutic goods",
    href: "https://www.tga.gov.au/resources/guidance/advertising-health-services-involve-therapeutic-goods",
    body: "Explains why health-service advertising must avoid directly or indirectly promoting therapeutic goods.",
  },
  {
    title: "TGA: Restrictions on advertising prescription medicines to the public",
    href: "https://www.tga.gov.au/resources/guidance/complying-restrictions-advertising-prescription-medicines-public",
    body: "Guidance on avoiding public advertising that implies access to specific prescription medicines or medicine classes.",
  },
  {
    title: "Australian Digital Health Agency: Electronic prescriptions",
    href: "https://www.digitalhealth.gov.au/initiatives-and-programs/electronic-prescriptions",
    body: "Patient information on electronic prescription tokens, pharmacy use, repeats, and Active Script List options.",
  },
  {
    title: "Pharmaceutical Benefits Scheme: About the PBS",
    href: "https://www.pbs.gov.au/about",
    body: "Australian Government information on how the PBS subsidises many necessary medicines for Australians.",
  },
  {
    title: "Healthdirect: Medicines information",
    href: "https://www.healthdirect.gov.au/medicines",
    body: "Australian patient information on medicines, side effects, medicine questions, and safe use.",
  },
  {
    title: "Healthdirect: Side effects of medicines",
    href: "https://www.healthdirect.gov.au/medicine-and-side-effects",
    body: "Patient advice on medicine side effects, adverse reactions, and when to speak with a doctor or pharmacist.",
  },
] as const

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
        <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

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
  intro,
  muted,
  children,
}: {
  id?: string
  pill: string
  title: string
  intro?: string
  muted?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-14 sm:py-16 lg:py-20",
        muted ? "bg-muted/30 dark:bg-background" : "bg-background/95 dark:bg-background",
      )}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-9 max-w-3xl text-center">
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-4 text-balance">
            {title}
          </Heading>
          {intro && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {intro}
            </p>
          )}
        </Reveal>
        {children}
      </div>
    </section>
  )
}

function VisualTextIndex({ visuals }: { visuals: RenderableArticleVisual[] }) {
  if (visuals.length === 0) return null

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {visuals.map((visual) => (
        <div
          key={visual.id}
          className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            {visual.eyebrow}
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{visual.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{visual.summary}</p>
          {visual.textItems && visual.textItems.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {visual.textItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
          <ul className="mt-4 space-y-2">
            {visual.items.map((item) => (
              <li key={item.label} className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{item.label}:</span>{" "}
                {item.detail}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function OnlinePrescriptionsHero({
  isDisabled,
  heroCTARef,
  handleHeroCTA,
}: {
  isDisabled: boolean
  heroCTARef: RefObject<HTMLDivElement>
  handleHeroCTA: () => void
}) {
  return (
    <section className="relative overflow-x-clip bg-background/95 px-4 pb-12 pt-28 dark:bg-background sm:px-6 sm:pb-16 sm:pt-32 lg:px-8 lg:pb-20">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <Reveal className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/50 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card">
              AHPRA-registered doctor review
            </span>
            <span className="rounded-full border border-border/50 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card">
              Repeat prescriptions only
            </span>
          </div>
          <div className="mb-4 h-1.5 w-10 rounded-full bg-brand-coral" aria-hidden="true" />
          <Heading level="display" className="text-balance">
            How online prescriptions work in Australia
          </Heading>
          <p data-speakable className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {FORM_FIRST_WEDGE} This page explains when an online prescription
            request can fit, what information the doctor needs, how fees and
            pharmacy costs differ, and when in-person care is safer.
          </p>
          <div ref={heroCTARef} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" disabled={isDisabled} onClick={handleHeroCTA}>
              <Link href={isDisabled ? "/contact" : MONEY_PAGE_HREF}>
                {isDisabled ? "Contact us" : "See repeat prescription service"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">Read how it works</Link>
            </Button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>
              {GUARANTEE} A prescription is never promised. The doctor may call,
              message, decline, or recommend in-person care.
            </span>
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

export function OnlinePrescriptionsLanding({
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
          <OnlinePrescriptionsHero
            isDisabled={isDisabled}
            heroCTARef={heroCTARef}
            handleHeroCTA={handleHeroCTA}
          />

          <SectionShell
            id="how-it-works"
            pill="How it works"
            title="An online prescription request is a clinical review, not a checkout."
            intro="The useful part of telehealth is not skipping judgement. It is giving the doctor the right information quickly enough to decide whether remote care is appropriate."
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
            id="eligibility"
            pill="Eligibility"
            title="When online repeat review can fit, and when it should not."
            intro="Repeat prescription requests are narrow by design. They work best when the medicine is established, the dose is stable, and the safety picture is clear."
            muted
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
            id="scope"
            pill="Scope"
            title="What is covered, what is not, and why the boundary matters."
            intro="The public page stays medicine-neutral because Australian rules restrict advertising prescription medicines to the public. The secure form collects the private medicine details the doctor needs."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {SCOPE_CARDS.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="safety"
            pill="Safety"
            title="The safety screen looks for reasons online care is not enough."
            intro="A repeat request can become unsafe if the condition has changed, the medicine history is unclear, monitoring is missing, or symptoms point to urgent care."
            muted
          >
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                <div className="mb-5 flex items-start gap-3">
                  <Stethoscope className="mt-0.5 h-6 w-6 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">What the doctor checks</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      These details help the doctor decide whether a repeat prescription is reasonable or whether another care route is safer.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {SAFETY_CHECKS.map((item) => (
                    <div key={item} className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground dark:bg-white/[0.05]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-md shadow-primary/[0.04] dark:border-rose-900/60 dark:bg-card dark:shadow-none">
                <div className="mb-5 flex items-start gap-3">
                  <HeartPulse className="mt-0.5 h-6 w-6 text-rose-600" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Red flags and in-person boundaries</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Call 000 for emergencies. If you are unsure whether a symptom is urgent, choose urgent care first and sort the prescription later.
                    </p>
                  </div>
                </div>
                <Checklist items={RED_FLAGS} tone="caution" />
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="costs"
            pill="Costs"
            title="Medicare, PBS, eScripts, and pharmacy cost are separate pieces."
            intro="The review fee is not the medicine price. The doctor decides whether prescribing is appropriate, then the pharmacy confirms dispensing, PBS eligibility, and final cost."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {COST_AND_ESCRIPT.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="visual-guide"
            pill="Visual guide"
            title="Three practical diagrams for online prescription review."
            intro="These figures explain fit, boundaries, and the eScript/PBS pathway. The same labels and distinctions are also rendered below each image for accessibility and indexing."
            muted
          >
            <ArticleVisuals visuals={visuals} />
            <VisualTextIndex visuals={visuals} />
          </SectionShell>

          <SectionShell
            id="expect"
            pill="What to expect"
            title="After you submit, there are three honest outcomes."
            intro="The doctor reviews the details you provide. Online repeat prescribing is possible only when the clinical information is enough and the request is safe for remote care."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {AFTER_SUBMIT.map((outcome) => (
                <InfoCard key={outcome.title} icon={outcome.icon} title={outcome.title} body={outcome.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="alternatives"
            pill="Alternatives"
            title="Related pages before you choose a pathway."
            intro="A prescription request is not always the right first step. These pages help route stable repeats, urgent symptoms, chronic-disease context, and documentation needs."
            muted
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INTERNAL_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <Heading level="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Read more
                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="sources"
            pill="Sources"
            title="Sources and references"
            intro="This page is written for Australian patients and cites public Australian authorities where possible. Last reviewed: 2026-07."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <p className="text-sm font-semibold text-foreground">{source.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.body}</p>
                </a>
              ))}
            </div>
          </SectionShell>

          <FAQSection
            id="online-prescriptions-faq"
            pill="FAQ"
            title="Online prescriptions FAQ"
            subtitle="Static answers, also included in FAQPage structured data."
            items={ONLINE_PRESCRIPTIONS_FAQ}
            initialCount={8}
            onFAQOpen={handleFAQOpen}
            className="bg-muted/30 dark:bg-background"
          />

          <section className="bg-background/95 px-4 py-10 dark:bg-background sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-4xl rounded-3xl border border-border/50 bg-white p-6 text-center shadow-lg shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-8 lg:p-12">
              <SectionPill>Start here</SectionPill>
              <Heading level="h2" className="mt-4 text-balance">
                Looking for the repeat prescription service?
              </Heading>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                The service page explains the current fee and links to the secure
                form. A doctor still decides whether a prescription is clinically
                appropriate, and contact may be needed.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" disabled={isDisabled} onClick={handleFinalCTA}>
                  <Link href={isDisabled ? "/contact" : MONEY_PAGE_HREF}>
                    {isDisabled ? "Contact us" : "See repeat prescription service"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" onClick={handleHowItWorksCTA}>
                  <Link href="#how-it-works">Review how it works</Link>
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
