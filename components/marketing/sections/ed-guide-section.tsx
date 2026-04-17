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
  Workflow,
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
// DATA - all content preserved for SEO (E-E-A-T)
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "understanding",
    icon: HeartPulse,
    title: "Understanding erectile dysfunction",
    paragraphs: [
      "Erectile dysfunction (ED) is more common than most people realise. The Men in Australia Telephone Survey (MATeS, Holden et al., 2005) found that at least one in five Australian men over 40 experience ED regularly, rising to nearly two in three men over 70. It's not a character flaw or a sign of weakness - it's a medical condition with well-understood biology and effective treatments. The reason early medical review matters is that ED is often the first visible symptom of something else going on: most commonly reduced blood flow from cardiovascular disease, but also diabetes, high blood pressure, hormonal changes, certain medications, and psychological factors like stress, anxiety, or depression.",
      "The underlying mechanism in the majority of cases is vascular. An erection depends on blood flowing into and staying within the penis, which requires healthy arteries, healthy nerves, and the right hormonal signals. When any of those links break down - narrowed arteries, nerve damage from diabetes, low testosterone, medication side effects - the result is difficulty achieving or maintaining an erection. Because the blood vessels involved are smaller than those in the heart, ED can be an early warning sign for cardiovascular problems that haven't caused symptoms elsewhere yet. This is one of the reasons a rushed, chatbot-style assessment is the wrong approach to ED.",
      "Psychological and situational factors matter too. Performance anxiety, relationship stress, work pressure, poor sleep, alcohol, and recreational drug use can all contribute - sometimes as the main cause, more often alongside physical factors. A good assessment considers both sides rather than assuming one or the other. For some people the right first step is medication; for others it's investigating an underlying condition; for others it's addressing lifestyle factors or talking to a GP or psychologist in person. A responsible online service helps you figure out which.",
    ],
  },
  {
    id: "assessment",
    icon: ClipboardCheck,
    title: "How our assessment works",
    paragraphs: [
      "Our assessment is a structured health questionnaire covering your symptoms, duration, medical history, current medications, and relevant lifestyle factors. It takes most people two to three minutes to complete. The questions are the same ones a GP would ask in a clinic - they're designed to surface the information a doctor needs to make a safe prescribing decision, and to flag anything that would make treatment unsafe or require in-person review.",
      "Once you submit, an AHPRA-registered Australian doctor reviews your questionnaire, typically within one to two hours during operating hours. If the doctor has questions, they'll message you through the platform - no video call required unless it's genuinely needed for safety. If treatment is appropriate, an eScript is sent to your phone by SMS, which you can take to any Australian pharmacy.",
      "If treatment is not appropriate - because of a safety issue, because a different cause needs investigation, or because the doctor thinks you should be seen in person - we tell you directly and issue a full refund. We don't prescribe anything we're not comfortable with. We'd rather lose the sale than put someone at risk.",
    ],
  },
  {
    id: "treatments",
    icon: Pill,
    title: "Treatment options we can assess",
    paragraphs: [
      "The first-line prescription treatments for ED are a class of oral medications your doctor will discuss with you during review. They work by improving blood flow to the penis in response to sexual arousal. They are not aphrodisiacs and do not cause erections on their own - they only work in combination with normal sexual stimulation. This is the single most important thing to understand about how they work, and a good doctor will always explain it.",
      "Different oral treatments have different windows of action - some work for a few hours and are taken shortly before activity, others work over a longer window and can be taken on demand or as a lower daily dose depending on the situation. No single option is objectively \"better\" - the right choice depends on how often you need treatment, your lifestyle, your other medications, and your medical history. A doctor's role is to walk through those trade-offs honestly rather than push whatever is in stock.",
      "We can also recommend non-pharmacological approaches where they're appropriate. Addressing sleep, reducing alcohol, managing stress, exercising regularly, and treating underlying conditions like high blood pressure or diabetes all matter and sometimes make a bigger difference than medication. If the doctor thinks your situation calls for one of those approaches first, they'll say so rather than defaulting to a script.",
    ],
  },
  {
    id: "safety",
    icon: ShieldAlert,
    title: "Safety, contraindications, and side effects",
    paragraphs: [
      "Oral ED treatments are not safe for everyone. The single hardest contraindication is nitrate medication - if you take nitrates for chest pain (glyceryl trinitrate, isosorbide, or similar), combining them with these treatments can cause a life-threatening drop in blood pressure. This is a hard stop, not a precaution. Our safety screening flags nitrates explicitly, and the doctor confirms it as part of their review. We do not prescribe around this rule.",
      "Other situations where these treatments may not be safe or may need modification include recent heart attack or stroke, uncontrolled high or low blood pressure, severe heart failure, significant liver or kidney disease, and certain eye conditions (NAION). Some medications interact - particularly alpha-blockers (e.g., tamsulosin, prazosin) used for blood pressure or enlarged prostate, some antifungals, and some HIV medications. Our screening asks about these directly, and the reviewing doctor performs the final clinical check per TGA prescribing guidelines.",
      "The most common side effects of oral ED treatments are mild and temporary: headache, flushing, nasal congestion, indigestion, or (rarely) visual disturbance. Most people tolerate them well. Rarer but more serious side effects - sudden vision loss, sudden hearing loss, prolonged painful erection lasting more than four hours - need urgent medical attention and are discussed with you before you start. Honest, upfront information about risks is part of the service.",
    ],
  },
  {
    id: "in-person",
    icon: Stethoscope,
    title: "When you should see a GP in person",
    paragraphs: [
      "Online assessment is a good fit for a lot of ED cases, but not all of them. If your ED started suddenly alongside other symptoms - new chest pain on exertion, shortness of breath, leg swelling, unexplained weight loss, significant new mood changes, or neurological symptoms like weakness or numbness - we'll ask you to see a GP in person before considering medication. Sudden-onset ED with those features can be the first sign of a cardiovascular or neurological issue that needs examination and testing, not a script.",
      "If you've never had a cardiovascular check and have several risk factors (age, family history, smoking, high blood pressure, high cholesterol, diabetes, significant weight gain), a baseline in-person assessment is a good idea before starting treatment. Oral ED treatments are generally safe, but they put extra demand on the heart during sex, and the responsible move is to know your baseline first. Our doctors will tell you if that applies to you.",
      "We also recommend in-person care when the main contributor looks psychological rather than physical - persistent low mood, significant anxiety, relationship issues that would benefit from counselling, or trauma. Medication can have a place alongside that work, but it isn't a substitute for it. If your situation fits this description, the doctor will let you know and, where appropriate, suggest next steps.",
    ],
  },
] as const

