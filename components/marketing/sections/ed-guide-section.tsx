"use client"

import { motion } from "framer-motion"
import {
  Activity,
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
import { useRef } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useReducedMotion } from "@/components/ui/motion"

// =============================================================================
// DATA - all content preserved for SEO (E-E-A-T)
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "understanding",
    icon: HeartPulse,
    title: "Understanding erectile dysfunction",
    paragraphs: [
      "Erectile dysfunction (ED) is more common than most people realise. The Men in Australia Telephone Survey (MATeS, Holden et al., 2005) found that at least one in five Australian men over 40 experience ED regularly, rising to nearly two in three men over 70. It\u2019s not a character flaw or a sign of weakness \u2014 it\u2019s a medical condition with well-understood biology and effective treatments. The reason early medical review matters is that ED is often the first visible symptom of something else going on: most commonly reduced blood flow from cardiovascular disease, but also diabetes, high blood pressure, hormonal changes, certain medications, and psychological factors like stress, anxiety, or depression.",
      "The underlying mechanism in the majority of cases is vascular. An erection depends on blood flowing into and staying within the penis, which requires healthy arteries, healthy nerves, and the right hormonal signals. When any of those links break down \u2014 narrowed arteries, nerve damage from diabetes, low testosterone, medication side effects \u2014 the result is difficulty achieving or maintaining an erection. Because the blood vessels involved are smaller than those in the heart, ED can be an early warning sign for cardiovascular problems that haven\u2019t caused symptoms elsewhere yet. This is one of the reasons a rushed, chatbot-style assessment is the wrong approach to ED.",
      "Psychological and situational factors matter too. Performance anxiety, relationship stress, work pressure, poor sleep, alcohol, and recreational drug use can all contribute \u2014 sometimes as the main cause, more often alongside physical factors. A good assessment considers both sides rather than assuming one or the other. For some people the right first step is medication; for others it\u2019s investigating an underlying condition; for others it\u2019s addressing lifestyle factors or talking to a GP or psychologist in person. A responsible online service helps you figure out which.",
    ],
  },
  {
    id: "assessment",
    icon: ClipboardCheck,
    title: "How our assessment works",
    paragraphs: [
      "Our assessment is a structured health questionnaire covering your symptoms, duration, medical history, current medications, and relevant lifestyle factors. It takes most people two to three minutes to complete. The questions are the same ones a GP would ask in a clinic \u2014 they\u2019re designed to surface the information a doctor needs to make a safe prescribing decision, and to flag anything that would make treatment unsafe or require in-person review.",
      "Once you submit, an AHPRA-registered Australian doctor reviews your questionnaire, typically within one to two hours during operating hours. If the doctor has questions, they\u2019ll message you through the platform \u2014 no video call required unless it\u2019s genuinely needed for safety. If treatment is appropriate, an eScript is sent to your phone by SMS, which you can take to any Australian pharmacy.",
      "If treatment is not appropriate \u2014 because of a safety issue, because a different cause needs investigation, or because the doctor thinks you should be seen in person \u2014 we tell you directly and issue a full refund. We don\u2019t prescribe anything we\u2019re not comfortable with. We\u2019d rather lose the sale than put someone at risk.",
    ],
  },
  {
    id: "treatments",
    icon: Pill,
    title: "Treatment options we can assess",
    paragraphs: [
      "The first-line prescription treatments for ED are a class of oral medications your doctor will discuss with you during review. They work by improving blood flow to the penis in response to sexual arousal. They are not aphrodisiacs and do not cause erections on their own \u2014 they only work in combination with normal sexual stimulation. This is the single most important thing to understand about how they work, and a good doctor will always explain it.",
      "Different oral treatments have different windows of action \u2014 some work for a few hours and are taken shortly before activity, others work over a longer window and can be taken on demand or as a lower daily dose depending on the situation. No single option is objectively \"better\" \u2014 the right choice depends on how often you need treatment, your lifestyle, your other medications, and your medical history. A doctor\u2019s role is to walk through those trade-offs honestly rather than push whatever is in stock.",
      "We can also recommend non-pharmacological approaches where they\u2019re appropriate. Addressing sleep, reducing alcohol, managing stress, exercising regularly, and treating underlying conditions like high blood pressure or diabetes all matter and sometimes make a bigger difference than medication. If the doctor thinks your situation calls for one of those approaches first, they\u2019ll say so rather than defaulting to a script.",
    ],
  },
  {
    id: "safety",
    icon: ShieldAlert,
    title: "Safety, contraindications, and side effects",
    paragraphs: [
      "Oral ED treatments are not safe for everyone. The single hardest contraindication is nitrate medication \u2014 if you take nitrates for chest pain (glyceryl trinitrate, isosorbide, or similar), combining them with these treatments can cause a life-threatening drop in blood pressure. This is a hard stop, not a precaution. Our safety screening flags nitrates explicitly, and the doctor confirms it as part of their review. We do not prescribe around this rule.",
      "Other situations where these treatments may not be safe or may need modification include recent heart attack or stroke, uncontrolled high or low blood pressure, severe heart failure, significant liver or kidney disease, and certain eye conditions (NAION). Some medications interact \u2014 particularly alpha-blockers (e.g., tamsulosin, prazosin) used for blood pressure or enlarged prostate, some antifungals, and some HIV medications. Our screening asks about these directly, and the reviewing doctor performs the final clinical check per TGA prescribing guidelines.",
      "The most common side effects of oral ED treatments are mild and temporary: headache, flushing, nasal congestion, indigestion, or (rarely) visual disturbance. Most people tolerate them well. Rarer but more serious side effects \u2014 sudden vision loss, sudden hearing loss, prolonged painful erection lasting more than four hours \u2014 need urgent medical attention and are discussed with you before you start. Honest, upfront information about risks is part of the service.",
    ],
  },
  {
    id: "in-person",
    icon: Stethoscope,
    title: "When you should see a GP in person",
    paragraphs: [
      "Online assessment is a good fit for a lot of ED cases, but not all of them. If your ED started suddenly alongside other symptoms \u2014 new chest pain on exertion, shortness of breath, leg swelling, unexplained weight loss, significant new mood changes, or neurological symptoms like weakness or numbness \u2014 we\u2019ll ask you to see a GP in person before considering medication. Sudden-onset ED with those features can be the first sign of a cardiovascular or neurological issue that needs examination and testing, not a script.",
      "If you\u2019ve never had a cardiovascular check and have several risk factors (age, family history, smoking, high blood pressure, high cholesterol, diabetes, significant weight gain), a baseline in-person assessment is a good idea before starting treatment. Oral ED treatments are generally safe, but they put extra demand on the heart during sex, and the responsible move is to know your baseline first. Our doctors will tell you if that applies to you.",
      "We also recommend in-person care when the main contributor looks psychological rather than physical \u2014 persistent low mood, significant anxiety, relationship issues that would benefit from counselling, or trauma. Medication can have a place alongside that work, but it isn\u2019t a substitute for it. If your situation fits this description, the doctor will let you know and, where appropriate, suggest next steps.",
    ],
  },
] as const

