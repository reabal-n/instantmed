"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  type LucideIcon,
  ShieldCheck,
  Stethoscope,
  WalletCards,
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
import { UTI_FAQ } from "@/lib/data/womens-health-faq"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health"
const WOMENS_HEALTH_HREF = "/womens-health"
const MEDICAL_CERTIFICATE_HREF = "/medical-certificate"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "womens-health",
  analyticsId: "uti-assessment",
  sticky: {
    ctaText: `Start UTI assessment - ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "UTI symptoms - Doctor-reviewed",
    responseTime: "Doctor review 24/7",
  },
}

const HERO_FACTS = [
  {
    icon: WalletCards,
    label: "Cost",
    value: PRICING_DISPLAY.WOMENS_HEALTH,
    body: "One-off doctor review. Pharmacy cost is separate if medicine is approved.",
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Form first",
    body: "The form takes about 3 minutes. Review timing depends on clinical detail and queue volume.",
  },
  {
    icon: ShieldCheck,
    label: "Boundary",
    value: "Safety-led",
    body: "Fever, flank pain, pregnancy risk, or complicated symptoms need in-person care.",
  },
] as const

const HOW_IT_WORKS = [
  {
    title: "Choose UTI symptoms",
    body: "Start the women's-health request and select the UTI symptom pathway inside the secure form.",
  },
  {
    title: "Complete the safety screen",
    body: "Answer questions about burning, frequency, urgency, blood, pregnancy possibility, fever, back or side pain, and whether symptoms keep recurring.",
  },
  {
    title: "Doctor Review",
    body: "An AHPRA-registered doctor reviews the request and may call or message if the symptom pattern or safety screen needs clarification.",
  },
  {
    title: "Outcome sent digitally",
    body: "If online care is suitable, the outcome is sent digitally. If online care is not safe, the doctor explains next steps and the request is refunded.",
  },
] as const

const SUITABLE_ITEMS = [
  "You are in Australia and aged 18 or over.",
  "You have symptoms that sound like a lower urinary tract infection, such as burning, frequency, urgency, or cloudy urine.",
  "You are not pregnant and are not unsure about pregnancy.",
  "You do not have fever, chills, vomiting, flank or back pain, severe pelvic pain, or feeling very unwell.",
  "You can answer the safety questions clearly, including recurrence, allergies, medicines, and kidney or immune-risk history.",
] as const

const NOT_COVERED_ITEMS = [
  "Pregnancy or possible pregnancy.",
  "Fever, chills, vomiting, feeling very unwell, or pain in your back, side, or flank.",
  "Men, children, catheter-related symptoms, kidney disease, immune suppression, or complex medical history.",
  "Vaginal discharge, STI concern, pelvic pain, sexual assault, or symptoms that do not fit a simple urinary infection.",
  "Repeated infections, symptoms returning soon after treatment, or symptoms not improving.",
] as const

const SYMPTOM_FIT = [
  {
    title: "Common lower-tract symptoms",
    body: "Burning or stinging when passing urine, needing to go often, urgency, incomplete emptying, cloudy urine, or lower abdominal discomfort can fit a simple lower urinary infection pattern.",
  },
  {
    title: "Symptoms that change the route",
    body: "Back or side pain, fever, chills, vomiting, severe pain, pregnancy risk, or feeling systemically unwell can suggest something more serious and should not be managed as a routine online request.",
  },
  {
    title: "Symptoms that may be something else",
    body: "Vaginal discharge, genital sores, pelvic pain, STI exposure, prostate symptoms, stones, or persistent blood in urine can need testing or examination before treatment decisions.",
  },
] as const

const SAFETY_CHECKS = [
  "burning, frequency, urgency, blood, cloudy urine, and symptom timing",
  "fever, chills, nausea, vomiting, flank pain, or feeling very unwell",
  "pregnancy, possible pregnancy, breastfeeding context, or recent birth where relevant",
  "recurrent infections, recent treatment, kidney disease, diabetes, immune-risk history, or catheter use",
  "medicine allergies, current medicines, prior reactions, and whether a pharmacy medicine may be unsafe",
  "STI possibility, vaginal symptoms, pelvic pain, or symptoms that do not fit a simple lower urinary pattern",
] as const

const AFTER_SUBMIT = [
  {
    icon: CheckCircle2,
    title: "Approved",
    body: "If the doctor decides the request is suitable for online care, the outcome is sent digitally. Any medicine decision is made by the doctor.",
  },
  {
    icon: Clock3,
    title: "Needs more information",
    body: "The doctor may call or message to clarify pregnancy risk, symptom pattern, recurrence, medicine allergy, or whether testing is safer.",
  },
  {
    icon: AlertTriangle,
    title: "Declined",
    body: "If online care is not safe, the doctor explains the reason, recommends in-person care or urgent care, and the request is refunded.",
  },
] as const

const ALTERNATIVES = [
  {
    title: "Women's health hub",
    href: WOMENS_HEALTH_HREF,
    body: "Compare the UTI and contraceptive pill assessment pathways.",
  },
  {
    title: "Medical certificate",
    href: MEDICAL_CERTIFICATE_HREF,
    body: "For a short sick certificate when symptoms make work or study unsafe.",
  },
  {
    title: "UTI condition guide",
    href: "/conditions/uti",
    body: "Background on urinary tract infection symptoms and when care is urgent.",
  },
  {
    title: "Burning urination",
    href: "/symptoms/burning-when-urinating",
    body: "Understand other causes when burning is not a straightforward UTI.",
  },
  {
    title: "Frequent urination",
    href: "/symptoms/frequent-urination",
    body: "Frequency can come from infection, fluid intake, diabetes, bladder symptoms, or anxiety.",
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: urinary tract infection",
    href: "https://www.healthdirect.gov.au/urinary-tract-infection-uti",
    body: "Australian patient information on UTI symptoms, kidney-infection warnings, and when to see a doctor.",
  },
  {
    title: "Healthdirect: kidney infection",
    href: "https://www.healthdirect.gov.au/kidney-infection",
    body: "Patient information on kidney infection as a serious upper-tract infection needing prompt medical care.",
  },
  {
    title: "Pregnancy Birth and Baby: UTIs during pregnancy",
    href: "https://www.pregnancybirthbaby.org.au/urinary-tract-infections-utis-during-pregnancy",
    body: "Australian pregnancy-focused information explaining why UTIs in pregnancy need clinician assessment.",
  },
  {
    title: "Healthdirect: blood in urine",
    href: "https://www.healthdirect.gov.au/blood-in-urine",
    body: "Patient information on haematuria and why visible blood should be checked by a doctor.",
  },
  {
    title: "RACGP: recurrent UTIs",
    href: "https://www1.racgp.org.au/ajgp/2024/may/what-to-do-about-recurrent-urinary-tract-infection",
    body: "Clinical discussion of recurrent urinary infections and the need for more careful assessment.",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Guidance on the standard expected of doctors when care is delivered by telehealth.",
  },
  {
    title: "Australian Digital Health Agency: electronic prescriptions",
    href: "https://www.digitalhealth.gov.au/initiatives-and-programs/electronic-prescriptions",
    body: "Explains electronic prescription tokens used at Australian pharmacies when a prescription is approved.",
  },
  {
    title: "PBS: Browse by body system",
    href: "https://www.pbs.gov.au/browse/body-system",
    body: "PBS schedule navigation for medicine groups and pharmacy cost context in Australia.",
  },
  {
    title: "Australian Commission: Antimicrobial Stewardship",
    href: "https://www.safetyandquality.gov.au/clinical-topics/antimicrobial-stewardship",
    body: "National information on appropriate antimicrobial prescribing and stewardship in Australian healthcare.",
  },
  {
    title: "TGA: restrictions on advertising prescription medicines",
    href: "https://www.tga.gov.au/resources/guidance/complying-restrictions-advertising-prescription-medicines-public",
    body: "Advertising guidance relevant to health-service pages where prescription medicines may be involved.",
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
          <p className="text-xs font-semibold uppercase text-primary">{visual.eyebrow}</p>
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

export function UtiAssessmentLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden bg-background pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_20%,rgba(186,212,245,0.30),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,198,160,0.22),transparent_30%)]"
            />
            <div className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
              <Reveal instant className="max-w-2xl">
                <SectionPill>Women's health</SectionPill>
                <Heading level="display" className="mt-5">
                  UTI assessment online Australia
                </Heading>
                <p data-speakable className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Start with a secure symptom and safety screen for a possible uncomplicated UTI. An Australian doctor reviews your answers and decides whether online care is appropriate.
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
                      {isDisabled ? "Contact us" : "Start UTI assessment"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 w-full sm:w-auto">
                    <Link href="#red-flags">Check red flags first</Link>
                  </Button>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  {GUARANTEE} Treatment is not guaranteed. The doctor may call or message you before deciding.
                </p>
              </Reveal>

              <Reveal instant>
                <div className="rounded-3xl border border-border/50 bg-white p-6 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <p className="text-xs font-semibold uppercase text-primary">Practical answer</p>
                  <Heading level="h2" as="h2" className="mt-3">
                    What matters before you start
                  </Heading>
                  <div className="mt-5 divide-y divide-border/50">
                    {HERO_FACTS.map((fact) => (
                      <div key={fact.label} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <fact.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">{fact.label}</p>
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
            title="A symptom assessment first, then doctor review"
            intro="The form is not a medicine menu. It helps the doctor decide whether your symptoms fit a low-risk urinary infection pattern or whether testing, examination, or urgent care is safer."
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
            title="Who this online UTI assessment is designed for"
            intro="Online care is only reasonable when the presentation sounds uncomplicated. The safety screen is deliberately narrow because some urinary symptoms need a urine test, examination, or urgent care."
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
            id="symptoms"
            pill="Symptoms"
            title="What symptom pattern the doctor is looking for"
            intro="A simple lower urinary infection is usually a symptom-based assessment. The doctor still needs to check whether the story fits, whether another condition is more likely, and whether remote care gives enough clinical signal."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {SYMPTOM_FIT.map((item, index) => (
                <InfoCard
                  key={item.title}
                  icon={index === 0 ? Droplets : index === 1 ? HeartPulse : Stethoscope}
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
            intro="These symptoms can indicate kidney infection, pregnancy-related risk, bleeding that needs investigation, or a condition that is not a routine lower urinary infection."
            muted
          >
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <Heading level="h3" className="text-base">
                    See someone in person or seek urgent care
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Do not use this page for fever, chills, vomiting, one-sided back or flank pain, severe pelvic or abdominal pain, pregnancy or possible pregnancy, visible blood in urine, inability to pass urine, confusion, dehydration, catheter symptoms, sexual assault, or feeling very unwell. Call 000 for emergencies.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <InfoCard
                icon={HeartPulse}
                title="Why the boundary is strict"
                body="Kidney infection can start like a bladder infection but becomes more serious when fever, flank pain, vomiting, or systemic illness appears. Pregnancy changes the safest assessment route."
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
            intro="The safest UTI page is clear about limits. The service can support a doctor review for possible uncomplicated lower UTI symptoms. It does not replace urine testing, sexual health testing, pregnancy care, or emergency care."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={Stethoscope}
                title="Covered"
                body="Adult UTI symptom assessment through the women's-health pathway when the answers fit a lower-risk pattern and the safety screen is complete."
              />
              <InfoCard
                icon={FlaskConical}
                title="May need testing"
                body="Recurrent symptoms, visible blood, unclear diagnosis, recent treatment, or symptoms that do not improve can need urine testing or in-person review."
              />
              <InfoCard
                icon={AlertTriangle}
                title="Not covered"
                body="Pregnancy risk, kidney-infection symptoms, men, children, catheter symptoms, STI concern, pelvic pain, sexual assault, or severe illness."
              />
            </div>
          </SectionShell>

          <SectionShell
            id="costs"
            pill="Costs"
            title="Doctor review, Medicare, PBS, and pharmacy costs"
            intro={`The InstantMed review fee is ${PRICING_DISPLAY.WOMENS_HEALTH}. Medicare or suitable identity details are required for prescription and consultation requests. If the doctor approves a prescription, pharmacy pricing is separate and may depend on PBS listing, brand choice, and pharmacy pricing.`}
            muted
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard
                icon={WalletCards}
                title="Review fee"
                body={`${PRICING_DISPLAY.WOMENS_HEALTH} for the online doctor review. ${GUARANTEE}`}
              />
              <InfoCard
                icon={FileText}
                title="Medicare details"
                body="The form asks for the details needed to support safe clinical records and electronic prescribing workflows where relevant."
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
            title="Three practical ways to think about UTI suitability"
            intro="These figures are educational. They explain the assessment logic, but they do not replace doctor review or urgent care when red flags are present."
          >
            <ArticleVisuals visuals={visuals} />
            <VisualTextIndex visuals={visuals} />
          </SectionShell>

          <SectionShell
            id="alternatives"
            pill="Alternatives"
            title="If this is not the right pathway"
            intro="Urinary symptoms overlap with other conditions. Choose the route that matches what you need today, and choose urgent or in-person care when the symptom pattern is not simple."
            muted
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            intro="This page was reviewed against Australian patient information, telehealth guidance, PBS schedule navigation, and advertising rules. Last reviewed: 2026-06."
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
            title="UTI assessment FAQ"
            subtitle="Static answers for the common clinical, cost, and pathway questions before you start."
            items={UTI_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-background"
          />

          <section className="bg-background py-14 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
                <SectionPill>Start safely</SectionPill>
                <Heading level="h2" className="mt-4">
                  Start a UTI symptom assessment
                </Heading>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Complete the secure form. An AHPRA-registered doctor reviews your answers and decides whether online care is appropriate.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : `Start assessment - ${PRICING_DISPLAY.WOMENS_HEALTH}`}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href={WOMENS_HEALTH_HREF}>Compare women's health options</Link>
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
