"use client"

import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Hospital,
  ListChecks,
  type LucideIcon,
  MessageCircle,
  PhoneCall,
  Route,
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
import { MENTAL_HEALTH_ONLINE_FAQ } from "@/lib/data/mental-health-online-faq"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const REQUEST_HREF = "/request?service=med-cert"
const MONEY_PAGE_HREF = "/medical-certificate-online"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "med-cert",
  analyticsId: "mental-health-online",
  sticky: {
    ctaText: "Request certificate review",
    ctaHref: REQUEST_HREF,
    mobileSummary: "Mental health online - crisis first, certificate review only if suitable",
  },
}

const HERO_FACTS = [
  {
    icon: AlertTriangle,
    label: "Crisis boundary",
    value: "Use urgent support first",
    body: "Call 000 for immediate danger. Call Lifeline 13 11 14 or Suicide Call Back Service 1300 659 467 for crisis support.",
  },
  {
    icon: FileText,
    label: "InstantMed scope",
    value: "Short certificate review",
    body: `If your need is absence evidence, certificate requests start from ${PRICING_DISPLAY.MED_CERT}. A doctor decides after review.`,
  },
  {
    icon: Stethoscope,
    label: "Ongoing care",
    value: "Regular GP first",
    body: "A GP can assess symptoms, safety, physical contributors, care planning, referrals, and Medicare pathways.",
  },
] as const

const PRACTICAL_POINTS = [
  "Online mental health support can be useful for non-crisis discussion, GP review, psychology appointments, digital programs, and follow-up.",
  "InstantMed is not a crisis service, therapy service, psychiatrist service, or Mental Health Treatment Plan provider.",
  `InstantMed can support a short medical certificate request from ${PRICING_DISPLAY.MED_CERT} if the absence is suitable for online doctor review. ${GUARANTEE}`,
  "Immediate danger, self-harm risk, psychosis, mania, intoxication, withdrawal, family violence danger, or inability to stay safe should not wait for an online form.",
] as const

const VISUAL_TEXT_SUMMARIES = [
  {
    title: "Care route labels",
    labels: [
      "Emergency: call 000 for immediate danger, severe agitation, violence risk, or medical emergency",
      "Crisis support: Lifeline, Suicide Call Back Service, Beyond Blue, or local mental health triage",
      "GP review: symptoms, safety, physical contributors, care planning, referrals, and follow-up",
      "Certificate pathway: short absence evidence only if online review is clinically suitable",
      "Ongoing supports: psychology, Medicare Mental Health, workplace supports, and community services",
    ],
  },
  {
    title: "Online boundary labels",
    labels: [
      "Can fit online: non-crisis history, short absence evidence, follow-up planning, and practical support mapping",
      "Needs more: new or worsening symptoms, complex diagnosis, medication changes, substance risk, or unclear safety",
      "Not online-only: self-harm intent, psychosis, mania, severe agitation, family violence danger, or inability to care for yourself",
      "Doctor decision: suitable, more information, in-person care, crisis care, or certificate declined",
    ],
  },
  {
    title: "Medicare and workplace labels",
    labels: [
      "Medicare: Better Access may support eligible services after proper assessment and referral",
      "Usual GP: best place for a Mental Health Treatment Plan and continuity",
      "Work evidence: routine certificates usually do not need a private diagnosis",
      "Cost layers: certificate fee, GP billing, psychology gap fees, public services, and private costs are separate",
      "Privacy: share only what is needed for the purpose unless you choose otherwise",
    ],
  },
] as const

