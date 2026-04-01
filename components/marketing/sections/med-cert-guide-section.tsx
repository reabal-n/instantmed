"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { BadgeCheck, Scale, Clock, FileText, ShieldCheck, AlertTriangle } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "what-is",
    icon: FileText,
    title: "What is a medical certificate?",
    paragraphs: [
      "A medical certificate is an official document issued by a registered medical practitioner confirming that a patient has been assessed and is — or was — unfit for their normal duties due to illness or injury. In Australia, these are sometimes called \"sick notes\" or \"doctor's certificates,\" but the correct term is medical certificate.",
      "The certificate doesn't need to disclose your specific diagnosis. Under Australian privacy law, your employer is entitled to know that you were unfit for work and for how long — not what was wrong with you. A valid certificate states the doctor's name, AHPRA registration number, the date of assessment, and the recommended period of absence.",
    ],
  },
  {
    id: "fair-work",
    icon: Scale,
    title: "Your rights under the Fair Work Act",
    paragraphs: [
      "The Fair Work Act 2009 entitles full-time employees to 10 days of paid personal/carer's leave per year. Part-time employees accrue leave proportionally. Employers can request a medical certificate or statutory declaration for any period of leave, including a single day — though many employers only require one for absences of two or more days.",
      "Importantly, the Fair Work Act does not specify that a medical certificate must come from a face-to-face consultation. Certificates issued by AHPRA-registered doctors via telehealth carry the same legal weight as those from an in-person GP visit. This has been confirmed by the Fair Work Commission in multiple decisions since 2020.",
      "Casual employees don't accrue paid sick leave (unless they're long-term regular casuals), but a medical certificate still protects your working relationship and demonstrates good faith. Some enterprise agreements and awards have specific requirements — check yours if you're unsure.",
    ],
  },
  {
    id: "when-online",
    icon: Clock,
    title: "When an online certificate makes sense",
    paragraphs: [
      "Telehealth medical certificates are appropriate for straightforward, self-limiting conditions that don't require a physical examination. Common examples include cold and flu, gastroenteritis, migraine, minor back pain, period pain, mental health days, and general malaise. These are conditions where the doctor's assessment is based primarily on your reported symptoms and medical history — the same information available via telehealth.",
      "For a standard 1–3 day absence, a telehealth certificate is clinically equivalent to an in-person one. The doctor reviews your symptoms, asks follow-up questions if needed, and makes a clinical judgement about whether a certificate is appropriate. If they're not satisfied that a certificate is clinically justified, they won't issue one — same as a GP clinic.",
    ],
  },
  {
    id: "when-gp",
    icon: AlertTriangle,
    title: "When you should see a GP in person",
    paragraphs: [
      "Some situations genuinely require an in-person consultation. Workplace injuries requiring WorkCover documentation need a physical examination and specific forms. Conditions requiring blood tests, imaging, or physical assessment (suspicious moles, joint injuries, chest pain) should be seen face-to-face. Extended absences beyond 3–5 days may benefit from an in-person assessment, and we'll recommend this where appropriate.",
      "We're not trying to replace your regular GP. If you have an ongoing relationship with a general practitioner, they remain your primary care provider for chronic conditions, health checks, and complex care. We fill a specific gap: straightforward, time-sensitive needs where a clinic visit is impractical or unavailable.",
    ],
  },
  {
    id: "validity",
    icon: ShieldCheck,
    title: "What makes a certificate valid",
    paragraphs: [
      "A legally valid medical certificate in Australia must include: the practitioner's full name and AHPRA registration number, the date of the consultation, the patient's name and date of birth, the period the patient is certified as unfit for duties, and the practitioner's signature (digital signatures are accepted). InstantMed certificates include all of these elements.",
      "Every certificate issued by InstantMed has a unique verification ID. Employers and institutions can verify any certificate at instantmed.com.au/verify — entering the certificate ID confirms it was genuinely issued by our practice. This provides an additional layer of trust that paper certificates from traditional clinics typically don't offer.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section — Fair Work Act, certificate validity, when to use */
export function MedCertGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="Medical certificate guide"
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
            Everything you need to know about medical certificates
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Your rights, what makes a certificate valid, and when telehealth is
            the right choice.
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
