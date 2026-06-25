"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Hospital,
  Info,
  ListChecks,
  type LucideIcon,
  MessageCircle,
  Route,
  ShieldCheck,
  Stethoscope,
  TestTube2,
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
import { WEIGHT_LOSS_ONLINE_FAQ } from "@/lib/data/weight-loss-online-faq"
import { cn } from "@/lib/utils"

const ACTIVE_SERVICES_HREF = "/consult"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "consult",
  analyticsId: "weight-loss-online",
  sticky: {
    ctaText: "View active services",
    ctaHref: ACTIVE_SERVICES_HREF,
    mobileSummary: "Weight management guide - service not currently accepting requests",
  },
}

const HERO_FACTS = [
  {
    icon: XCircle,
    label: "InstantMed status",
    value: "Not accepting requests",
    body: "Weight-management treatment requests remain gated. This page explains safe review standards and where to go next.",
  },
  {
    icon: Hospital,
    label: "Best first step",
    value: "Regular GP",
    body: "A GP can check measurements, blood pressure, pathology, history, medicines, and follow-up needs.",
  },
  {
    icon: ShieldCheck,
    label: "Care boundary",
    value: "No shortcuts",
    body: "Prescription decisions, if considered elsewhere, need private clinical assessment and monitoring. They are never guaranteed.",
  },
] as const

const PRACTICAL_POINTS = [
  "InstantMed is not currently accepting online weight-management treatment requests.",
  "A safe Australian review is usually more than a form: it may need blood pressure, pathology, current medicine review, mental health screening, and follow-up.",
  "Some people are better served by a regular GP, in-person clinic, allied health team, or specialist service from the start.",
  "Public pages should not advertise prescription-only treatment options. This page explains the assessment and safety boundaries instead.",
] as const

const VISUAL_TEXT_SUMMARIES = [
  {
    title: "Review map labels",
    labels: [
      "Health goal: risk reduction, mobility, sleep, diabetes risk, or another clear health reason",
      "Measurements: height, weight, waist context, blood pressure, and BMI limitations",
      "BMI limitation: BMI does not show muscle, fat distribution, or health status",
      "Clinical context: conditions, medicines, pregnancy context, mental health, and eating history",
      "Clinical decision: a complete picture informs safe, individualised care",
      "Monitoring: pathology, follow-up, and in-person care when needed",
      "Possible review outcomes: proceed with a plan, uncertain and review, or escalate to in-person care",
    ],
  },
  {
    title: "Red-flag flow labels",
    labels: [
      "Stop: emergency symptoms need urgent care first",
      "Emergency: chest pain, severe breathlessness, collapse, or stroke symptoms",
      "Same-day care: severe abdominal pain, vomiting, dehydration, fainting, or blood in vomit or stool",
      "GP review: unintentional rapid weight loss, pregnancy, eating-disorder risk, or severe mood symptoms",
      "Online later: routine education can wait until immediate safety is handled",
    ],
  },
  {
    title: "Cost-boundary labels",
    labels: [
      "Clinical review: history, measurements, suitability, and safety boundaries",
      "Monitoring: blood pressure, pathology, follow-up, and review results",
      "Pharmacy and PBS: eligibility, supply, brand choice, and final cost are separate",
      "Ongoing plan: GP follow-up, dietitian support, exercise physiology, psychology, or specialist care",
      "Clinical governance and records: privacy protected, secure records, documented decisions, and care coordination",
      "Possible checkpoint outcomes: proceed, uncertain, or escalate",
    ],
  },
] as const

const HOW_REVIEW_WORKS = [
  {
    icon: ClipboardCheck,
    title: "Start with health goals and history",
    body: "Good care begins with why weight management is being considered: health risk reduction, mobility, sleep, fertility, diabetes risk, blood pressure, cholesterol, liver health, or another specific concern. It should also ask about previous supports and what was realistic for the person.",
  },
  {
    icon: Activity,
    title: "Use measurements as clues, not judgement",
    body: "BMI and waist measures can help estimate risk, but they are imperfect. Ethnicity, pregnancy, age, sex, disability, athletic build, muscle mass, and fat distribution can change how useful the numbers are.",
  },
  {
    icon: TestTube2,
    title: "Check for causes and complications",
    body: "A clinician may need blood pressure, blood tests, sleep-apnoea risk, diabetes risk, thyroid context, liver-health markers, cardiovascular risk, eating patterns, alcohol intake, mood, sleep, medicines, and family history.",
  },
  {
    icon: MessageCircle,
    title: "Decide whether remote care is enough",
    body: "Telehealth can support triage and follow-up when it is safe, but it is not suitable for every patient. The clinician should move care in person when examination, urgent assessment, monitoring, or continuity is needed.",
  },
] as const

