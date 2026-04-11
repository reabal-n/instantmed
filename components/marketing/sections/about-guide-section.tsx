"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { BadgeCheck, Heart, Monitor, ShieldCheck, Lock, MapPin } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "why-we-built",
    icon: Heart,
    title: "Why we built InstantMed",
    paragraphs: [
      "Around 75% of Australians live in urban areas, but that hasn't translated into easy access to primary care. Average wait times for a non-urgent GP appointment sit at two to three weeks in most capital cities. Bulk billing has been declining for over a decade. And for many people, the experience of getting a simple medical certificate means taking a sick day to prove you need a sick day - which, if you think about it for more than a few seconds, is genuinely absurd.",
      "InstantMed was founded to address a specific, well-defined problem: there are common healthcare tasks that don't require a physical examination, and the traditional model of delivering them - book a clinic appointment, sit in a waiting room, see a doctor for three minutes, leave with a piece of paper - doesn't serve patients well. Medical certificates for a cold. Repeat prescriptions for stable, long-term medications. Straightforward consultations where the clinical information a doctor needs can be provided in a structured online form just as effectively as in a face-to-face conversation.",
      "We're not trying to reinvent healthcare. We're just pointing out that you shouldn't need to take a sick day to prove you need a sick day.",
    ],
  },
  {
    id: "async-model",
    icon: Monitor,
    title: "How our asynchronous model works",
    paragraphs: [
      "Most telehealth services in Australia use video or phone consultations - essentially replicating a GP waiting room, but on a screen. InstantMed takes a different approach. Our model is asynchronous: you fill in a structured clinical form at a time that suits you, and a doctor reviews your request and supporting information when they're ready to give it proper attention. No scheduling, no hold music, no awkward video calls from your car park.",
      "This works because for many common presentations - gastro, cold and flu, back pain, period pain, stable repeat prescriptions - the clinical information a doctor needs is primarily history-based. What are your symptoms? How long have you had them? What medications are you on? Do you have any relevant medical conditions? A well-designed intake form collects this information more systematically than a rushed five-minute appointment ever could.",
      "The doctor reviewing your request has access to the same clinical information they would in a consultation: your symptoms, medical history, current medications, and any relevant context. If they need more information, they'll ask. If they're not satisfied that your request is clinically appropriate, they won't approve it. The standard of care is the same - only the delivery mechanism is different. Most requests don't require a phone call, but if a doctor determines one is necessary, they'll arrange it.",
    ],
  },
  {
    id: "clinical-standards",
    icon: ShieldCheck,
    title: "Our commitment to clinical standards",
    paragraphs: [
      "Every doctor on InstantMed is registered with the Australian Health Practitioner Regulation Agency (AHPRA) and holds a current, unrestricted medical licence. Our clinical operations are overseen by a Medical Director with Fellowship of the Royal Australian College of General Practitioners (FRACGP), who is responsible for clinical governance, protocol development, and quality assurance.",
      "Our clinical protocols are aligned with RACGP Standards for General Practices and the RACGP guide to providing telephone and video consultations. We conduct regular clinical audits - peer review of decisions, consistency checks, and outcome tracking. Every doctor on the platform follows the same evidence-based protocols, and we maintain a clear scope of practice: we focus on low-complexity, high-frequency presentations where telehealth is clinically appropriate.",
      "When something falls outside our scope - symptoms that suggest the need for a physical examination, conditions requiring imaging or blood work, workplace injuries needing WorkCover documentation - we refer patients to in-person care. We're not trying to replace your regular GP. We fill a specific gap in primary care access, and we know exactly where that gap ends.",
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy and data protection",
    paragraphs: [
      "Your health information is sensitive, and we treat it that way. InstantMed complies with the Privacy Act 1988 and all 13 Australian Privacy Principles (APPs). We collect only the information necessary to provide clinical care, and we're transparent about what that includes: your identity details, contact information, medical history, symptoms, and payment information.",
      "All personal health information is encrypted using AES-256-GCM - the same standard used by banks and government agencies. Your data is stored on Australian-hosted servers, which means it's subject to Australian law and never leaves the country. We don't sell your data, we don't share it with marketers, and we don't use it for anything beyond providing you with healthcare and meeting our legal obligations.",
      "We retain medical records for the minimum period required by Australian healthcare regulations (seven years for adults, until age 25 for minors). You have the right to access your records at any time, and you can request corrections if anything is inaccurate. If you want to know exactly what we hold, just ask - we'll provide it within 30 days, as required by the APPs.",
    ],
  },
  {
    id: "australian-healthcare",
    icon: MapPin,
    title: "Our place in Australian healthcare",
    paragraphs: [
      "Telehealth isn't new in Australia. Medicare has covered telehealth consultations permanently since 2020, and the practice has been part of Australian healthcare - particularly in rural and remote areas - for decades before that. What's relatively new is the recognition that for certain types of care, asynchronous telehealth can be just as effective as synchronous consultations, and more convenient for patients.",
      "InstantMed complements existing primary care rather than competing with it. We handle the straightforward, time-sensitive requests that don't require an in-person visit - the ones that clog up GP clinic schedules and add to wait times for patients who genuinely need a face-to-face appointment. When you use InstantMed for a medical certificate for a cold, that's one fewer appointment slot someone with a complex health concern has to wait for.",
      "We're not trying to disrupt anything. The Australian healthcare system, for all its challenges, is one of the best in the world. We're simply making a specific part of it more accessible - because getting straightforward healthcare shouldn't require rearranging your entire day.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - who we are, how we work, clinical standards */
export function AboutGuideSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section
      aria-label="About InstantMed guide"
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
            Who we are and how we work
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Our approach to telehealth, clinical standards, and why we built
            InstantMed.
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
