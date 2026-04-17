"use client"

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  HeartPulse,
  Lock,
  Pill,
  ShieldAlert,
  Stethoscope,
} from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useRef } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// HELPERS
// =============================================================================

function GuideItem({
  value,
  icon: Icon,
  title,
  children,
}: {
  value: string
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <AccordionItem
      value={value}
      className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.03] px-5 data-[state=open]:shadow-md data-[state=open]:shadow-primary/[0.06] transition-shadow"
    >
      <AccordionTrigger className="py-4 hover:no-underline gap-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[15px] font-semibold text-foreground text-left">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-11 pb-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mt-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-primary/40" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - collapsed into accordion for UX, fully indexed for SEO */
export function EDGuideSection() {
  const posthog = usePostHog()
  const prevOpen = useRef<Set<string>>(new Set(["understanding"]))

  const handleAccordionChange = (values: string[]) => {
    const newlyOpened = values.filter((id) => !prevOpen.current.has(id))
    newlyOpened.forEach((id) => {
      posthog?.capture("ed_guide_section_opened", { section: id })
    })
    prevOpen.current = new Set(values)
  }

  return (
    <section aria-label="ED treatment guide" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Everything you need to know
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Assessment, treatments, safety, and when to see a GP in person.
          </p>
        </Reveal>

        <Accordion
          type="multiple"
          defaultValue={["understanding"]}
          className="space-y-2"
          onValueChange={handleAccordionChange}
        >
          {/* 1. Understanding ED */}
          <GuideItem value="understanding" icon={HeartPulse} title="Understanding erectile dysfunction">
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
                <HeartPulse className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">
                  At least 1 in 5 Australian men over 40 experience ED regularly — rising to 2 in 3 men over 70.
                </p>
              </div>
              <Bullets items={[
                "ED is a medical condition, not a character flaw — it has well-understood biology and effective treatments.",
                "Most cases are vascular: blood flow is reduced due to narrowed arteries, often from cardiovascular disease, diabetes, or high blood pressure.",
                "ED is often the first visible sign of cardiovascular problems that haven't shown up elsewhere yet — early review matters.",
                "Psychological factors (performance anxiety, stress, poor sleep, alcohol) are frequently involved, sometimes as the main cause.",
              ]} />
            </div>
          </GuideItem>

          {/* 2. ED as a signal - card grid */}
          <GuideItem value="signal" icon={Activity} title="When ED is a signal of something bigger">
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                ED is one of the earliest signals the body gives for several underlying conditions. Catching it early can mean catching the underlying issue earlier too.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { title: "Cardiovascular", text: "The arteries supplying the penis are narrower than those around the heart — they often show stress first. New-onset ED in a man over 40 is worth mentioning at the next GP visit." },
                  { title: "Diabetes", text: "High blood sugar damages blood vessels and nerves involved in the erectile response. In some men, ED is the first symptom of undiagnosed diabetes." },
                  { title: "Testosterone", text: "Low testosterone isn't a common standalone cause, but when it's a factor it usually comes with low libido, fatigue, and mood changes. A blood test rules it in or out." },
                  { title: "Sleep apnoea", text: "Untreated sleep apnoea fragments sleep, drops nocturnal testosterone, and stresses the cardiovascular system. Treating it sometimes improves erectile function on its own." },
                  { title: "Stress and mental health", text: "Anxiety and low mood are both causes and consequences of ED. Addressing the psychological side in parallel with any physical treatment usually makes a real difference." },
                ].map((sub) => (
                  <div key={sub.title} className="rounded-lg border border-border/50 bg-muted/30 dark:bg-white/[0.03] p-3.5">
                    <div className="h-0.5 w-6 rounded-full bg-primary/40 mb-2.5" />
                    <p className="text-xs font-semibold text-foreground mb-1">{sub.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sub.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </GuideItem>

          {/* 3. How the assessment works */}
          <GuideItem value="assessment" icon={ClipboardCheck} title="How our assessment works">
            <div className="pt-1">
              <div className="space-y-4">
                {[
                  { n: "1", title: "Short health form (~2 min)", text: "Questions about your symptoms, medical history, and current medications — the same ones a GP would ask. No video call required." },
                  { n: "2", title: "Doctor review (typically 1–2 hours)", text: "An AHPRA-registered Australian doctor reviews your submission. If they need clarification, they'll message you. If appropriate, they approve and prescribe." },
                  { n: "3", title: "eScript to your phone", text: "Prescription sent by SMS. Take it to any Australian pharmacy. If treatment isn't appropriate, we tell you directly and refund in full." },
                ].map((step, i, arr) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {step.n}
                      </div>
                      {i < arr.length - 1 && <div className="w-px flex-1 bg-primary/20 my-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold text-foreground mb-0.5">{step.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GuideItem>

          {/* 4. Treatment options */}
          <GuideItem value="treatments" icon={Pill} title="Treatment options">
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 p-3 flex items-start gap-2.5">
                <Pill className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">
                  These treatments only work with normal sexual stimulation — they are not aphrodisiacs.
                </p>
              </div>
              <Bullets items={[
                "First-line treatments are oral tablets that work by improving blood flow in response to sexual arousal.",
                "Different options have different windows — some last a few hours, others 24–36 hours. The right choice depends on your lifestyle and medical history.",
                "There's no objectively 'best' option — your doctor walks through the trade-offs based on your assessment.",
                "Non-pharmacological factors also matter: sleep, alcohol, exercise, and treating underlying conditions sometimes make the biggest difference.",
              ]} />
            </div>
          </GuideItem>

          {/* 5. Safety */}
          <GuideItem value="safety" icon={ShieldAlert} title="Safety and contraindications">
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">Hard stop: nitrate medications</p>
                  <p className="text-xs text-muted-foreground">
                    Nitrates for chest pain (glyceryl trinitrate, isosorbide) combined with ED treatment can cause a life-threatening drop in blood pressure. No exceptions.
                  </p>
                </div>
              </div>
              <Bullets items={[
                "Also requires caution with: recent heart attack or stroke, uncontrolled blood pressure, severe heart failure, significant liver or kidney disease.",
                "Drug interactions to flag: alpha-blockers (tamsulosin, prazosin), some antifungals, some HIV medications.",
                "Common side effects: headache, flushing, nasal congestion, indigestion — usually mild and temporary.",
                "Rare but urgent: sudden vision or hearing loss, or an erection lasting more than 4 hours — seek immediate medical attention.",
              ]} />
            </div>
          </GuideItem>

          {/* 6. When to see in person */}
          <GuideItem value="in-person" icon={Stethoscope} title="When to see a GP in person instead">
            <div className="pt-1">
              <p className="text-sm text-muted-foreground mb-3">Online assessment isn't right for every situation. See a GP in person if:</p>
              <Bullets items={[
                "ED started suddenly alongside new chest pain, shortness of breath, leg swelling, neurological symptoms, or unexplained weight loss.",
                "You've never had a cardiovascular check and have multiple risk factors (age, smoking, family history, high blood pressure, diabetes).",
                "The main contributor looks psychological — persistent low mood, significant anxiety, relationship difficulties, or trauma.",
                "You notice visibly scarred or inflamed patches of scalp that could suggest a different condition requiring examination.",
              ]} />
            </div>
          </GuideItem>

          {/* 7. Privacy */}
          <GuideItem value="privacy" icon={Lock} title="Privacy: what stays private">
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { title: "The pharmacist sees", text: "Only the prescription — dose, quantity, instructions. Not your assessment answers or medical history." },
                  { title: "Your bank statement shows", text: "'InstantMed' — nothing else. No medication name, no condition, no billing code." },
                  { title: "The package looks like", text: "Standard pharmacy packaging. Nothing on the outside references the medication or the condition." },
                ].map((point) => (
                  <div key={point.title} className="rounded-lg border border-border/50 bg-muted/30 p-3.5">
                    <p className="text-xs font-semibold text-foreground mb-1">{point.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </GuideItem>
        </Accordion>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          All clinical decisions are made by AHPRA-registered doctors following our{" "}
          <Link href="/clinical-governance" className="underline hover:text-foreground transition-colors">
            clinical governance framework
          </Link>
          . We never automate clinical decisions.
        </p>
      </div>
    </section>
  )
}
