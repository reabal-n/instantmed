"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { BadgeCheck } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// =============================================================================
// DATA
// =============================================================================
//
// Long-form E-E-A-T guide — Fair Work Act, validity, telehealth vs in-person.
// Previously a 1,500-word flat wall-of-text mid-funnel. Now a collapsible
// accordion rendered BELOW the FAQ so users who want depth can expand, while
// the scan-read-to-CTA path stays clean.
//
// Content is rich (multi-paragraph + links), so this uses the shadcn Accordion
// primitive directly rather than <FAQList /> which is optimised for string-only
// FAQ data. Flat styling (no per-item card borders) matches faq-cta-section
// and eliminates the double-container pattern.

interface GuideItem {
  id: string
  title: string
  content: ReactNode
}

const GUIDE_ITEMS: readonly GuideItem[] = [
  {
    id: "what-is",
    title: "What is a medical certificate?",
    content: (
      <div className="space-y-3">
        <p>
          A medical certificate is an official document issued by a registered
          medical practitioner confirming that a patient has been assessed and
          is — or was — unfit for their normal duties due to illness or injury.
          In Australia, these are sometimes called &ldquo;sick notes&rdquo; or
          &ldquo;doctor&apos;s certificates,&rdquo; but the correct term is
          medical certificate.
        </p>
        <p>
          The certificate doesn&apos;t need to disclose your specific diagnosis.
          Under Australian privacy law, your employer is entitled to know that
          you were unfit for work and for how long — not what was wrong with
          you. A valid certificate states the doctor&apos;s name, AHPRA
          registration number, the date of assessment, and the recommended
          period of absence.
        </p>
      </div>
    ),
  },
  {
    id: "fair-work",
    title: "Your rights under the Fair Work Act",
    content: (
      <div className="space-y-3">
        <p>
          Under s.96 of the{" "}
          <em>Fair Work Act 2009</em> (Cth), full-time employees are entitled
          to 10 days of paid personal/carer&apos;s leave per year. Part-time
          employees accrue leave proportionally. Employers may request evidence
          under s.107 — a medical certificate or statutory declaration — for
          any period of leave, including a single day, though many employers
          only require one for absences of two or more days.
        </p>
        <p>
          Importantly, the Fair Work Act does not require a face-to-face
          consultation. Certificates issued by AHPRA-registered doctors via
          telehealth carry the same legal weight as those from an in-person GP
          visit. This is consistent with the{" "}
          <em>RACGP Standards for general practices</em> (5th edition, 2024)
          and multiple Fair Work Commission decisions since 2020 accepting
          telehealth-issued certificates.
        </p>
        <p>
          Casual employees don&apos;t accrue paid sick leave (unless
          they&apos;re long-term regular casuals), but a medical certificate
          still protects your working relationship and demonstrates good faith.
          Some enterprise agreements and awards have specific requirements —
          check yours if you&apos;re unsure.
        </p>
      </div>
    ),
  },
  {
    id: "when-online",
    title: "When an online certificate makes sense",
    content: (
      <div className="space-y-3">
        <p>
          Telehealth medical certificates are appropriate for straightforward,
          self-limiting conditions that don&apos;t require a physical
          examination. Common examples include cold and flu, gastroenteritis,
          migraine, minor back pain, period pain, mental health days, and
          general malaise. These are conditions where the doctor&apos;s
          assessment is based primarily on your reported symptoms and medical
          history — the same information available via telehealth.
        </p>
        <p>
          For a standard 1–3 day absence, a telehealth certificate is
          clinically equivalent to an in-person one. The doctor reviews your
          symptoms, asks follow-up questions if needed, and makes a clinical
          judgement about whether a certificate is appropriate. If they&apos;re
          not satisfied that a certificate is clinically justified, they
          won&apos;t issue one — same as a GP clinic.
        </p>
      </div>
    ),
  },
  {
    id: "when-gp",
    title: "When you should see a GP in person",
    content: (
      <div className="space-y-3">
        <p>
          Some situations genuinely require an in-person consultation.
          Workplace injuries requiring WorkCover documentation need a physical
          examination and specific forms. Conditions requiring blood tests,
          imaging, or physical assessment (suspicious moles, joint injuries,
          chest pain) should be seen face-to-face. Extended absences beyond 3–5
          days may benefit from an in-person assessment, and we&apos;ll
          recommend this where appropriate.
        </p>
        <p>
          We&apos;re not trying to replace your regular GP. If you have an
          ongoing relationship with a general practitioner, they remain your
          primary care provider for chronic conditions, health checks, and
          complex care. We fill a specific gap: straightforward, time-sensitive
          needs where a clinic visit is impractical or unavailable.
        </p>
      </div>
    ),
  },
  {
    id: "validity",
    title: "What makes a certificate valid",
    content: (
      <div className="space-y-3">
        <p>
          Under the{" "}
          <em>Health Practitioner Regulation National Law Act 2009</em>, a
          legally valid medical certificate must include: the practitioner&apos;s
          full name and AHPRA registration number, the date of the
          consultation, the patient&apos;s name and date of birth, the period
          the patient is certified as unfit for duties, and the
          practitioner&apos;s signature (digital signatures are accepted per
          the <em>Electronic Transactions Act 1999</em>). InstantMed
          certificates include all of these elements.
        </p>
        <p>
          Every certificate issued by InstantMed has a unique verification ID.
          Employers and institutions can verify any certificate at{" "}
          <Link href="/verify" className="text-primary hover:underline">
            instantmed.com.au/verify
          </Link>{" "}
          — entering the certificate ID confirms it was genuinely issued by our
          practice. This provides an additional layer of trust that paper
          certificates from traditional clinics typically don&apos;t offer.
        </p>
      </div>
    ),
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Long-form E-E-A-T content section — Fair Work Act, certificate validity,
 * when to use. Collapsible accordion, flat styling, no auto-opened item.
 * Rendered BELOW the FAQ.
 */
export function MedCertGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="Medical certificate guide"
      className="py-16 lg:py-20"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
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
            Deep dive: your rights, validity, and when telehealth is right
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Tap any topic to expand. Written and reviewed by AHPRA-registered
            GPs — last updated April 2026.
          </p>
        </motion.div>

        {/* Accordion — flat style, all collapsed by default */}
        <motion.div
          initial={animate ? { y: 16 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-0">
            {GUIDE_ITEMS.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-b border-border/40 last:border-b-0 first:border-t first:border-t-border/40 rounded-none bg-transparent shadow-none px-0"
              >
                <AccordionTrigger className="text-foreground py-5 hover:no-underline">
                  <span className="font-medium text-foreground text-left text-base">
                    {item.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Clinical governance link */}
        <motion.div
          className="mt-10 pt-6 border-t border-border/40 text-center"
          initial={{}}
          whileInView={animate ? { opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors
            following{" "}
            <Link
              href="/clinical-governance"
              className="text-primary hover:underline"
            >
              our clinical governance framework
            </Link>
            , aligned with{" "}
            <em>RACGP Standards for general practices</em> (5th ed.) and{" "}
            <em>TGA prescribing guidelines</em>. We never automate clinical
            decisions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
