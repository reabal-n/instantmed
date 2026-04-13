"use client"

import { motion } from "framer-motion"
import { BadgeCheck, Brain, Monitor,Scale, ShieldAlert, Stethoscope } from "lucide-react"
import Link from "next/link"

import { useReducedMotion } from "@/components/ui/motion"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "understanding",
    icon: Brain,
    title: "Understanding weight management",
    paragraphs: [
      "Obesity is one of Australia's most significant health challenges - and one of the most misunderstood. According to the Australian Bureau of Statistics, around 67% of Australian adults are overweight or obese. That's not a lifestyle trend. It's a public health reality that affects more people than almost any other chronic condition, and pretending it's simply about willpower hasn't worked for anyone.",
      "Body Mass Index (BMI) remains the primary screening tool doctors use to assess weight-related health risk. A BMI of 25–29.9 is classified as overweight; 30 and above is obese. It's an imperfect measure - it doesn't account for muscle mass, body composition, or where fat is distributed - but combined with waist circumference and other markers, it gives clinicians a useful starting point for determining whether medical intervention is appropriate.",
      "The science is clear: obesity is a chronic medical condition driven by complex interactions between genetics, hormones, metabolism, environment, and behaviour. The hormones that regulate hunger and satiety - leptin, ghrelin, insulin, and others - can work against weight loss efforts in ways that have nothing to do with discipline. This is why diet and exercise alone produce lasting results for only a small percentage of people with clinical obesity, and why medical treatments exist. It's not a character flaw. It's biology being inconvenient.",
    ],
  },
  {
    id: "treatments",
    icon: Scale,
    title: "Evidence-based treatment approaches",
    paragraphs: [
      "Medical weight management has advanced significantly in recent years, and several categories of TGA-approved treatments are now available in Australia. The most prominent category works by mimicking a natural gut hormone that regulates appetite and blood sugar. These injectable treatments are administered weekly or daily, depending on the specific approach, and work by slowing gastric emptying and signalling fullness to the brain. Clinical trials have demonstrated average weight loss of 10–15% of body weight, which is substantially more than lifestyle modification alone typically achieves.",
      "Oral treatment options also exist. Some work on appetite-regulating pathways in the brain, reducing the constant background noise of hunger that makes sustained calorie reduction so difficult. Others combine multiple mechanisms - targeting both appetite suppression and the reward pathways associated with eating. These are typically used for shorter periods alongside lifestyle changes, though the specifics depend on individual circumstances and medical history.",
      "Hormone-based approaches may also be appropriate for some patients, particularly where hormonal imbalances are contributing to weight gain or making loss more difficult. Your doctor will assess whether any of these categories - or a combination - is appropriate based on your health profile, BMI, existing conditions, and treatment goals. There is no single best option. There's only the option that makes sense for your specific situation. Anyone claiming otherwise is probably trying to sell you a supplement.",
    ],
  },
  {
    id: "consultation",
    icon: Stethoscope,
    title: "What happens during a weight management consultation",
    paragraphs: [
      "A weight management consultation starts with a thorough health assessment - not just your weight. Your doctor will review your complete medical history, including existing conditions like type 2 diabetes, high blood pressure, sleep apnoea, and cardiovascular disease. These aren't just relevant - they're often the reason treatment is medically indicated in the first place. You'll also be asked about previous weight loss attempts, family history, current medications, and your mental health. This isn't a formality. It directly determines what treatment options are safe and appropriate.",
      "BMI and weight history form part of the clinical picture, but they're not the whole story. Your doctor will screen for contraindications - conditions or circumstances that make certain treatments unsafe. Pregnancy, breastfeeding, certain heart conditions, a history of eating disorders, and specific medication interactions all need to be evaluated before any treatment is prescribed. A consultation that skips this step isn't being efficient. It's being reckless.",
      "Based on this assessment, your doctor creates a personalised treatment plan with realistic expectations. That last part matters. Medical weight management is effective, but it's not magic - results vary, and sustainable progress takes months, not weeks. Your doctor will discuss target weight loss ranges, timelines, how to manage side effects, and when to schedule follow-up reviews. The goal is steady, medically supervised progress - not a transformation montage.",
    ],
  },
  {
    id: "safety",
    icon: ShieldAlert,
    title: "Safety and ongoing monitoring",
    paragraphs: [
      "Transparency about side effects is a feature, not a liability. Injectable treatments commonly cause gastrointestinal symptoms - nausea, diarrhoea, and constipation are the most frequently reported, particularly when starting treatment or increasing doses. These effects usually diminish over time as the body adjusts, and dose titration (starting low and increasing gradually) is standard practice specifically to minimise discomfort. Less commonly, some patients experience headaches, dizziness, or fatigue.",
      "Oral treatments carry their own side effect profiles. Some may affect heart rate, blood pressure, or sleep patterns. Others can cause dry mouth, constipation, or mood changes. Your doctor will discuss the specific risks associated with whichever approach is recommended for you - and monitor for them at follow-up appointments. Blood pressure monitoring is particularly important for certain treatment categories, and your doctor may request periodic blood tests to check metabolic markers.",
      "Knowing when to stop treatment is as important as knowing when to start. Pregnancy is an absolute contraindication for most weight management treatments - if you're planning pregnancy or become pregnant during treatment, your doctor needs to know immediately. Treatment may also be paused or adjusted if side effects are significant, if there's inadequate response after a reasonable trial period, or if your health circumstances change. This is medicine, not a subscription box. Regular check-ins aren't upselling - they're how responsible prescribing works.",
    ],
  },
  {
    id: "telehealth",
    icon: Monitor,
    title: "Why telehealth works for weight management",
    paragraphs: [
      "Weight management is one of the conditions most naturally suited to telehealth - and not just because it's convenient. The clinical assessment is primarily history-based: your medical background, BMI, current medications, and previous treatment attempts tell a doctor most of what they need to know. Physical examination adds relatively little for initial prescribing decisions, which is why telehealth consultations for weight management have been endorsed by multiple clinical guidelines.",
      "Follow-up is where telehealth really shines. Effective weight management requires regular monitoring - checking in on progress, adjusting doses, managing side effects, and maintaining motivation. In-person appointments for these reviews create friction that leads to dropout. When a follow-up is a brief online consultation rather than a two-hour round trip to a clinic, patients are significantly more likely to actually do it. And consistent follow-up is the single biggest predictor of long-term success.",
      "There's also the stigma question, and it's worth being honest about. Weight is a sensitive topic, and many people delay seeking medical help because they find the prospect of discussing it face-to-face uncomfortable - or because they've had dismissive experiences with healthcare providers in the past. Online consultations remove that barrier. You complete a detailed health assessment privately, a doctor reviews everything without preconceptions, and treatment decisions are based on clinical criteria rather than a thirty-second visual impression. For a condition where delayed treatment means worse outcomes, reducing barriers to access isn't just convenient. It's clinically meaningful.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - weight management biology, treatments, safety, telehealth suitability */
export function WeightLossGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="Weight loss treatment guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
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
            Everything you need to know about weight management
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The science, the options, and what to actually expect - without the
            marketing spin.
          </p>
        </motion.div>

        {/* Content sections */}
        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section, i) => (
            <motion.div
              key={section.id}
              initial={animate ? { y: 16 } : {}}
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
            . We never automate clinical decisions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
