"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  HeartPulse,
  Lock,
  type LucideIcon,
  MessageCircle,
  Scissors,
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
import { MENS_HEALTH_FAQ } from "@/lib/data/mens-health-faq"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const ED_HREF = "/erectile-dysfunction"
const HAIR_LOSS_HREF = "/hair-loss"
const ED_REQUEST_HREF = "/request?service=consult&subtype=ed"
const HAIR_LOSS_REQUEST_HREF = "/request?service=consult&subtype=hair_loss"
const CHOOSE_PATHWAY_HREF = "#choose-pathway"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "consult",
  analyticsId: "mens-health",
  sticky: {
    ctaText: "Choose a pathway",
    ctaHref: CHOOSE_PATHWAY_HREF,
    mobileSummary: "Men's health - ED and hair loss review",
    responseTime: "Review timing 8am-10pm AEST",
  },
}

const HERO_FACTS = [
  {
    icon: WalletCards,
    label: "Cost",
    value: PRICING_DISPLAY.MENS_HEALTH,
    body: "One-off doctor review for ED or hair loss. Pharmacy cost is separate if a prescription is approved.",
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Form first",
    body: "Requests submit 24/7. Review timing is 8am-10pm AEST, 7 days, and depends on clinical detail.",
  },
  {
    icon: ShieldCheck,
    label: "Boundary",
    value: "ED + hair loss",
    body: "Not a general health check, emergency service, fertility service, testosterone clinic, or crisis pathway.",
  },
] as const

const PATHWAYS = [
  {
    icon: HeartPulse,
    title: "Erectile dysfunction assessment",
    body: "For difficulty getting or maintaining erections when remote review is clinically suitable. The form asks about symptom pattern, heart-health context, medicines, sexual-activity safety, and red flags.",
    href: ED_HREF,
    requestHref: ED_REQUEST_HREF,
    cta: "Read ED assessment guide",
  },
  {
    icon: Scissors,
    title: "Hair loss assessment",
    body: "For scalp hair thinning, shedding, or common pattern hair loss. The form asks about timing, distribution, photos where needed, scalp symptoms, medical history, and safety context.",
    href: HAIR_LOSS_HREF,
    requestHref: HAIR_LOSS_REQUEST_HREF,
    cta: "Read hair loss guide",
  },
] as const

const HOW_IT_WORKS = [
  {
    title: "Choose the right pathway",
    body: "Start with ED or hair loss. The pathway matters because the safety questions are different, and the doctor needs the right clinical context before deciding.",
  },
  {
    title: "Complete a private form",
    body: "The secure form asks for symptoms, timing, medical history, current medicines, allergies, identity details, and red flags. Medicine choices are not advertised or selected from a public menu.",
  },
  {
    title: "Doctor review",
    body: "An AHPRA-registered Australian doctor reviews the answers. They may approve, ask for more information, call or message you, decline, or recommend in-person care.",
  },
  {
    title: "Outcome and follow-up",
    body: "If a prescription is clinically appropriate, it can be sent digitally. If online care is not suitable, the doctor explains why and directs you to a safer next step.",
  },
] as const

const ELIGIBILITY = [
  "You are in Australia and aged 18 or over.",
  "You can provide identity details and Medicare details for prescription-related records.",
  "The main concern is ED or hair loss, not an emergency symptom or broad health check.",
  "You can describe the symptom pattern, timing, current medicines, allergies, and relevant medical history.",
  "You understand the doctor may contact you, decline, or recommend in-person care if online review is not suitable.",
  "You are not relying on a guaranteed prescription, a named medicine, or a promised outcome.",
] as const

const NOT_COVERED = [
  "Chest pain, severe breathlessness, collapse, stroke symptoms, or severe allergic reaction.",
  "Sudden severe testicular pain, genital injury, or an erection lasting more than 4 hours.",
  "Fertility assessment, testosterone deficiency work-up, prostate symptoms, or a general preventive health check.",
  "Mental health crisis, self-harm risk, or immediate safety concerns.",
  "Sudden patchy hair loss with scalp pain, scarring, infection signs, or feeling very unwell.",
  "Requests for restricted, dependence-forming, gated, or otherwise out-of-scope medicines.",
] as const

