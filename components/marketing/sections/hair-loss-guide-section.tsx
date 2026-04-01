"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { BadgeCheck, Brain, FlaskConical, Stethoscope, ShieldAlert, Monitor } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "understanding",
    icon: Brain,
    title: "Understanding hair loss in Australia",
    paragraphs: [
      "Hair loss is one of the most common medical conditions in Australia — and one of the least discussed. Androgenetic alopecia (pattern hair loss) affects roughly 50% of men over 50 and around 40% of women experience noticeable thinning by menopause. Despite how common it is, many people treat it as a cosmetic concern rather than what it actually is: a medical condition with well-understood biology and effective treatments.",
      "The primary driver in most cases is dihydrotestosterone (DHT), a hormone derived from testosterone. DHT binds to receptors in hair follicles — particularly at the crown and temples in men — and gradually miniaturises them. Each growth cycle produces a thinner, shorter hair until the follicle eventually stops producing visible hair altogether. In women, the pattern is different: thinning tends to be diffuse across the top of the scalp rather than receding at the hairline.",
      "Doctors classify male pattern hair loss using the Norwood scale (seven stages from minor temple recession to extensive loss) and female pattern hair loss using the Ludwig scale (three stages of increasing diffuse thinning). These classification systems aren't just academic — they help determine which treatments are most appropriate and set realistic expectations. The single most important thing to understand: it is significantly easier to maintain existing hair than to regrow what's already been lost. Early intervention isn't marketing — it's biology.",
    ],
  },
  {
    id: "treatments",
    icon: FlaskConical,
    title: "Evidence-based treatment options",
    paragraphs: [
      "There are two main categories of treatment for pattern hair loss, both supported by decades of clinical evidence. The first is an oral treatment that works by blocking the enzyme responsible for converting testosterone to DHT — the hormone that miniaturises hair follicles. By reducing DHT levels, this treatment slows or stops further hair loss and, in many cases, allows partially miniaturised follicles to recover. It's taken as a daily tablet and is most effective for hair loss at the crown and mid-scalp. Most people see reduced shedding within three months, with visible improvement by six to twelve months.",
      "The second approach is a topical treatment applied directly to the scalp. It works by stimulating blood flow to hair follicles and prolonging the growth phase of the hair cycle. Available in different strengths and formulations (liquid and foam), it's applied once or twice daily depending on the preparation. It's effective for both men and women, though the recommended strengths differ.",
      "Many people use both treatments together — the oral treatment addresses the hormonal cause while the topical treatment directly stimulates follicle activity. Your doctor will recommend the approach that makes sense for your specific pattern, severity, and medical history. One thing to be clear about: results take time. Three months is the minimum to see reduced shedding, and six to twelve months for meaningful regrowth. Anyone promising faster results is selling something other than medicine.",
    ],
  },
  {
    id: "consultation",
    icon: Stethoscope,
    title: "What happens during a hair loss consultation",
    paragraphs: [
      "A hair loss consultation starts with your medical history — not just your hair. Your doctor will ask about family history of hair loss (both sides matter, not just your father's), when you first noticed thinning, and how it's progressed. They'll also screen for other conditions that can cause or worsen hair loss: thyroid disorders, iron deficiency, hormonal imbalances, stress, and certain medications. Hair loss can be a symptom of something else entirely, and a responsible doctor checks before prescribing.",
      "You may be asked to provide photos of your scalp from specific angles. For pattern hair loss, photos are genuinely diagnostic — they show distribution, density, and miniaturisation in ways that are often more informative than a physical examination. Your doctor will assess whether your pattern is consistent with androgenetic alopecia or whether further investigation (blood tests, specialist referral) is warranted.",
      "Based on this assessment, your doctor creates a personalised treatment plan. This includes which treatment approach is appropriate, what strength and formulation to use, what results to realistically expect, and when to follow up. Not everyone is a candidate for every treatment — and a good consultation is as much about ruling things out as it is about prescribing.",
    ],
  },
  {
    id: "side-effects",
    icon: ShieldAlert,
    title: "Side effects and safety",
    paragraphs: [
      "Honesty about side effects isn't a liability — it's the reason you should trust a service. Oral treatments that block DHT can cause sexual side effects in a small percentage of users: approximately 1–2% may experience decreased libido, erectile difficulty, or reduced ejaculate volume. In the vast majority of cases, these effects are mild and resolve completely after stopping the medication. There are rare reports of persistent effects, though large-scale studies suggest this is uncommon.",
      "Topical treatments are generally well tolerated. The most common side effect is scalp irritation — dryness, flaking, or itching at the application site. Some people experience unwanted hair growth on areas adjacent to the application site (forehead, cheeks), which is why careful application matters. Rarely, topical treatments can cause dizziness or heart palpitations, particularly at higher strengths.",
      "Women should not use certain oral treatments for hair loss due to the risk of birth defects during pregnancy. This is a hard contraindication, not a precaution. Your doctor will discuss safe alternatives. For all treatments, ongoing monitoring is part of the process — your doctor adjusts the plan based on how you respond, both in terms of results and any side effects. A treatment that works brilliantly on paper but makes you miserable in practice isn't a good treatment.",
    ],
  },
  {
    id: "online-treatment",
    icon: Monitor,
    title: "Why online treatment works for hair loss",
    paragraphs: [
      "Hair loss is one of the conditions best suited to telehealth. Diagnosis is primarily history-based: your family pattern, age of onset, and progression tell a doctor most of what they need to know. Scalp photos — which you can take at home with a phone — are highly informative for assessing distribution and severity. There is no blood pressure to measure, no lump to palpate, no stethoscope required. Pattern hair loss is, diagnostically, a condition made for remote assessment.",
      "Follow-up is equally straightforward. Treatment monitoring means checking: is the shedding slowing? Is there visible improvement? Are there any side effects? All of this can be communicated through a brief questionnaire and updated photos. Regular check-ins are easy to schedule and don't require taking time off work or sitting in a waiting room.",
      "There's also a practical reality that matters: many men delay seeking treatment for hair loss because they find it embarrassing. Walking into a clinic and saying \"I'm losing my hair\" feels harder than it should. Online consultations remove that barrier entirely. You complete a medical questionnaire, upload photos, and a doctor reviews everything privately. No waiting room, no small talk, no judgement. Given that early treatment produces the best results, anything that gets people to act sooner is genuinely good medicine.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section — hair loss biology, treatments, safety, telehealth suitability */
export function HairLossGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="Hair loss treatment guide"
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
            Everything you need to know about hair loss treatment
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The science, the options, and what to actually expect — without the
            marketing spin.
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