const SIGNAL_SUBSECTIONS = [
  {
    title: "Cardiovascular",
    text: "The arteries that supply the penis are narrower than those around the heart, so they often show stress first. New-onset ED in a man over 40 is worth mentioning at his next GP visit even if everything else feels fine.",
  },
  {
    title: "Diabetes and insulin resistance",
    text: "Persistently high blood sugar damages the blood vessels and nerves involved in the erectile response. In some men ED is the first symptom that flags undiagnosed diabetes.",
  },
  {
    title: "Testosterone",
    text: "Low testosterone isn't a common cause of ED on its own, but when it is a factor it tends to come bundled with low libido, fatigue, and mood changes. A blood test rules it in or out.",
  },
  {
    title: "Sleep apnea",
    text: "Untreated obstructive sleep apnea fragments sleep, drops nocturnal testosterone, and stresses the cardiovascular system. Treating the apnea sometimes improves erectile function on its own.",
  },
  {
    title: "Stress and mental health",
    text: "Anxiety and low mood are both causes AND consequences of ED. Addressing the psychological side in parallel with any physical treatment often makes a real difference.",
  },
] as const

const TELEHEALTH_STEPS = [
  {
    number: "1",
    title: "Structured form (~5 minutes)",
    text: "You'll answer a short health questionnaire that covers your medical history, current medications, and a few targeted questions about symptoms. There are no video calls required - most patients are reviewed without any real-time conversation.",
  },
  {
    number: "2",
    title: "Doctor review (most cases within 1-2 hours)",
    text: "An AHPRA-registered Australian doctor reviews your submission. If they need anything clarified, they'll message you through the patient dashboard. If the picture is clear, they approve and move to prescription.",
  },
  {
    number: "3",
    title: "eScript delivery to your phone",
    text: "Same-day is possible when you submit during operating hours. The eScript goes to your nominated pharmacy as a standard electronic prescription - the pharmacist sees the script, not your assessment.",
  },
  {
    number: "4",
    title: "Discreet pharmacy collection or delivery",
    text: "Pharmacies dispense in standard packaging with no indication of contents. Your bank statement shows 'InstantMed' only. The whole loop - assessment to dispensed medication - usually closes in under 24 hours.",
  },
] as const

