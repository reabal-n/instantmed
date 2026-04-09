"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { BadgeCheck, HeartPulse, ClipboardCheck, Pill, ShieldAlert, Stethoscope } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "understanding",
    icon: HeartPulse,
    title: "Understanding erectile dysfunction",
    paragraphs: [
      "Erectile dysfunction (ED) is more common than most people realise. Australian research suggests around one in five men over 40 experience ED regularly, and the likelihood increases with age. It's not a character flaw or a sign of weakness — it's a medical condition with well-understood biology and effective treatments. The reason early medical review matters is that ED is often the first visible symptom of something else going on: most commonly reduced blood flow from cardiovascular disease, but also diabetes, high blood pressure, hormonal changes, certain medications, and psychological factors like stress, anxiety, or depression.",
      "The underlying mechanism in the majority of cases is vascular. An erection depends on blood flowing into and staying within the penis, which requires healthy arteries, healthy nerves, and the right hormonal signals. When any of those links break down — narrowed arteries, nerve damage from diabetes, low testosterone, medication side effects — the result is difficulty achieving or maintaining an erection. Because the blood vessels involved are smaller than those in the heart, ED can be an early warning sign for cardiovascular problems that haven't caused symptoms elsewhere yet. This is one of the reasons a rushed, chatbot-style assessment is the wrong approach to ED.",
      "Psychological and situational factors matter too. Performance anxiety, relationship stress, work pressure, poor sleep, alcohol, and recreational drug use can all contribute — sometimes as the main cause, more often alongside physical factors. A good assessment considers both sides rather than assuming one or the other. For some people the right first step is medication; for others it's investigating an underlying condition; for others it's addressing lifestyle factors or talking to a GP or psychologist in person. A responsible online service helps you figure out which.",
    ],
  },
  {
    id: "assessment",
    icon: ClipboardCheck,
    title: "How our assessment works",
    paragraphs: [
      "Our assessment is a structured health questionnaire covering your symptoms, duration, medical history, current medications, and relevant lifestyle factors. It takes most people two to three minutes to complete. The questions are the same ones a GP would ask in a clinic — they're designed to surface the information a doctor needs to make a safe prescribing decision, and to flag anything that would make treatment unsafe or require in-person review.",
      "Once you submit, an AHPRA-registered Australian doctor reviews your questionnaire, typically within one to two hours during operating hours. If the doctor has questions, they'll message you through the platform — no video call required unless it's genuinely needed for safety. If treatment is appropriate, an eScript is sent to your phone by SMS, which you can take to any Australian pharmacy.",
      "If treatment is not appropriate — because of a safety issue, because a different cause needs investigation, or because the doctor thinks you should be seen in person — we tell you directly and issue a full refund. We don't prescribe anything we're not comfortable with. We'd rather lose the sale than put someone at risk.",
    ],
  },
  {
    id: "treatments",
    icon: Pill,
    title: "Treatment options we can assess",
    paragraphs: [
      "The first-line prescription treatments for ED are a class of oral medications your doctor will discuss with you during review. They work by improving blood flow to the penis in response to sexual arousal. They are not aphrodisiacs and do not cause erections on their own — they only work in combination with normal sexual stimulation. This is the single most important thing to understand about how they work, and a good doctor will always explain it.",
      "Different oral treatments have different windows of action — some work for a few hours and are taken shortly before activity, others work over a longer window and can be taken on demand or as a lower daily dose depending on the situation. No single option is objectively \"better\" — the right choice depends on how often you need treatment, your lifestyle, your other medications, and your medical history. A doctor's role is to walk through those trade-offs honestly rather than push whatever is in stock.",
      "We can also recommend non-pharmacological approaches where they're appropriate. Addressing sleep, reducing alcohol, managing stress, exercising regularly, and treating underlying conditions like high blood pressure or diabetes all matter and sometimes make a bigger difference than medication. If the doctor thinks your situation calls for one of those approaches first, they'll say so rather than defaulting to a script.",
    ],
  },
  {
    id: "safety",
    icon: ShieldAlert,
    title: "Safety, contraindications, and side effects",
    paragraphs: [
      "Oral ED treatments are not safe for everyone. The single hardest contraindication is nitrate medication — if you take nitrates for chest pain (glyceryl trinitrate, isosorbide, or similar), combining them with these treatments can cause a life-threatening drop in blood pressure. This is a hard stop, not a precaution. Our safety screening flags nitrates explicitly, and the doctor confirms it as part of their review. We do not prescribe around this rule.",
      "Other situations where these treatments may not be safe or may need modification include recent heart attack or stroke, uncontrolled high or low blood pressure, severe heart failure, significant liver or kidney disease, and certain eye conditions. Some medications interact — particularly alpha-blockers used for blood pressure or enlarged prostate, some antifungals, and some HIV medications. The questionnaire asks about these directly, and the doctor performs the final clinical review.",
      "The most common side effects of oral ED treatments are mild and temporary: headache, flushing, nasal congestion, indigestion, or (rarely) visual disturbance. Most people tolerate them well. Rarer but more serious side effects — sudden vision loss, sudden hearing loss, prolonged painful erection lasting more than four hours — need urgent medical attention and are discussed with you before you start. Honest, upfront information about risks is part of the service.",
    ],
  },
  {
    id: "in-person",
    icon: Stethoscope,
    title: "When you should see a GP in person",
    paragraphs: [
      "Online assessment is a good fit for a lot of ED cases, but not all of them. If your ED started suddenly alongside other symptoms — new chest pain on exertion, shortness of breath, leg swelling, unexplained weight loss, significant new mood changes, or neurological symptoms like weakness or numbness — we'll ask you to see a GP in person before considering medication. Sudden-onset ED with those features can be the first sign of a cardiovascular or neurological issue that needs examination and testing, not a script.",
      "If you've never had a cardiovascular check and have several risk factors (age, family history, smoking, high blood pressure, high cholesterol, diabetes, significant weight gain), a baseline in-person assessment is a good idea before starting treatment. Oral ED treatments are generally safe, but they put extra demand on the heart during sex, and the responsible move is to know your baseline first. Our doctors will tell you if that applies to you.",
      "We also recommend in-person care when the main contributor looks psychological rather than physical — persistent low mood, significant anxiety, relationship issues that would benefit from counselling, or trauma. Medication can have a place alongside that work, but it isn't a substitute for it. If your situation fits this description, the doctor will let you know and, where appropriate, suggest next steps.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section — ED biology, assessment, treatments, safety, when to see a GP in person */
export function EDGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="ED treatment guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Everything you need to know about online ED treatment
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            How assessment works, what treatments are available, and when you
            should see a GP in person — without the marketing spin.
          </p>
        </motion.div>

        {/* Content sections */}
        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section, i) => (
            <motion.div
              key={section.id}
              initial={animate ? { opacity: 0, y: 16 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.paragraphs.map((p, j) => (
                      <p
                        key={j}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Clinical governance link */}
        <motion.div
          className="mt-12 pt-8 border-t border-border/40 text-center"
          initial={animate ? { opacity: 0 } : {}}
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
            . We never automate clinical decisions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