const ELIGIBILITY = [
  "Adults who can provide accurate height, weight, medical history, current medicines, allergies, and recent measurements.",
  "People seeking health-focused support rather than cosmetic or rapid-result promises.",
  "People who can arrange blood pressure checks, pathology, and follow-up with a regular GP or local clinic when needed.",
  "People who understand that treatment options are considered privately by a clinician and are not guaranteed.",
] as const

const NOT_SUITABLE = [
  "Children or adolescents.",
  "Pregnancy, trying to conceive, or breastfeeding unless managed by an appropriate clinician.",
  "Current or past eating disorder, rapid restriction, purging, laxative misuse, or intense fear of weight gain.",
  "Severe depression, self-harm thoughts, psychosis, mania, or immediate safety concerns.",
  "Unexplained weight gain or unintentional weight loss without trying.",
  "Severe abdominal symptoms, fainting, persistent vomiting, dehydration, or blood in vomit or stool.",
  "Complex medical history, recent surgery, active cancer treatment, advanced kidney or liver disease, or unstable heart symptoms.",
  "Requests driven by a specific publicly advertised medicine, brand, dose, or promised result.",
] as const

const SAFETY_TOPICS = [
  {
    icon: HeartPulse,
    title: "Metabolic and heart-health risk",
    body: "Weight can be linked with blood pressure, cholesterol, type 2 diabetes, fatty liver disease, sleep apnoea, osteoarthritis, fertility concerns, and cardiovascular risk. Review should look for the pattern, not just the number.",
  },
  {
    icon: Stethoscope,
    title: "Medicine and condition context",
    body: "Some existing medicines and medical conditions affect weight, appetite, fluid balance, sleep, mood, or treatment safety. A safe review needs the full medicine list and relevant diagnoses.",
  },
  {
    icon: ShieldCheck,
    title: "Stigma-aware care",
    body: "Weight management should be person-first and health-focused. Before-and-after pressure, body-shaming, and quick-result messaging can harm trust and can miss the medical complexity.",
  },
  {
    icon: FileText,
    title: "Advertising boundary",
    body: "Australian advertising rules restrict public promotion of prescription-only medicines. Public information should explain service scope and safety limits without steering people toward a named option.",
  },
] as const

const RED_FLAGS = [
  "Call 000 for chest pain, severe breathlessness, collapse, stroke symptoms, severe allergic reaction, severe bleeding, or immediate danger.",
  "Seek urgent or same-day care for severe abdominal pain, persistent vomiting, dehydration, fainting, confusion, fever with severe illness, blood in vomit or stool, or severe weakness.",
  "See a doctor promptly for unintentional rapid weight loss, night sweats, new lumps, black stools, persistent diarrhoea, or weight change with feeling generally unwell.",
  "Use urgent mental health support or emergency care for self-harm thoughts, feeling unable to stay safe, severe depression, mania, psychosis, or dangerous restriction or purging.",
  "Use in-person care if you are pregnant, breastfeeding, under 18, recently had bariatric surgery, have an eating-disorder history, or need physical examination or pathology before any decision.",
] as const

const COSTS = [
  {
    icon: WalletCards,
    title: "No InstantMed fee for this pathway",
    body: "Because InstantMed is not accepting weight-management treatment requests, there is no active InstantMed consultation fee or checkout path for this page.",
  },
  {
    icon: FileText,
    title: "Medicare depends on the service",
    body: "A regular GP may be able to advise on Medicare-funded care planning, allied health referral options, or other supports when eligibility rules are met. Private telehealth programs may not attract a rebate.",
  },
  {
    icon: Hospital,
    title: "PBS and pharmacy cost are separate",
    body: "PBS subsidy, private cost, brand choice, supply rules, and pharmacy pricing depend on the specific item, indication, eligibility, and pharmacy process. Confirm this with the treating clinician and pharmacist.",
  },
  {
    icon: Route,
    title: "Ongoing care can cost more than the first visit",
    body: "Weight management often involves follow-up, monitoring, pathology, allied health, lifestyle supports, and sometimes specialist review. The first appointment is rarely the whole plan.",
  },
] as const