// Sub-sections for the "signal" accordion item
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
    text: "Low testosterone isn\u2019t a common cause of ED on its own, but when it is a factor it tends to come bundled with low libido, fatigue, and mood changes. A blood test rules it in or out.",
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
    title: "Structured form (about 5 minutes)",
    text: "You\u2019ll answer a short health questionnaire that covers your medical history, current medications, and a few targeted questions about symptoms. There are no video calls required \u2014 most patients are reviewed without any real-time conversation.",
  },
  {
    number: "2",
    title: "Doctor review (most cases within 1\u20132 hours)",
    text: "An AHPRA-registered Australian doctor reviews your submission. If they need anything clarified, they\u2019ll message you through the patient dashboard. If the picture is clear, they approve and move to prescription.",
  },
  {
    number: "3",
    title: "eScript delivery to your phone",
    text: "Same-day is possible when you submit during operating hours. The eScript goes to your nominated pharmacy as a standard electronic prescription \u2014 the pharmacist sees the script, not your assessment.",
  },
  {
    number: "4",
    title: "Discreet pharmacy collection or delivery",
    text: "Pharmacies dispense in standard packaging with no indication of contents. Your bank statement shows \u2018InstantMed\u2019 only. The whole loop \u2014 assessment to dispensed medication \u2014 usually closes in under 24 hours.",
  },
] as const

