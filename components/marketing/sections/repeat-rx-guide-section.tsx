"use client"

import { motion } from "framer-motion"
import { BadgeCheck, DollarSign, Pill, Smartphone, Stethoscope, UserCheck } from "lucide-react"
import Link from "next/link"

import { useReducedMotion } from "@/components/ui/motion"
import { PRICING_DISPLAY } from "@/lib/constants"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "what-is-escript",
    icon: Smartphone,
    title: "What is an eScript?",
    paragraphs: [
      "An electronic prescription - commonly called an eScript - is a digital version of the traditional paper prescription. Since 2020, eScripts have become the national standard for prescribing in Australia, replacing the handwritten scripts that spent decades getting lost in jacket pockets and car glove boxes.",
      "When a doctor issues an eScript, you receive an SMS or email containing a unique token - a short code or QR code that identifies your prescription. You present this token at any Australian pharmacy, either on your phone screen or as a printout, and the pharmacist dispenses your medication. No paper script required, no illegible handwriting to decipher.",
      "Australia also operates the Active Scripts List (ASL), a national digital record of your current prescriptions. If you've opted in, your pharmacist can access your prescriptions directly through the ASL without needing the token at all. You can opt in through your pharmacy or via your My Health Record. The ASL is particularly useful for repeat prescriptions - your regular pharmacy can see exactly what you're taking and how many repeats remain.",
      "eScripts are accepted at every pharmacy in Australia. It doesn't matter whether you're in metropolitan Sydney or regional Queensland - the system is national. This is particularly useful if you're travelling or if your regular pharmacy is closed. Your prescription follows you, not a piece of paper.",
    ],
  },
  {
    id: "how-online-repeats-work",
    icon: Stethoscope,
    title: "How repeat prescriptions work online",
    paragraphs: [
      "An online repeat prescription follows the same clinical process as a face-to-face consultation - the delivery method is different, but the medical standard is identical. You submit a request through our platform detailing the medication you're currently taking, how long you've been on it, and your medical history. A doctor then reviews your request.",
      "The doctor's assessment isn't a rubber stamp. They review your medication history, check for potential drug interactions, confirm the medication is still appropriate for your condition, and verify that you've had appropriate monitoring. If something doesn't look right - an unusual combination, a medication that requires recent blood work, or a condition that's changed - they'll follow up with questions or recommend you see your regular GP.",
      "This service is specifically for medications you're already taking and that have been previously prescribed by a doctor. We're continuing an existing treatment plan, not starting a new one. If you've never taken a medication before or your doctor has recently changed your dosage, that's a conversation for your regular GP who has your full clinical history.",
      "For certain medications - particularly those for thyroid conditions, cholesterol, or blood pressure - doctors may ask when you last had blood tests or a checkup with your regular GP. This isn't bureaucracy. Some medications require periodic monitoring to ensure they're working correctly and not causing side effects. A responsible doctor checks, whether they're sitting across a desk from you or reviewing your request online.",
    ],
  },
  {
    id: "pbs-costs",
    icon: DollarSign,
    title: "PBS subsidies and medication costs",
    paragraphs: [
      `The ${PRICING_DISPLAY.REPEAT_SCRIPT} consultation fee covers the doctor's clinical assessment and the issuing of your eScript. It does not include the cost of the medication itself - that's a separate transaction at your pharmacy, and PBS subsidies apply exactly as they would with any other prescription.`,
      "The Pharmaceutical Benefits Scheme (PBS) subsidises thousands of medications in Australia. If your medication is PBS-listed, you'll pay the standard patient co-payment at the pharmacy - currently $31.60 for general patients or $7.70 for concession card holders (as of 2025). These rates apply regardless of whether your prescription came from a telehealth consultation or a traditional GP visit.",
      "The PBS Safety Net provides additional protection for patients with high medication costs. Once you or your family reach the annual threshold - $1,563.50 for general patients or $244.80 for concession card holders - your co-payments reduce for the remainder of the calendar year. Your pharmacy tracks your Safety Net total, so make sure you're asking them to record each purchase.",
      "To be clear: the InstantMed consultation fee is for the doctor's time and clinical assessment. It's the same concept as a gap payment at a GP clinic that doesn't bulk bill. The medication cost at the pharmacy is entirely separate and determined by the PBS and your pharmacy.",
    ],
  },
  {
    id: "what-we-can-prescribe",
    icon: Pill,
    title: "Medications we can and can't prescribe online",
    paragraphs: [
      "Online repeat prescriptions work well for stable, ongoing medications where the treatment plan is established and the patient is responding well. Common categories include blood pressure medications (ACE inhibitors, ARBs, calcium channel blockers), cholesterol management (statins), oral contraceptives, thyroid hormone replacement, asthma preventers and relievers, reflux medications (proton pump inhibitors), and antidepressants where the patient is stable on their current dose.",
      "These are medications where the clinical picture is straightforward: you've been taking them, they're working, nothing has changed, and you need a new script. That's a well-defined clinical decision that a doctor can make confidently based on your history and reported experience.",
      "There are medications we cannot prescribe through this service, and this is a firm clinical boundary. Schedule 8 controlled substances - including opioid painkillers, benzodiazepines, and stimulant medications - require in-person assessment and ongoing monitoring. These are medications with significant dependency and safety risks, and responsible prescribing requires a face-to-face relationship with a treating doctor.",
      "We also won't issue repeats for medications that require monitoring blood tests before renewal - if your statin needs a liver function check, or your thyroid medication needs a TSH level, we'll let you know. Similarly, brand-new medications that you haven't taken before aren't suitable for this service. Starting a new medication involves a different clinical conversation - one best had with a doctor who can examine you and monitor your initial response.",
    ],
  },
  {
    id: "when-to-see-gp",
    icon: UserCheck,
    title: "When to see your regular GP instead",
    paragraphs: [
      "Online repeat prescriptions solve a specific problem: getting a new script for a medication you're already taking, when getting to a GP clinic is inconvenient or impractical. But they don't replace the relationship you have - or should have - with a regular general practitioner.",
      "See your GP if you need a new medication you haven't taken before, if your condition has changed or your symptoms are different, if blood tests or other monitoring are overdue, or if you're experiencing side effects. These situations require a more comprehensive assessment than an online repeat service can provide.",
      "If you're on multiple medications and it's been a while since anyone reviewed the full picture, a Home Medicines Review or MedsCheck through your GP and pharmacist is genuinely worthwhile. Polypharmacy - taking five or more regular medications - increases the risk of interactions, and a dedicated review can identify medications that may no longer be necessary.",
      "We're not trying to be your GP. We're filling a gap for the times when you know exactly what you need, your medication is stable, and the main barrier is getting an appointment for a two-minute script renewal. For everything else, your regular doctor is the right call - and we'll tell you that directly if your request falls outside what we can safely do online.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - eScripts, PBS, prescribing boundaries, when to see GP */
export function RepeatRxGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="Repeat prescription guide"
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
            Everything you need to know about repeat prescriptions online
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            How eScripts work, what they cost, and when an online repeat is the
            right choice.
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
            . We never automate prescribing decisions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