const WHAT_TO_EXPECT = [
  {
    title: "A baseline health check",
    body: "Expect a clinician to ask about weight history, waist or BMI context, blood pressure, sleep, alcohol, physical activity, nutrition, medications, pregnancy context, mental health, family history, and previous supports.",
  },
  {
    title: "Tests when clinically needed",
    body: "Depending on your situation, a GP may consider blood sugar, lipids, liver tests, kidney function, thyroid testing, pregnancy testing, or other checks before deciding what is safe.",
  },
  {
    title: "A realistic plan",
    body: "A useful plan usually sets health-focused goals, safety monitoring, follow-up intervals, nutrition and activity supports, and clear criteria for review or escalation.",
  },
  {
    title: "A decision, not a guarantee",
    body: "If prescription-only treatment is considered by another service or your GP, the clinician still decides privately whether it is appropriate. Declining or redirecting can be the safer decision.",
  },
] as const

const ALTERNATIVES = [
  {
    title: "Regular GP",
    href: "https://www.healthdirect.gov.au/obesity",
    body: "Best first point for medical history, measurements, pathology, chronic disease planning, referrals, and continuity.",
    external: true,
  },
  {
    title: "Accredited practising dietitian",
    href: "https://dietitiansaustralia.org.au/find-a-dietitian",
    body: "Useful for food, appetite, medical conditions, cultural preferences, affordability, and sustainable eating patterns.",
    external: true,
  },
  {
    title: "Exercise physiologist",
    href: "https://www.essa.org.au/find-aep",
    body: "Useful when pain, fatigue, disability, heart risk, diabetes, or low fitness makes generic exercise advice unsafe or unrealistic.",
    external: true,
  },
  {
    title: "Psychologist or mental health clinician",
    href: "https://www.healthdirect.gov.au/mental-health",
    body: "Important when eating patterns, mood, trauma, stress, sleep, self-esteem, or disordered eating are part of the picture.",
    external: true,
  },
] as const

const INTERNAL_LINKS = [
  {
    title: "Online prescriptions",
    href: "/online-prescriptions",
    body: "How repeat prescription review, eScripts, PBS context, and pharmacy costs work in Australia.",
  },
  {
    title: "Online doctor services",
    href: "/consult",
    body: "The current active InstantMed service list, separate from the gated weight-management pathway.",
  },
  {
    title: "How doctors decide",
    href: "/how-we-decide",
    body: "How InstantMed handles approval, decline, safety boundaries, and in-person care recommendations.",
  },
  {
    title: "Clinical governance",
    href: "/clinical-governance",
    body: "The safety model behind scoped asynchronous telehealth requests.",
  },
  {
    title: "Type 2 diabetes",
    href: "/conditions/type-2-diabetes",
    body: "A related metabolic condition where weight, monitoring, medicines, and GP follow-up can overlap.",
  },
  {
    title: "High cholesterol",
    href: "/conditions/high-cholesterol",
    body: "Cardiovascular risk context that often belongs in a broader weight-management review.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Chest pain is urgent-care territory, not an online weight-management request.",
  },
  {
    title: "Men's health",
    href: "/mens-health",
    body: "ED and hair-loss review are active scoped services, with their own safety boundaries.",
  },
] as const

const SOURCES = [
  {
    title: "healthdirect: obesity",
    href: "https://www.healthdirect.gov.au/obesity",
    body: "Australian patient information on obesity, causes, health risks, and when to seek help.",
  },
  {
    title: "healthdirect: BMI and waist circumference",
    href: "https://www.healthdirect.gov.au/body-mass-index-bmi-and-waist-circumference",
    body: "Patient information on BMI, waist circumference, risk context, and measurement limitations.",
  },
  {
    title: "Australian Government Department of Health: overweight and obesity",
    href: "https://www.health.gov.au/topics/overweight-and-obesity/about",
    body: "Government overview of overweight and obesity as a public-health risk factor.",
  },
  {
    title: "Australian Government Department of Health: BMI and waist measurement",
    href: "https://www.health.gov.au/topics/overweight-and-obesity/bmi-and-waist",
    body: "Government BMI categories and waist-measurement guidance for adults.",
  },
  {
    title: "Ahpra: telehealth and virtual care",
    href: "https://www.ahpra.gov.au/Resources/Information-for-practitioners-who-provide-virtual-care.aspx",
    body: "Regulator guidance on when telehealth is clinically appropriate and when in-person care is needed.",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Guidance on telehealth standards, assessment, prescribing, documentation, and real-time consultation expectations.",
  },
  {
    title: "TGA: what can and cannot be advertised",
    href: "https://www.tga.gov.au/products/regulations-all-products/advertising/advertising-basics/what-can-and-cannot-be-advertised-general-public",
    body: "Australian restrictions on public advertising of prescription-only therapeutic goods.",
  },
  {
    title: "TGA: advertising health services involving therapeutic goods",
    href: "https://www.tga.gov.au/resources/guidance/advertising-health-services-involve-therapeutic-goods",
    body: "Guidance for health-service advertising when therapeutic goods may be involved.",
  },
  {
    title: "TGA: weight management claims in advertising",
    href: "https://www.tga.gov.au/products/regulations-all-products/advertising/specialised-advertising-issues-and-topics/requirements-weight-management-claims-advertising",
    body: "Requirements for weight-management claims in therapeutic-goods advertising.",
  },
  {
    title: "RACGP: obesity prevention and management",
    href: "https://www.racgp.org.au/advocacy/position-statements/view-all-position-statements/clinical-and-practice-management/obesity-prevention-and-management",
    body: "Professional context on the role of general practice, person-first language, and stigma-aware obesity management.",
  },
  {
    title: "PBS: Pharmaceutical Benefits Scheme",
    href: "https://www.pbs.gov.au/pbs/home",
    body: "Official PBS entry point for medicine eligibility and subsidy information.",
  },
] as const

