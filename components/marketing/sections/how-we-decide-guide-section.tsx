"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  BadgeCheck,
  ClipboardCheck,
  Monitor,
  ShieldAlert,
  AlertTriangle,
  Eye,
} from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "clinical-process",
    icon: ClipboardCheck,
    title: "The clinical decision-making process",
    paragraphs: [
      "Every request submitted through InstantMed goes through a structured clinical assessment by an AHPRA-registered doctor. There are no automated approvals, no AI making clinical calls, and no shortcuts. The doctor reviews your reported symptoms, medical history, current medications, and the specific service you've requested — then applies clinical guidelines to determine whether your request is appropriate.",
      "This is the same standard of care you'd receive at an in-person consultation. The difference is the delivery method, not the rigour. A doctor sitting across from you in a clinic asks questions, listens to your answers, and applies their training and experience to make a decision. That's exactly what happens here — just without the waiting room magazines and the fifteen-minute drive.",
      "Doctors aren't incentivised to approve or decline. They're paid the same either way. The only thing that matters is whether the request is clinically appropriate. If it is, they approve it. If it isn't, they don't. That's not a policy statement — it's just how medicine works when you remove the wrong incentives.",
    ],
  },
  {
    id: "telehealth-assessment",
    icon: Monitor,
    title: "How telehealth assessment works",
    paragraphs: [
      "When a doctor reviews your request, they have access to everything you've provided: your questionnaire responses, medical history, current medications, previous consultations through our platform, and any additional information you've shared. For straightforward presentations — a cold that's kept you home, a medication you've been stable on for months — this information is sufficient for a sound clinical decision.",
      "History-based assessment is well-established in medical practice. The majority of diagnoses in general practice are made from the patient history alone, before any physical examination takes place. Research consistently shows that for common, self-limiting conditions, a thorough history provides the clinical information needed to make safe decisions. Telehealth doesn't diminish this — it formalises it.",
      "Not every condition is suitable for remote assessment. If the doctor determines that your situation requires a physical examination, diagnostic tests, or in-person monitoring, they'll tell you. This isn't a limitation of our platform — it's a limitation of medicine that applies equally to phone consultations, video calls, and any other form of remote care. We work within those boundaries rather than pretending they don't exist.",
    ],
  },
  {
    id: "declined-requests",
    icon: ShieldAlert,
    title: "When and why requests are declined",
    paragraphs: [
      "Requests are declined when the doctor determines that approving them wouldn't be clinically appropriate. Common reasons include: the condition requires a physical examination that can't be done remotely, the medication needs monitoring (blood tests, blood pressure checks) that we can't verify, the symptoms suggest something more serious that warrants urgent or in-person care, or the information provided is incomplete and the patient hasn't responded to follow-up.",
      "A declined request is not a bad outcome. It's the system working exactly as designed. If every request were approved, you'd rightly question whether anyone was actually reviewing them. The doctor erring on the side of caution is a feature, not a bug. We'd rather refund your payment and point you to the right care than approve something we shouldn't.",
      "If your request is declined, you receive a full refund automatically. No forms, no waiting, no \"we'll review your refund request within 5-7 business days.\" The doctor will also explain why the request wasn't approved and, where appropriate, recommend next steps — whether that's seeing your regular GP, visiting an urgent care clinic, or providing additional information for reconsideration.",
    ],
  },
  {
    id: "safety-protocols",
    icon: AlertTriangle,
    title: "Safety protocols and escalation",
    paragraphs: [
      "When a doctor identifies red flags during a review — symptoms that suggest something urgent, medication interactions that raise concerns, or patterns that warrant immediate attention — they don't just decline the request and move on. They escalate. If something looks wrong, the doctor picks up the phone. Speed matters less than safety.",
      "Our escalation protocols are straightforward: if the doctor believes you need urgent care, they'll contact you directly by phone or SMS to explain the concern and recommend you seek emergency or in-person care immediately. This isn't a templated email that arrives three days later. It's a doctor reaching out because something in your request concerned them enough to act on it.",
      "We maintain adverse event reporting processes and follow-up protocols aligned with Australian clinical governance standards. If a patient reports an adverse reaction or unexpected outcome, it's documented, reviewed by our Medical Director, and reported to the relevant authorities where required. These aren't theoretical processes we hope we never use — they're active systems that get tested and reviewed regularly.",
    ],
  },
  {
    id: "transparency",
    icon: Eye,
    title: "Transparency and accountability",
    paragraphs: [
      "Every clinical decision made on our platform is documented — who reviewed it, when, what information they had, and what they decided. This isn't just good practice; it's a requirement of operating a legitimate medical service. These records exist for the same reason they exist in any GP clinic: accountability, continuity of care, and the ability to learn from patterns over time.",
      "Clinical audits happen regularly. Our Medical Director reviews decision patterns, decline rates, and escalation outcomes to identify areas for improvement. If a particular type of request is being declined at an unusual rate, we investigate whether the process needs adjustment or whether the clinical guidelines are being applied correctly. Continuous improvement isn't a buzzword here — it's how you run a medical service responsibly.",
      "Our complaints process is real. If you have a concern about a clinical decision, you can contact us at complaints@instantmed.com.au and receive a response within 14 days. Complaints are reviewed by the Medical Director, not filtered through a customer service script. We'd rather explain why we said no than apologise for saying yes when we shouldn't have.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section — clinical decision-making, safety, transparency */
export function HowWeDecideGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="Clinical decision-making guide"
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
            How clinical decisions are made on our platform
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The process, the safeguards, and what happens when the answer is no.
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