const PRIVACY_POINTS = [
  {
    title: "What the pharmacist sees",
    text: "Only the prescription itself. Dose, quantity, instructions. Not your assessment answers, not your reason for seeking treatment, not your medical history.",
  },
  {
    title: "What the bank statement says",
    text: "'InstantMed' - nothing else. No medication name, no service descriptor, no billing code suggesting anything about what was purchased.",
  },
  {
    title: "How the package arrives",
    text: "Standard pharmacy packaging if you collect in person, standard postal packaging if you opt for delivery. Nothing on the outside references the medication or the condition.",
  },
] as const

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
            <div className="space-y-4 pt-1">
              {/* Stat callout */}
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
                <HeartPulse className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">
                  At least 1 in 5 Australian men over 40 experience ED regularly - rising to 2 in 3 men over 70.
                </p>
              </div>
              {GUIDE_SECTIONS[0].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 2. ED as a signal - card grid */}
          <GuideItem value="signal" icon={Activity} title="When ED is a signal of something bigger">
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                ED isn&apos;t always just about ED. It&apos;s one of the earliest signals the body gives for a handful of underlying conditions. Addressing the signal can mean catching the underlying issue earlier.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SIGNAL_SUBSECTIONS.map((sub) => (
                  <div
                    key={sub.title}
                    className="rounded-lg border border-border/50 bg-muted/30 dark:bg-white/[0.03] p-3.5"
                  >
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
            <div className="space-y-3 pt-1">
              {GUIDE_SECTIONS[1].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 4. Treatment options - with key insight callout */}
          <GuideItem value="treatments" icon={Pill} title="Treatment options we can assess">
            <div className="space-y-4 pt-1">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 p-3 flex items-start gap-2.5">
                <Pill className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">
                  These treatments only work with normal sexual stimulation - they are not aphrodisiacs and do not cause erections on their own.
                </p>
              </div>
              {GUIDE_SECTIONS[2].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 5. Safety - red hard stop + remaining content */}
          <GuideItem value="safety" icon={ShieldAlert} title="Safety, contraindications, and side effects">
            <div className="space-y-4 pt-1">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">Hard stop: nitrate medications</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If you take nitrates for chest pain (glyceryl trinitrate, isosorbide, or similar), combining them with these treatments can cause a life-threatening drop in blood pressure. No exceptions - we do not prescribe around this rule.
                  </p>
                </div>
              </div>
              {GUIDE_SECTIONS[3].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 6. When to see in person */}
          <GuideItem value="in-person" icon={Stethoscope} title="When you should see a GP in person">
            <div className="space-y-3 pt-1">
              {GUIDE_SECTIONS[4].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 7. Telehealth steps - connected timeline visual */}
          <GuideItem value="telehealth" icon={Workflow} title="What to expect from a telehealth assessment">
            <div className="pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Here&apos;s the honest, uncompressed version - so nothing catches you off guard.
              </p>
              <div>
                {TELEHEALTH_STEPS.map((step, i) => (
                  <div key={step.number} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {step.number}
                      </div>
                      {i < TELEHEALTH_STEPS.length - 1 && (
                        <div className="w-px flex-1 bg-primary/20 my-1.5" style={{ minHeight: "24px" }} />
                      )}
                    </div>
                    <div className={i < TELEHEALTH_STEPS.length - 1 ? "pb-5 flex-1" : "flex-1"}>
                      <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GuideItem>

          {/* 8. Privacy - 3 card grid */}
          <GuideItem value="privacy" icon={Lock} title="Privacy and discretion - end to end">
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Three things worth knowing up front, because they&apos;re the ones most people ask about.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRIVACY_POINTS.map((point) => (
                  <div
                    key={point.title}
                    className="rounded-lg bg-muted/30 dark:bg-white/[0.03] border border-border/50 p-4 text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2.5">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">{point.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </GuideItem>
        </Accordion>

        {/* Clinical governance footer */}
        <Reveal className="mt-8 pt-6 border-t border-border/40 text-center" delay={0.3}>
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors following{" "}
            <Link href="/clinical-governance" className="text-primary hover:underline">
              our clinical governance framework
            </Link>
            , RACGP telehealth standards, and TGA prescribing guidelines. We never automate clinical decisions.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