const HOW_ONLINE_CARE_WORKS = [
  {
    icon: PhoneCall,
    title: "Start by separating crisis from routine care",
    body: "The first question is safety. If there is immediate danger, self-harm intent, severe agitation, psychosis, violence risk, or medical emergency, use 000, emergency care, or a crisis line. A routine website form is the wrong first step.",
  },
  {
    icon: Brain,
    title: "Use telehealth for the right parts",
    body: "Telehealth can work well for non-crisis discussion, history-taking, care planning, psychology sessions, GP follow-up, and short absence evidence. It works less well when a clinician needs rapid observation, physical examination, or immediate local support.",
  },
  {
    icon: ClipboardCheck,
    title: "Expect a real safety screen",
    body: "A good review asks about mood, anxiety, sleep, appetite, substances, medicines, physical symptoms, work or study impact, supports, risk of harm, and whether symptoms are new, worsening, or part of an established pattern.",
  },
  {
    icon: Route,
    title: "Match the pathway to the need",
    body: "A certificate is for short absence evidence. A Mental Health Treatment Plan is for structured ongoing care. Crisis care is for immediate safety. Mixing those pathways creates unsafe expectations.",
  },
] as const

const CAN_FIT = [
  "Short mental health absence evidence for work or study, if symptoms are non-urgent and the doctor can assess the request safely.",
  "Preparing for a GP appointment by listing symptoms, timing, triggers, supports, current medicines, and safety concerns.",
  "Non-crisis telehealth discussion with a regular GP or psychologist when privacy, rapport, and follow-up are adequate.",
  "Follow-up after an existing care plan when the treating clinician has enough context and a clear escalation pathway.",
] as const

const NOT_FIT = [
  "Immediate danger to yourself or someone else.",
  "Thoughts of self-harm with intent, plan, access to means, or feeling unable to stay safe.",
  "Hallucinations, delusions, mania, extreme agitation, severe confusion, or aggressive behaviour.",
  "Severe intoxication, withdrawal, overdose concern, or mixing substances with sedating medicines.",
  "Family violence danger, unsafe housing, or coercion where private online discussion is not safe.",
  "New or rapidly worsening symptoms, severe functional decline, or inability to care for yourself or dependants.",
  "A request for therapy, a Mental Health Treatment Plan, crisis counselling, psychiatrist review, or new treatment access through InstantMed.",
] as const

const RED_FLAGS = [
  "Call 000 now if you or someone else is in immediate danger, there is a weapon, severe injury, overdose concern, severe confusion, or risk of violence.",
  "Call 000 or go to emergency if there are suicidal thoughts with intent or plan, inability to stay safe, severe agitation, hallucinations, delusions, mania, or danger to others.",
  "Call Lifeline on 13 11 14, Suicide Call Back Service on 1300 659 467, or Beyond Blue on 1300 22 4636 if you need urgent crisis support and are not in immediate physical danger.",
  "Seek same-day in-person care for severe panic with chest pain, fainting, severe breathlessness, new neurological symptoms, severe dehydration, or symptoms after substance use.",
  "Use a regular GP or mental health professional promptly if low mood, anxiety, insomnia, trauma symptoms, eating changes, or work impairment are persisting or getting worse.",
] as const

const CERTIFICATE_SCOPE = [
  {
    icon: FileText,
    title: "What a certificate can do",
    body: "For a suitable short absence, a certificate can confirm that a doctor assessed you and that you were unable to attend duties for the stated date or dates. It is not a therapy plan, diagnosis letter, workplace dispute report, or capacity assessment.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy still matters",
    body: "Routine absence evidence usually does not need to disclose your private diagnosis. The certificate can focus on assessment, dates, and capacity for attendance. Share more detail only when it is needed and you choose to.",
  },
  {
    icon: XCircle,
    title: "The doctor can decline",
    body: "A decline can be the right safety outcome if symptoms are unsafe, complex, inconsistent, outside scope, or need in-person care. If the doctor declines an InstantMed certificate request, the request is refunded.",
  },
] as const