function InfoCard({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon: LucideIcon
  title: string
  body: string
  className?: string
}) {
  return (
    <Reveal
      className={cn(
        "rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <Heading level="h3" className="mt-4 text-base">
        {title}
      </Heading>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </Reveal>
  )
}

function SectionShell({
  id,
  pill,
  title,
  intro,
  children,
  muted,
}: {
  id: string
  pill: string
  title: string
  intro?: string
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-14 sm:py-16 lg:py-24", muted && "bg-muted/30 dark:bg-white/[0.02]")}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal instant>
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-4 max-w-3xl">
            {title}
          </Heading>
          {intro && <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{intro}</p>}
        </Reveal>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  )
}

function BulletList({
  items,
  tone = "neutral",
}: {
  items: readonly string[]
  tone?: "neutral" | "safe" | "caution" | "urgent"
}) {
  const iconClass =
    tone === "safe"
      ? "text-success"
      : tone === "urgent"
        ? "text-destructive"
        : tone === "caution"
          ? "text-amber-600"
          : "text-primary"

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
          {tone === "urgent" ? (
            <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
          ) : (
            <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function WeightLossOnlineLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden pb-14 pt-10 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-18">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
              <Reveal instant>
                <SectionPill>Weight loss online Australia</SectionPill>
                <Heading level="display" className="mt-5 max-w-4xl">
                  Weight loss online Australia - what safe review really needs
                </Heading>
                <p data-speakable className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  InstantMed is not currently accepting weight-management treatment requests. This page explains what safe Australian online review should include, when in-person care is safer, and how Medicare, PBS, pharmacy cost, and follow-up fit together.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {HERO_FACTS.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/50 bg-white/90 p-4 shadow-md shadow-primary/[0.05] dark:border-white/15 dark:bg-card dark:shadow-none">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
                      </div>
                      <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                    </div>
                  ))}
                </div>

                <div ref={heroCTARef} className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" onClick={handleHeroCTA}>
                    <Link href={ACTIVE_SERVICES_HREF}>
                      View active services
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#red-flags">Check red flags</Link>
                  </Button>
                </div>
                <p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">
                  No weight-management prescription request can be started from this page. For urgent symptoms, call 000 or seek urgent care.
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="rounded-3xl border border-border/50 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">The practical answer</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Online review can be useful for triage, history, education, and follow-up when the clinical picture is stable. It should not replace a GP-led assessment when the person needs examination, pathology, blood pressure checks, medication review, or ongoing monitoring.
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {PRACTICAL_POINTS.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </section>

          <SectionShell
            id="how-it-works"
            pill="How it works"
            title="A safe review is a clinical assessment, not a product menu"
            intro="Weight management is high-context care. The useful question is not just whether a person wants to lose weight. It is whether the clinician has enough information to identify risks, choose the right level of care, and arrange monitoring."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {HOW_REVIEW_WORKS.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="visual-guide"
            pill="Visual guide"
            title="Three ways to think about online weight-management review"
            intro="The visuals below are educational summaries only. They are mirrored in the page text for accessibility and indexing."
            muted
          >
            <ArticleVisuals visuals={visuals} imageLoading="lazy" />
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {VISUAL_TEXT_SUMMARIES.map((visual) => (
                <Reveal key={visual.title} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.05] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <Heading level="h3" className="text-base">{visual.title}</Heading>
                  <ul className="mt-3 space-y-2">
                    {visual.labels.map((label) => (
                      <li key={label} className="text-sm leading-6 text-muted-foreground">{label}</li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="eligibility"
            pill="Eligibility"
            title="Who may fit remote discussion, and who should start in person"
            intro="InstantMed is not accepting this request type, but these boundaries are still useful when comparing Australian services or preparing for your GP appointment."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <Heading level="h3">May be suitable for remote discussion</Heading>
                </div>
                <div className="mt-5">
                  <BulletList items={ELIGIBILITY} tone="safe" />
                </div>
              </Reveal>

              <Reveal className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                    <XCircle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <Heading level="h3">Often needs in-person or regular GP care</Heading>
                </div>
                <div className="mt-5">
                  <BulletList items={NOT_SUITABLE} tone="urgent" />
                </div>
              </Reveal>
            </div>
          </SectionShell>

          <SectionShell
            id="safety"
            pill="Safety"
            title="What a clinician needs to check"
            intro="Weight management can be affected by biology, environment, medicines, sleep, mental health, previous trauma, income, disability, culture, family history, and access to food and activity options. Good care should not reduce that to a single number."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {SAFETY_TOPICS.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="red-flags"
            pill="Red flags"
            title="When to see someone in person or urgently"
            intro="Some symptoms are not weight-management admin. Handle immediate safety first, then sort longer-term planning after the risk is addressed."
            muted
          >
            <Reveal className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-md shadow-primary/[0.04] dark:border-rose-800 dark:bg-rose-950/20 dark:shadow-none">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <Heading level="h3">Do not wait for an online form</Heading>
                  <div className="mt-4">
                    <BulletList items={RED_FLAGS} tone="urgent" />
                  </div>
                </div>
              </div>
            </Reveal>
          </SectionShell>

          <SectionShell
            id="costs"
            pill="Medicare, PBS and costs"
            title="Separate the review, monitoring, pharmacy, and subsidy questions"
            intro="A common mistake is comparing only the headline appointment price. Weight management often involves several cost layers, and some are outside the telehealth provider."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {COSTS.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="what-to-expect"
            pill="What to expect"
            title="What a good GP or clinic review usually covers"
            intro="If you take this topic to your GP, you can make the appointment more useful by bringing current measurements, a medicine list, relevant pathology, and your main health goals."
            muted
          >
            <div className="grid gap-4 md:grid-cols-2">
              {WHAT_TO_EXPECT.map((item, index) => (
                <Reveal key={item.title} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <Heading level="h3" className="text-base">{item.title}</Heading>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="alternatives"
            pill="Alternatives"
            title="The safer route may be a team, not a single online request"
            intro="The right support depends on the medical context and what is realistic in the person's life. These are common starting points, not referral promises from InstantMed."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {ALTERNATIVES.map((item) => (
                <Reveal key={item.title} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <Heading level="h3" className="text-base">
                    <a href={item.href} target="_blank" rel="noreferrer" className="hover:text-primary">
                      {item.title}
                    </a>
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="related"
            pill="Related pages"
            title="Related InstantMed pages"
            intro="These links explain active services and related health contexts. They do not open a weight-management request."
            muted
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {INTERNAL_LINKS.map((item) => (
                <Reveal key={item.href} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.05] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <Heading level="h3" className="text-base">
                    <Link href={item.href} className="hover:text-primary">
                      {item.title}
                    </Link>
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="sources"
            pill="Sources"
            title="Sources and references"
            intro="This page is based on Australian regulator, government, and clinical sources. It is general information, not personal medical advice."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {SOURCES.map((source) => (
                <Reveal key={source.href} className="rounded-2xl border border-border/50 bg-white p-4 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <a href={source.href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground hover:text-primary">
                    {source.title}
                  </a>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{source.body}</p>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <FAQSection
            id="faq"
            pill="FAQ"
            title="Weight loss online FAQ"
            subtitle="Static answers, also included in FAQPage structured data."
            items={WEIGHT_LOSS_ONLINE_FAQ}
            onFAQOpen={handleFAQOpen}
          />

          <section className="px-4 pb-16 sm:px-6 lg:px-8">
            <Reveal className="mx-auto max-w-4xl rounded-3xl border border-border/50 bg-white p-6 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-8">
              <ListChecks className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <Heading level="h2" className="mt-4">
                Need an InstantMed service that is currently active?
              </Heading>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                View the scoped services InstantMed currently accepts. AHPRA-registered Australian doctors review submitted requests and decide what is clinically appropriate. Weight-management treatment requests are not currently accepted.
              </p>
              <div className="mt-6">
                <Button asChild size="lg" onClick={handleFinalCTA}>
                  <Link href={ACTIVE_SERVICES_HREF}>
                    View active services
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </section>
        </div>
      )}
    </LandingPageShell>
  )
}