const PRIVACY_POINTS = [
  {
    title: "What the pharmacist sees",
    text: "Only the prescription itself. Dose, quantity, instructions. Not your assessment answers, not your reason for seeking treatment, not your medical history. A standard electronic prescription \u2014 indistinguishable from any other.",
  },
  {
    title: "What the bank statement says",
    text: "\u2018InstantMed\u2019 \u2014 nothing else. No medication name, no service descriptor, no billing code suggesting anything about what was purchased.",
  },
  {
    title: "How the package arrives",
    text: "Standard pharmacy packaging if you collect in person, standard postal packaging if you opt for delivery. Nothing on the outside references the medication or the condition.",
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - collapsed into accordion for UX, fully indexed for SEO */
export function EDGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion
  const posthog = usePostHog()
  const prevOpen = useRef<Set<string>>(new Set(["understanding"]))

  const handleAccordionChange = (values: string[]) => {
    // Only fire for NEWLY opened sections (not closes)
    const newlyOpened = values.filter((id) => !prevOpen.current.has(id))
    newlyOpened.forEach((id) => {
      posthog?.capture("ed_guide_section_opened", { section: id })
    })
    prevOpen.current = new Set(values)
  }

  return (
    <section
      aria-label="ED treatment guide"
      className="py-16 lg:py-20"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
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
        </motion.div>

        {/* Accordion content - all text rendered in DOM for SEO */}
        <Accordion
          type="multiple"
          defaultValue={["understanding"]}
          className="space-y-2"
          onValueChange={handleAccordionChange}
        >
          {/* Main guide sections */}
          {GUIDE_SECTIONS.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.03] px-5 data-[state=open]:shadow-md data-[state=open]:shadow-primary/[0.06] transition-shadow"
            >
              <AccordionTrigger className="py-4 hover:no-underline gap-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[15px] font-semibold text-foreground text-left">
                    {section.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pl-11 pb-1">
                  {section.paragraphs.map((p, j) => (
                    <p
                      key={j}
                      className="text-sm text-muted-foreground leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}

          {/* When ED is a signal of something bigger */}
          <AccordionItem
            value="signal"
            className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.03] px-5 data-[state=open]:shadow-md data-[state=open]:shadow-primary/[0.06] transition-shadow"
          >
            <AccordionTrigger className="py-4 hover:no-underline gap-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[15px] font-semibold text-foreground text-left">
                  When ED is a signal of something bigger
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-11 pb-1 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ED isn&apos;t always just about ED. It&apos;s one of the
                  earliest signals the body gives for a handful of underlying
                  conditions. Addressing the signal can mean catching the
                  underlying issue earlier.
                </p>
                {SIGNAL_SUBSECTIONS.map((sub) => (
                  <div key={sub.title}>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">
                      {sub.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {sub.text}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* What to expect from a telehealth assessment */}
          <AccordionItem
            value="telehealth"
            className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.03] px-5 data-[state=open]:shadow-md data-[state=open]:shadow-primary/[0.06] transition-shadow"
          >
            <AccordionTrigger className="py-4 hover:no-underline gap-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Workflow className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[15px] font-semibold text-foreground text-left">
                  What to expect from a telehealth assessment
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-11 pb-1 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Here&apos;s the honest, uncompressed version - so nothing
                  catches you off guard.
                </p>
                <ol className="space-y-4 list-none">
                  {TELEHEALTH_STEPS.map((step) => (
                    <li key={step.number} className="flex items-start gap-3">
                      <span
                        className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5"
                        aria-hidden="true"
                      >
                        {step.number}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {step.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Privacy and discretion */}
          <AccordionItem
            value="privacy"
            className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.03] px-5 data-[state=open]:shadow-md data-[state=open]:shadow-primary/[0.06] transition-shadow"
          >
            <AccordionTrigger className="py-4 hover:no-underline gap-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[15px] font-semibold text-foreground text-left">
                  Privacy and discretion - end to end
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-11 pb-1 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Three things worth knowing up front, because they&apos;re
                  the ones most people ask about.
                </p>
                {PRIVACY_POINTS.map((point) => (
                  <div key={point.title}>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">
                      {point.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {point.text}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Clinical governance link */}
        <motion.div
          className="mt-8 pt-6 border-t border-border/40 text-center"
          initial={{}}
          whileInView={animate ? { opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors following{" "}
            <Link
              href="/clinical-governance"
              className="text-primary hover:underline"
            >
              our clinical governance framework
            </Link>
            , RACGP telehealth standards, and TGA prescribing guidelines. We never automate clinical decisions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