const MEDICARE_COSTS = [
  {
    icon: WalletCards,
    title: "Certificate request fee",
    body: `InstantMed short medical certificate requests start from ${PRICING_DISPLAY.MED_CERT}. This is private absence documentation, not a Medicare Mental Health Treatment Plan service.`,
  },
  {
    icon: Hospital,
    title: "Public crisis and hospital care",
    body: "Public hospital emergency care is usually covered by Medicare for people with a Medicare number. Private services may have out-of-pocket costs, and crisis support lines are separate from certificate requests.",
  },
  {
    icon: ClipboardCheck,
    title: "Better Access",
    body: "Better Access can support eligible patients with Medicare benefits for selected mental health services after appropriate assessment and referral. Your GP or usual medical practitioner is usually the right starting point.",
  },
  {
    icon: MessageCircle,
    title: "Psychology and digital supports",
    body: "Psychology, social work, occupational therapy, digital mental health programs, employee assistance programs, and community services can all have different access rules, costs, wait times, and referral needs.",
  },
] as const

const GP_REVIEW = [
  {
    title: "Current symptoms and safety",
    body: "Mood, anxiety, sleep, appetite, concentration, panic, trauma symptoms, substances, self-harm thoughts, supports, and whether symptoms are new or worsening.",
  },
  {
    title: "Physical contributors",
    body: "Thyroid disease, anaemia, pain, infection, pregnancy or postpartum context, medicines, alcohol, drugs, sleep disorders, and other medical factors can overlap with mental health symptoms.",
  },
  {
    title: "Care plan and referrals",
    body: "A GP can consider whether a Mental Health Treatment Plan, psychology referral, social work, community supports, workplace adjustment discussion, or specialist care is appropriate.",
  },
  {
    title: "Review and escalation",
    body: "Good mental health care has follow-up. The plan should say what to do if symptoms worsen, who to contact, and when crisis or urgent care should replace routine review.",
  },
] as const

const ALTERNATIVES = [
  {
    title: "Lifeline",
    href: "https://www.lifeline.org.au/",
    body: "24/7 crisis support and suicide prevention support. Call 13 11 14.",
  },
  {
    title: "Suicide Call Back Service",
    href: "https://www.suicidecallbackservice.org.au/",
    body: "24/7 counselling for people affected by suicide or suicidal thoughts. Call 1300 659 467.",
  },
  {
    title: "Beyond Blue",
    href: "https://www.beyondblue.org.au/",
    body: "Support for anxiety, depression, and mental health concerns. Call 1300 22 4636.",
  },
  {
    title: "Medicare Mental Health",
    href: "https://www.medicarementalhealth.gov.au/",
    body: "Free national phone service and local support navigation. Call 1800 595 212 during operating hours.",
  },
] as const

const INTERNAL_LINKS = [
  {
    title: "Medical certificate online",
    href: MONEY_PAGE_HREF,
    body: "The short certificate pathway InstantMed can support when the request is suitable.",
  },
  {
    title: "Anxiety",
    href: "/conditions/anxiety",
    body: "Common symptoms, care boundaries, and when to seek urgent help.",
  },
  {
    title: "Depression",
    href: "/conditions/depression",
    body: "How low mood can affect work, daily function, and care planning.",
  },
  {
    title: "Mental health day",
    href: "/conditions/mental-health-day",
    body: "When short absence evidence may be relevant and when ongoing care is safer.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Severe panic can overlap with physical symptoms. Chest pain needs urgent-care caution.",
  },
  {
    title: "How we decide",
    href: "/how-we-decide",
    body: "How doctor review, safety boundaries, and declines work across InstantMed requests.",
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: Mental health crisis support",
    href: "https://www.healthdirect.gov.au/mental-health-crisis-support",
    body: "Australian crisis guidance, including 000, Lifeline, Beyond Blue, Suicide Call Back Service, and hospital care boundaries.",
  },
  {
    title: "Healthdirect: Mental health helplines",
    href: "https://www.healthdirect.gov.au/mental-health-helplines",
    body: "National mental health helplines and support services for different needs.",
  },
  {
    title: "Australian Government: Better Access initiative",
    href: "https://www.health.gov.au/our-work/better-access-initiative",
    body: "Medicare-supported mental health services under Better Access, including eligibility and service limits.",
  },
  {
    title: "Services Australia: Mental health care and Medicare",
    href: "https://www.servicesaustralia.gov.au/mental-health-care-and-medicare?context=60092",
    body: "Public Medicare information about mental health care, Medicare Mental Health Centres, and Medicare support.",
  },
  {
    title: "Fair Work Ombudsman: Notice and medical certificates",
    href: "https://www.fairwork.gov.au/leave/sick-and-carers-leave/paid-sick-and-carers-leave/notice-and-medical-certificates",
    body: "Workplace evidence rules for paid sick and carer's leave, including medical certificates.",
  },
  {
    title: "Medical Board of Australia: Telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Professional expectations for doctors providing care by telehealth.",
  },
  {
    title: "AHPRA: Virtual care",
    href: "https://www.ahpra.gov.au/Resources/Information-for-practitioners-who-provide-virtual-care.aspx",
    body: "National regulator information for practitioners providing virtual care.",
  },
  {
    title: "Safe Work Australia: Psychosocial hazards",
    href: "https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/mental-health/psychosocial-hazards",
    body: "Workplace mental health and psychosocial hazard context for Australian workers and employers.",
  },
  {
    title: "RACGP: Mental health care in general practice",
    href: "https://www.racgp.org.au/advocacy/position-statements/view-all-position-statements/clinical-and-practice-management/mental-health-care-in-general-practice",
    body: "RACGP position on the central role of general practice in mental health care.",
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
    <Reveal className={cn("rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.05] dark:border-white/15 dark:bg-card dark:shadow-none", className)}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <Heading level="h3" className="text-base">{title}</Heading>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      </div>
    </Reveal>
  )
}