const SAFETY_TOPICS = [
  {
    icon: HeartPulse,
    title: "ED can be a health signal",
    body: "ED can be linked with blood-vessel health, diabetes, blood pressure, cholesterol, smoking, medicines, alcohol, sleep, stress, mood, and relationship context. The form asks about these because they affect safety.",
  },
  {
    icon: Eye,
    title: "Hair loss has different patterns",
    body: "Gradual patterned thinning is different from sudden patchy loss, shedding after illness, scalp inflammation, scarring, or hair loss with systemic symptoms. Some patterns need examination or blood tests.",
  },
  {
    icon: FileText,
    title: "Public pages stay medicine-neutral",
    body: "Australian rules prohibit advertising prescription-only medicines to the public. This page explains the assessment and boundaries. Treatment decisions happen privately after review.",
  },
] as const

const RED_FLAGS = [
  "Call 000 for chest pain, severe breathlessness, collapse, stroke symptoms, severe allergic reaction, or immediate danger.",
  "Seek urgent care for an erection lasting more than 4 hours, painful erection, genital injury, or sudden severe testicular pain.",
  "See someone in person for sudden patchy hair loss, scalp pain, scalp swelling, pus, fever, scarring, or hair loss with feeling generally unwell.",
  "Use your regular GP or an in-person clinic for fertility, testosterone concerns, prostate symptoms, unexplained weight loss, or a full preventive health check.",
  "Use crisis support or emergency care for self-harm thoughts, immediate mental health danger, or feeling unable to stay safe.",
] as const

const COSTS = [
  {
    icon: WalletCards,
    title: "Review fee",
    body: `ED and hair-loss doctor review currently costs ${PRICING_DISPLAY.MENS_HEALTH}. ${GUARANTEE}`,
  },
  {
    icon: ClipboardCheck,
    title: "Medicare details",
    body: "Prescription-related requests ask for Medicare or suitable identity details because records and electronic prescribing need reliable patient identification.",
  },
  {
    icon: Lock,
    title: "Pharmacy cost",
    body: "If a prescription is approved, pharmacy supply cost is separate. PBS status, eligibility, brand choice, premiums, and final price are confirmed by the pharmacy.",
  },
  {
    icon: MessageCircle,
    title: "Doctor contact",
    body: "The doctor may call or message you if a clinical detail needs clarification before any decision. That contact is part of safe remote review.",
  },
] as const

const AFTER_SUBMIT = [
  {
    icon: CheckCircle2,
    title: "Approved if appropriate",
    body: "The doctor decides online care is suitable and sends the approved outcome digitally. A pharmacy still completes its normal dispensing checks if a prescription is involved.",
  },
  {
    icon: MessageCircle,
    title: "More information",
    body: "The doctor asks for clarification about symptoms, medicines, identity, heart-health context, scalp photos, or safety history before deciding.",
  },
  {
    icon: XCircle,
    title: "Declined or redirected",
    body: "The request is outside scope or not safe online. The doctor explains the reason, recommends a safer route, and the request is refunded.",
  },
] as const

const INTERNAL_LINKS = [
  {
    title: "Erectile dysfunction assessment",
    href: ED_HREF,
    body: "The dedicated ED pathway, with more detail about heart-health screening and online care boundaries.",
  },
  {
    title: "Hair loss assessment",
    href: HAIR_LOSS_HREF,
    body: "The dedicated hair-loss pathway, including pattern, photo, scalp, and safety context.",
  },
  {
    title: "Online prescriptions",
    href: "/online-prescriptions",
    body: "How repeat prescription review, eScripts, PBS context, and pharmacy costs work in Australia.",
  },
  {
    title: "Type 2 diabetes",
    href: "/conditions/type-2-diabetes",
    body: "A common metabolic context that can affect ED and long-term health risk.",
  },
  {
    title: "High cholesterol",
    href: "/conditions/high-cholesterol",
    body: "Cardiovascular risk context that can matter when ED is part of the symptom picture.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Chest pain is urgent-care territory, not an online men's health request.",
  },
] as const

