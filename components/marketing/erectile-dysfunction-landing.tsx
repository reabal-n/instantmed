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
  ShieldCheck,
  Stethoscope,
  WalletCards,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import type { RenderableArticleVisual } from "@/lib/blog/visuals"
import { PRICING_DISPLAY } from "@/lib/constants"
import { ED_FAQ } from "@/lib/data/ed-faq"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

// Below-fold sections are code-split to keep the /erectile-dysfunction route JS
// under budget (mirrors the hair-loss landing). ssr stays on (default) so the
// FAQ + content-hub links remain server-rendered for SEO.
const ArticleVisuals = dynamic(
  () => import("@/components/blog/article-visuals").then((m) => m.ArticleVisuals),
  { loading: () => <div className="min-h-[200px]" /> },
)
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((m) => m.FAQSection),
  { loading: () => <div className="min-h-[300px]" /> },
)
const ContentHubLinks = dynamic(
  () => import("@/components/seo").then((m) => m.ContentHubLinks),
  { loading: () => <div className="min-h-[120px]" /> },
)

const ASSESSMENT_HREF = "/request?service=consult&subtype=ed"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "ed",
  analyticsId: "ed",
  sticky: {
    ctaText: `Start ED assessment - ${PRICING_DISPLAY.MENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "ED concerns - Doctor-reviewed",
    responseTime: "Doctor review during 8am-10pm AEST",
  },
}

const HERO_FACTS = [
  {
    icon: WalletCards,
    label: "Cost",
    value: PRICING_DISPLAY.MENS_HEALTH,
    body: "One-off doctor review. Pharmacy cost is separate if a prescription is approved.",
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Form first",
    body: "The secure form takes about 3 minutes. Review timing depends on clinical detail and queue volume.",
  },
  {
    icon: ShieldCheck,
    label: "Boundary",
    value: "Safety-led",
    body: "Chest pain, chest-pain medicine use, unstable heart symptoms, or unclear medicines can mean contact, decline, or in-person care.",
  },
] as const

const HOW_IT_WORKS = [
  {
    title: "Start the ED pathway",
    body: "Choose erectile dysfunction assessment and complete the private form. The page does not ask you to choose a medicine.",
  },
  {
    title: "Complete the safety screen",
    body: "Answer questions about erection symptoms, duration, heart health, chest-pain medicines, blood pressure context, other medicines, and relevant medical history.",
  },
  {
    title: "Doctor review",
    body: "An AHPRA-registered Australian doctor reviews the request and may call or message if a safety detail needs clarification.",
  },
  {
    title: "Outcome sent digitally",
    body: "If online care is suitable and a prescription is clinically appropriate, the outcome is sent digitally. Declined requests are refunded.",
  },
] as const

const SUITABLE_ITEMS = [
  "You are in Australia and aged 18 or over.",
  "You have ongoing difficulty getting or keeping an erection and can describe the pattern clearly.",
  "You can provide current medicine details, heart-health history, blood pressure context, allergies, and relevant medical conditions.",
  "You do not have chest pain, unstable heart symptoms, a recent serious cardiovascular event, or an erection lasting more than 4 hours.",
  "You understand the doctor may call, decline, or recommend in-person care if remote review is not safe enough.",
] as const

const NOT_COVERED_ITEMS = [
  "Chest pain, severe shortness of breath, collapse, stroke symptoms, or symptoms that make sexual activity unsafe.",
  "An erection lasting more than 4 hours, a painful erection, penile injury, or sudden severe genital pain.",
  "Use of certain chest-pain heart medicines, or uncertainty about whether a current medicine affects sexual-activity safety.",
  "New low libido, fertility concerns, premature ejaculation, penile curvature, testosterone investigation, or complex sexual-health symptoms as the main concern.",
  "Requests for a named medicine, a guaranteed prescription, or treatment without doctor review.",
] as const

const ED_CONTEXT = [
  {
    title: "Blood flow and heart health",
    body: "ED can be linked with blood-vessel health. High blood pressure, diabetes, cholesterol, smoking, and cardiovascular disease are part of the clinical picture the doctor considers.",
  },
  {
    title: "Medicines and safety",
    body: "Some medicines and heart conditions make common ED medicines unsafe. That is why the form asks about chest-pain medicines, blood pressure context, and your full medicine list.",
  },
  {
    title: "Stress, sleep, and mental health",
    body: "Anxiety, low mood, relationship stress, alcohol, and sleep problems can contribute. Online prescribing is not the right answer for every pattern.",
  },
] as const

const SAFETY_CHECKS = [
  "chest pain, exertional symptoms, breathlessness, fainting, palpitations, and exercise tolerance",
  "chest-pain heart medicines, blood pressure medicines, and interaction risks",
  "recent heart attack, stroke, heart procedure, unstable angina, or specialist heart advice",
  "diabetes, high blood pressure, high cholesterol, smoking, sleep apnoea, and other vascular risk factors",
  "penile pain, injury, curvature, prolonged erection, urinary symptoms, or genital symptoms that need examination",
  "mental health, alcohol or substance use, relationship context, and whether counselling or GP follow-up may be safer",
] as const

const COVERED_ITEMS = [
  {
    icon: ClipboardCheck,
    title: "Covered",
    body: "A structured doctor review for erectile dysfunction concerns when the history and safety screen give enough information for remote assessment.",
  },
  {
    icon: HeartPulse,
    title: "May need contact",
    body: "Unclear medicines, cardiovascular risk, inconsistent answers, or symptoms that do not fit straightforward ED can lead to a call or message before any decision.",
  },
  {
    icon: AlertTriangle,
    title: "Not covered",
    body: "Urgent symptoms, prolonged painful erection, injury, complex genital symptoms, fertility or libido workups, or requests for a guaranteed medicine.",
  },
] as const

const AFTER_SUBMIT = [
  {
    icon: CheckCircle2,
    title: "Approved",
    body: "If the doctor decides online care is suitable and a prescription is clinically appropriate, the outcome is sent digitally.",
  },
  {
    icon: Clock3,
    title: "Needs more information",
    body: "The doctor may call or message to clarify medicines, heart symptoms, blood pressure, medical history, or whether in-person review is safer.",
  },
  {
    icon: AlertTriangle,
    title: "Declined",
    body: "If online prescribing is not safe or suitable, the doctor explains the reason, recommends next steps, and the request is refunded.",
  },
] as const

const ALTERNATIVES = [
  {
    title: "Prescriptions",
    href: "/prescriptions",
    body: "For stable repeat medicines you already take, reviewed separately from the ED pathway.",
  },
  {
    title: "Hair loss assessment",
    href: "/hair-loss",
    body: "A different private men's-health pathway with its own safety screen.",
  },
  {
    title: "Medical certificate",
    href: "/medical-certificate",
    body: "For short work or study absence documentation when illness affects attendance.",
  },
  {
    title: "Type 2 diabetes",
    href: "/conditions/type-2-diabetes",
    body: "A common health context that can affect erection symptoms.",
  },
  {
    title: "High cholesterol",
    href: "/conditions/high-cholesterol",
    body: "Cardiovascular risk context that may matter in ED assessment.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Chest pain should be assessed urgently before any ED request.",
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: erectile dysfunction",
    href: "https://www.healthdirect.gov.au/erectile-dysfunction",
    body: "Australian patient information on ED symptoms, causes, diagnosis, treatment options, and when to see a doctor.",
  },
  {
    title: "Healthdirect: erectile dysfunction medicines",
    href: "https://www.healthdirect.gov.au/erectile-dysfunction-medicines",
    body: "Australian patient information explaining prescription requirements and important safety checks for ED medicines.",
  },
  {
    title: "Healthdirect: prolonged erection",
    href: "https://www.healthdirect.gov.au/prolonged-erection",
    body: "Patient information on priapism, including why an erection lasting more than 4 hours is a medical emergency.",
  },
  {
    title: "RACGP: assessment and treatment of erectile dysfunction",
    href: "https://www.racgp.org.au/afp/2017/september/much-more-than-prescribing-a-pill",
    body: "Australian GP-focused clinical article describing ED risk factors, comorbidities, and the need for broader assessment.",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Guidance on the standard expected of doctors when care is delivered by telehealth.",
  },
  {
    title: "AHPRA and Medical Board: updated telehealth guidance",
    href: "https://www.medicalboard.gov.au/sitecore/content/Home/News/2025-10-07-Updated-telehealth-guidance.aspx",
    body: "Public guidance emphasising that convenience must not come at the cost of safety or quality.",
  },
  {
    title: "Australian Digital Health Agency: electronic prescriptions",
    href: "https://www.digitalhealth.gov.au/initiatives-and-programs/electronic-prescriptions",
    body: "Explains electronic prescription tokens sent by SMS or email and used at Australian pharmacies.",
  },
  {
    title: "PBS: Browse by body system",
    href: "https://www.pbs.gov.au/browse/body-system",
    body: "PBS schedule navigation for medicine groups and pharmacy cost context in Australia.",
  },
  {
    title: "TGA: restrictions on advertising prescription medicines",
    href: "https://www.tga.gov.au/resources/guidance/complying-restrictions-advertising-prescription-medicines-public",
    body: "Advertising guidance relevant to public health-service pages where prescription medicines may be involved.",
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
        "h-full rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <Heading level="h3" className="text-base">
            {title}
          </Heading>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}

function SectionShell({
  id,
  pill,
  title,
  intro,
  children,
  muted = false,
}: {
  id: string
  pill: string
  title: string
  intro?: string
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section
      id={id}
      className={cn("bg-background py-14 sm:py-16 lg:py-20", muted && "bg-muted/30 dark:bg-white/[0.02]")}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-4">
            {title}
          </Heading>
          {intro ? <p className="mt-3 text-base leading-7 text-muted-foreground">{intro}</p> : null}
        </Reveal>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  )
}

function VisualTextIndex({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-3">
      {visuals.map((visual) => (
        <div
          key={visual.id}
          className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{visual.eyebrow}</p>
          <Heading level="h3" className="mt-2 text-base">
            {visual.title}
          </Heading>
          <ul className="mt-4 space-y-3">
            {visual.items.map((item) => (
              <li key={`${visual.id}-${item.label}`} className="text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">{item.label}:</span> {item.detail}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {visual.kind === "warning" ? "Educational guide. Urgent symptoms need urgent care." : "Educational guide."}
          </p>
        </div>
      ))}
    </div>
  )
}

export function ErectileDysfunctionLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="ed" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden bg-background pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_20%,rgba(186,212,245,0.30),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,198,160,0.20),transparent_30%)]"
            />
            <div className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
              <Reveal instant className="max-w-2xl">
                <SectionPill>Men's health</SectionPill>
                <Heading level="display" className="mt-5">
                  Erectile dysfunction assessment online Australia
                </Heading>
                <p data-speakable className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Start with a private safety screen for ED concerns. An Australian doctor reviews your answers and decides whether online care is clinically appropriate.
                </p>

                <div ref={heroCTARef} className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
                    disabled={isDisabled}
                    onClick={handleHeroCTA}
                  >
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : "Start ED assessment"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 w-full sm:w-auto">
                    <Link href="#red-flags">Check red flags first</Link>
                  </Button>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  {GUARANTEE} Prescription is not guaranteed. The doctor may call or message you before deciding.
                </p>
              </Reveal>

              <Reveal instant>
                <div className="rounded-3xl border border-border/50 bg-white p-6 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 dark:bg-white/[0.04]">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                        Practical answer
                      </p>
                      <Heading level="h2" as="h2" className="mt-2">
                        What matters before you start
                      </Heading>
                    </div>
                  </div>
                  <div className="mt-5 divide-y divide-border/50">
                    {HERO_FACTS.map((fact) => (
                      <div key={fact.label} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <fact.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            {fact.label}
                          </p>
                          <p className="mt-1 text-base font-semibold text-foreground">{fact.value}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <SectionShell
            id="how-it-works"
            pill="How it works"
            title="A structured assessment, not a medicine menu"
            intro={`${FORM_FIRST_WEDGE} The purpose is to give the doctor enough information to decide whether remote ED care is safe enough, not to bypass clinical review.`}
          >
            <div className="grid gap-4 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.05}>
                  <div className="h-full rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <Heading level="h3" className="mt-4 text-base">
                      {step.title}
                    </Heading>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-7 text-center">
              <Button asChild size="lg" disabled={isDisabled} onClick={handleHowItWorksCTA}>
                <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                  {isDisabled ? "Contact us" : "Start the secure form"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </SectionShell>

          <SectionShell
            id="eligibility"
            pill="Eligibility"
            title="Who this online ED assessment is designed for"
            intro="ED is common, but it can be connected with heart, blood-vessel, hormone, medicine, mental-health, and relationship factors. Online review is only reasonable when the safety screen is complete and low-risk enough."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-emerald-800 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <Heading level="h3">Usually a reasonable starting point</Heading>
                </div>
                <ul className="mt-5 space-y-3">
                  {SUITABLE_ITEMS.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-amber-800 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                  <Heading level="h3">Use in-person care instead</Heading>
                </div>
                <ul className="mt-5 space-y-3">
                  {NOT_COVERED_ITEMS.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="clinical-context"
            pill="Clinical context"
            title="ED can be a symptom, not just a sex problem"
            intro="The useful assessment is broader than whether an erection medicine exists. The doctor needs enough clinical signal to decide whether online care is safe and whether another health issue needs attention."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {ED_CONTEXT.map((item, index) => (
                <InfoCard
                  key={item.title}
                  icon={index === 0 ? HeartPulse : index === 1 ? ShieldCheck : Stethoscope}
                  title={item.title}
                  body={item.body}
                />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="red-flags"
            pill="Red flags"
            title="Do not wait for an online form if these are present"
            intro="These symptoms can indicate urgent heart, neurological, genital, or mental-health risk. Handle immediate safety first, then come back to routine online care later if appropriate."
            muted
          >
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <Heading level="h3" className="text-base">
                    Seek urgent or in-person care
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Call 000 for chest pain, severe breathlessness, collapse, stroke symptoms, or a mental-health crisis. Seek urgent care for an erection lasting more than 4 hours, a painful erection, penile injury, sudden severe genital pain, blood in urine, or symptoms after trauma.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <InfoCard
                icon={HeartPulse}
                title="Why the boundary is strict"
                body="Some ED patterns are early clues to cardiovascular disease, diabetes, medication effects, or mental-health stress. Some symptoms need examination or urgent care before any prescribing decision."
              />
              <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                <Heading level="h3">Safety topics the doctor reviews</Heading>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SAFETY_CHECKS.map((item) => (
                    <div key={item} className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground dark:bg-white/[0.05]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="covered"
            pill="Scope"
            title="What is covered, and what stays outside this pathway"
            intro="The safest ED page is clear about limits. This service supports a doctor review for ED concerns. It is not an emergency service, a full sexual-health clinic, or a guarantee of prescription medicine."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {COVERED_ITEMS.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="costs"
            pill="Costs"
            title="Doctor review, Medicare, PBS, and pharmacy costs"
            intro={`The InstantMed review fee is ${PRICING_DISPLAY.MENS_HEALTH}. Medicare or suitable identity details are required for consultation and prescribing records. If the doctor approves a prescription, pharmacy pricing is separate and may depend on PBS listing, brand choice, and pharmacy pricing.`}
            muted
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard
                icon={WalletCards}
                title="Review fee"
                body={`${PRICING_DISPLAY.MENS_HEALTH} for the online doctor review. ${GUARANTEE}`}
              />
              <InfoCard
                icon={FileText}
                title="Identity and records"
                body="The form asks for details needed to support safe clinical records and electronic prescribing workflows where relevant."
              />
              <InfoCard
                icon={ShieldCheck}
                title="Pharmacy cost"
                body="If approved, the pharmacy charges separately. PBS status and brand choice can affect the amount paid at the counter."
              />
            </div>
          </SectionShell>

          <SectionShell
            id="visual-guide"
            pill="Visual guide"
            title="Three practical ways to think about ED suitability"
            intro="These figures are educational. They explain why the doctor asks broader health questions, but they do not replace doctor review or urgent care when red flags are present."
          >
            <ArticleVisuals visuals={visuals} imageLoading="eager" />
            <VisualTextIndex visuals={visuals} />
          </SectionShell>

          <SectionShell
            id="alternatives"
            pill="Alternatives"
            title="If this is not the right pathway"
            intro="Choose the route that matches the problem today. ED concerns sometimes point to another health issue that is better managed with a regular GP, urgent care, or a different InstantMed service."
            muted
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ALTERNATIVES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <Heading level="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Read more
                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="expect"
            pill="What to expect"
            title="After you submit"
            intro="The doctor reviews the details you provide. There are three honest outcomes: approval if clinically appropriate, contact for more information, or decline with redirection and refund."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {AFTER_SUBMIT.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="sources"
            pill="Sources"
            title="Sources and references"
            intro="This page was reviewed against Australian patient information, telehealth guidance, PBS schedule navigation, electronic prescription guidance, and advertising rules. Last reviewed: 2026-06."
            muted
          >
            <div className="grid gap-4 md:grid-cols-2">
              {SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <p className="text-sm font-semibold text-foreground">{source.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.body}</p>
                </a>
              ))}
            </div>
          </SectionShell>

          <FAQSection
            pill="FAQ"
            title="Erectile dysfunction assessment FAQ"
            subtitle="Static answers for the common clinical, cost, privacy, and pathway questions before you start."
            items={ED_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-background"
          />

          <section className="py-14 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
                <SectionPill>Start privately</SectionPill>
                <Heading level="h2" className="mt-4">
                  Request an ED assessment
                </Heading>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Complete the secure form. An AHPRA-registered doctor reviews your answers and decides whether online care is appropriate.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : `Request assessment - ${PRICING_DISPLAY.MENS_HEALTH}`}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href="/blog/telehealth-safety-screening">Read about safety screening</Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      )}
    </LandingPageShell>
  )
}