function SectionShell({
  id,
  pill,
  title,
  intro,
  muted = false,
  children,
}: {
  id?: string
  pill: string
  title: string
  intro: string
  muted?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8 lg:py-20", muted && "bg-muted/30 dark:bg-white/[0.02]")}>
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-8 max-w-3xl">
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-4 text-balance">{title}</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{intro}</p>
        </Reveal>
        {children}
      </div>
    </section>
  )
}

function BulletList({
  items,
  tone = "safe",
}: {
  items: readonly string[]
  tone?: "safe" | "urgent" | "neutral"
}) {
  const iconClass =
    tone === "urgent" ? "text-rose-600" : tone === "neutral" ? "text-primary" : "text-success"

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

export function MentalHealthOnlineLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden pb-14 pt-10 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-18">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
              <Reveal instant>
                <SectionPill>Mental health online Australia</SectionPill>
                <Heading level="display" className="mt-5 max-w-4xl">
                  Mental health online Australia - what can wait, and what cannot
                </Heading>
                <p data-speakable className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  Online support can help with non-crisis mental health care, GP follow-up, psychology, and short absence evidence. It is not the right first step for immediate danger, self-harm risk, psychosis, mania, severe agitation, or feeling unable to stay safe.
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
                    <Link href={REQUEST_HREF}>
                      Request certificate review
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#crisis">Check crisis options</Link>
                  </Button>
                </div>
                <p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">
                  InstantMed can only support short medical certificate review when suitable. For immediate danger, call 000. For crisis support, call Lifeline on 13 11 14.
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="rounded-3xl border border-border/50 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">The practical answer</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          If you are unsafe, call 000. If you are distressed but not in immediate danger, use crisis support or a local mental health service first. If the issue is a short work or study absence and no red flags are present, an online certificate request may be appropriate for doctor review.
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
            title="Online mental health care starts with the right level of urgency"
            intro="A useful online mental health page should not pretend every concern belongs in the same form. The safer starting point is to decide whether the person needs emergency care, crisis support, a regular GP, psychology, workplace evidence, or a combination."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {HOW_ONLINE_CARE_WORKS.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="visual-guide"
            pill="Visual guide"
            title="Three maps for safer online mental health decisions"
            intro="The figures below are educational summaries. The same labels are mirrored in HTML for accessibility and indexing."
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
            id="crisis"
            pill="Crisis and red flags"
            title="Do not wait for an online form if safety is in question"
            intro="Mental health red flags are not paperwork problems. If there is immediate risk, use emergency or crisis support first, then sort documentation or follow-up after safety is addressed."
          >
            <Reveal className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-md shadow-primary/[0.04] dark:border-rose-800 dark:bg-rose-950/20 dark:shadow-none">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <Heading level="h3">Use urgent support first</Heading>
                  <div className="mt-4">
                    <BulletList items={RED_FLAGS} tone="urgent" />
                  </div>
                </div>
              </div>
            </Reveal>
          </SectionShell>

          <SectionShell
            id="scope"
            pill="Suitability"
            title="What can fit online, and what should start elsewhere"
            intro="Online care is strongest when the question is clear, risk is low, privacy is safe, and follow-up exists. It is weaker when symptoms are new, severe, unstable, or need local support now."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-emerald-900/60 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <Heading level="h3">May fit online discussion</Heading>
                </div>
                <div className="mt-5">
                  <BulletList items={CAN_FIT} tone="safe" />
                </div>
              </Reveal>

              <Reveal className="rounded-2xl border border-rose-200 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-rose-900/60 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                    <XCircle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <Heading level="h3">Not suitable for online-only review</Heading>
                </div>
                <div className="mt-5">
                  <BulletList items={NOT_FIT} tone="urgent" />
                </div>
              </Reveal>
            </div>
          </SectionShell>

          <SectionShell
            id="certificate"
            pill="Certificate pathway"
            title="A mental health certificate is absence evidence, not ongoing care"
            intro="Mental health can be a valid reason for personal leave. The certificate pathway is still narrow: short absence evidence, doctor review, privacy protection, and clear redirection if the situation is unsafe or outside scope."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {CERTIFICATE_SCOPE.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="medicare-costs"
            pill="Medicare and costs"
            title="Separate certificate cost from GP care, Medicare, and psychology"
            intro="The words online mental health can mean several different things. A private certificate request, a GP appointment, a Mental Health Treatment Plan, psychology sessions, a public crisis service, and an employee assistance program all have different costs and rules."
            muted
          >
            <div className="grid gap-4 md:grid-cols-2">
              {MEDICARE_COSTS.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="gp-review"
            pill="What to expect"
            title="What a GP or mental health clinician usually needs to check"
            intro="A better appointment starts with concrete information. If you can, write down the timeline, impact, supports, safety concerns, and what you need from the review before you speak to the clinician."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {GP_REVIEW.map((item, index) => (
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
            id="support-options"
            pill="Support options"
            title="Where to go when the need is bigger than a certificate"
            intro="These links are not InstantMed referral promises. They are practical Australian starting points for crisis support, service navigation, or ongoing care."
            muted
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
            intro="These links explain active services and related clinical contexts. They do not turn InstantMed into a crisis or therapy provider."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            intro="This page is based on Australian regulator, government, workplace, and clinical sources. It is general information, not personal medical advice."
            muted
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
            title="Mental health online FAQ"
            subtitle="Static answers, also included in FAQPage structured data."
            items={MENTAL_HEALTH_ONLINE_FAQ}
            onFAQOpen={handleFAQOpen}
          />

          <section className="px-4 pb-16 sm:px-6 lg:px-8">
            <Reveal className="mx-auto max-w-4xl rounded-3xl border border-border/50 bg-white p-6 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-8">
              <ListChecks className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <Heading level="h2" className="mt-4">
                Need short absence evidence, not crisis or therapy support?
              </Heading>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                You can request a short medical certificate review. An AHPRA-registered Australian doctor reviews the information and decides whether a certificate is clinically appropriate. If there is any safety concern, use urgent or in-person care first.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" onClick={handleFinalCTA}>
                  <Link href={REQUEST_HREF}>
                    Request certificate review
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={MONEY_PAGE_HREF}>Read the certificate pathway</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{GUARANTEE}</p>
            </Reveal>
          </section>
        </div>
      )}
    </LandingPageShell>
  )
}