const SOURCES = [
  {
    title: "healthdirect: erectile dysfunction",
    href: "https://www.healthdirect.gov.au/erectile-dysfunction",
    body: "Australian patient information on ED causes, medical review, and treatment context.",
  },
  {
    title: "Healthy Male: erectile dysfunction",
    href: "https://healthymale.org.au/mens-health/erectile-dysfunction/",
    body: "Australian men's health education on ED, lifestyle factors, and overall health.",
  },
  {
    title: "healthdirect: male pattern baldness",
    href: "https://www.healthdirect.gov.au/male-pattern-baldness",
    body: "Australian patient information on common hair-loss patterns and when to seek care.",
  },
  {
    title: "Healthy Male: hair loss",
    href: "https://healthymale.org.au/mens-health/hair-loss/",
    body: "Australian men's health education on hair-loss causes and assessment context.",
  },
  {
    title: "Ahpra: virtual care guidance",
    href: "https://www.ahpra.gov.au/Resources/Information-for-practitioners-who-provide-virtual-care.aspx",
    body: "Regulator guidance that virtual care must be clinically appropriate and meet professional obligations.",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Guidance on telehealth consultations, prescribing, suitability, and in-person care limits.",
  },
  {
    title: "TGA: health service advertising and therapeutic goods",
    href: "https://www.tga.gov.au/resources/guidance/advertising-health-services-involve-therapeutic-goods",
    body: "Australian advertising guidance for health services that may involve therapeutic goods.",
  },
  {
    title: "PBS: Pharmaceutical Benefits Scheme",
    href: "https://www.pbs.gov.au/pbs/home",
    body: "Official PBS navigation for medicines, eligibility context, and pharmacy supply information.",
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
    <Reveal className={cn("rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none", className)}>
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
    <section id={id} className={cn("py-14 sm:py-16 lg:py-24 scroll-mt-20", muted && "bg-muted/30 dark:bg-white/[0.02]")}>
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

export function MensHealthLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden pb-14 pt-10 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-18">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
              <Reveal instant>
                <SectionPill>Men's health online Australia</SectionPill>
                <Heading level="display" className="mt-5 max-w-4xl">
                  Men's health online Australia - ED and hair loss doctor review
                </Heading>
                <p data-speakable className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  Private online assessment for erectile dysfunction and hair loss concerns, reviewed by an AHPRA-registered Australian doctor. The practical boundary is simple: request a review, but prescribing or treatment is never guaranteed.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {HERO_FACTS.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/50 bg-white/90 p-4 shadow-md shadow-primary/[0.05] backdrop-blur dark:border-white/15 dark:bg-card/90 dark:shadow-none">
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
                  <Button asChild size="lg" onClick={handleHeroCTA} disabled={isDisabled}>
                    <Link href={isDisabled ? "/contact" : CHOOSE_PATHWAY_HREF}>
                      {isDisabled ? "Contact us" : "Choose ED or hair loss"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#red-flags">Check red flags first</Link>
                  </Button>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {FORM_FIRST_WEDGE} The doctor may contact you if a safety detail needs clarification.
                </p>
              </Reveal>

              <Reveal className="lg:pl-4" instant>
                <div className="rounded-3xl border border-border/50 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Stethoscope className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">The first-screen answer</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Use this page if your main concern is ED or hair loss and you want to know whether an online doctor review is reasonable in Australia.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {[
                      "Cost: ED and hair-loss review currently costs " + PRICING_DISPLAY.MENS_HEALTH + ".",
                      "Speed: submit any time; doctor review timing is 8am-10pm AEST.",
                      "Boundary: emergency symptoms, complex health checks, and some red flags need in-person care.",
                      "Outcome: an AHPRA-registered doctor reviews and decides; treatment is not promised.",
                    ].map((item) => (
                      <div key={item} className="flex gap-3 rounded-2xl bg-muted/50 p-3 dark:bg-white/[0.04]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <p className="text-sm leading-6 text-foreground">{item}</p>
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
            title="How online men's health review works"
            intro="Online care is a clinical review channel, not a shortcut around medical judgment. The doctor still needs enough information to decide whether remote care is safe."
          >
            <div className="grid gap-4 md:grid-cols-4">
              {HOW_IT_WORKS.map((item, index) => (
                <Reveal key={item.title} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none" delay={index * 0.04}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <Heading level="h3" className="mt-4 text-base">
                    {item.title}
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="choose-pathway"
            pill="Choose a pathway"
            title="Start with the pathway that matches the main concern"
            intro="InstantMed's active men's health pathways are ED and hair loss. Choosing the right pathway keeps the questions clinically relevant and avoids sending an under-built request to the doctor."
            muted
          >
            <div className="grid gap-5 lg:grid-cols-2">
              {PATHWAYS.map((pathway) => (
                <Reveal key={pathway.title} className="rounded-3xl border border-border/50 bg-white p-6 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <pathway.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <Heading level="h3" className="text-lg">
                        {pathway.title}
                      </Heading>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{pathway.body}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href={pathway.href}>
                        {pathway.cta}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild className="w-full sm:w-auto" disabled={isDisabled} onClick={handleHowItWorksCTA}>
                      <Link href={isDisabled ? "/contact" : pathway.requestHref}>
                        {isDisabled ? "Contact us" : "Request review"}
                      </Link>
                    </Button>
                  </div>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="eligibility"
            pill="Eligibility"
            title="Who online review may suit"
            intro="The doctor makes the final decision, but these details usually need to be true before ED or hair-loss review can be considered online."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {ELIGIBILITY.map((item) => (
                <Reveal key={item} className="flex gap-3 rounded-2xl border border-border/50 bg-white p-4 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </Reveal>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="scope"
            pill="Scope"
            title="What is covered and what is not"
            intro="The hub is deliberately narrow. It is useful for ED and hair-loss questions, but it is not a general men's health clinic for every concern."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <Reveal className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <Heading level="h3" className="text-lg">
                  Covered online when suitable
                </Heading>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  A focused one-off doctor review for ED or hair loss, using a structured safety form and doctor decision. The review may still end in contact, decline, or in-person care.
                </p>
              </Reveal>
              <div className="grid gap-3">
                {NOT_COVERED.map((item) => (
                  <Reveal key={item} className="flex gap-3 rounded-2xl border border-border/50 bg-white p-4 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="safety"
            pill="Safety"
            title="Safety checks are different for ED and hair loss"
            intro="Men's health symptoms can look simple on the surface but still point to cardiovascular, metabolic, skin, medicine, or mental-health context. Online review depends on enough clinical signal."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {SAFETY_TOPICS.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
            <ArticleVisuals visuals={visuals} imageLoading="lazy" />
          </SectionShell>

          <SectionShell
            id="red-flags"
            pill="Red flags"
            title="When to see someone in person"
            intro="Do not use an online men's health request for urgent symptoms or problems that need an examination, tests, or immediate support."
            muted
          >
            <Reveal className="rounded-3xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden="true" />
                <div>
                  <Heading level="h3" className="text-lg">
                    Use urgent or in-person care first
                  </Heading>
                  <ul className="mt-4 space-y-3">
                    {RED_FLAGS.map((item) => (
                      <li key={item} className="text-sm leading-6 text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </SectionShell>

          <SectionShell
            id="costs"
            pill="Cost, Medicare and PBS"
            title="Review fee, Medicare details, PBS and pharmacy cost are separate"
            intro="The online review fee pays for doctor assessment. It does not promise a prescription and does not include any pharmacy supply cost."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {COSTS.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="expect"
            pill="What to expect"
            title="After you submit"
            intro="The honest outcomes are approval if clinically appropriate, contact for more information, or decline with redirection and refund."
            muted
          >
            <div className="grid gap-4 md:grid-cols-3">
              {AFTER_SUBMIT.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="related"
            pill="Related care"
            title="Related pages and safer alternatives"
            intro="Use these pages when the concern overlaps with broader health, repeat prescribing, or urgent symptoms."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INTERNAL_LINKS.map((item) => (
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
            id="sources"
            pill="Sources"
            title="Sources and references"
            intro="This page was reviewed against Australian patient information, men's health education, telehealth guidance, PBS navigation, and advertising rules. Last reviewed: 2026-06."
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
            title="Men's health online FAQ"
            subtitle="Static answers for the common pathway, safety, cost, Medicare, PBS, and prescription-boundary questions before you start."
            items={MENS_HEALTH_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-background"
          />

          <section className="py-14 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
                <SectionPill>Start privately</SectionPill>
                <Heading level="h2" className="mt-4">
                  Choose an ED or hair-loss review
                </Heading>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Complete the pathway that matches your main concern. An AHPRA-registered doctor reviews your answers and decides whether online care is appropriate.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : ED_REQUEST_HREF}>
                      {isDisabled ? "Contact us" : "Request ED review"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : HAIR_LOSS_REQUEST_HREF}>Request hair loss review</Link>
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
