import { BadgeCheck, FileCheck, Lock, Scale, ShieldCheck, Stethoscope } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "doctor-verification",
    icon: ShieldCheck,
    title: "How we verify our doctors",
    paragraphs: [
      "Every doctor practising on InstantMed holds current registration with the Australian Health Practitioner Regulation Agency (AHPRA). Before a doctor can review a single request, we verify their registration status, specialty endorsements, and any conditions or undertakings on their practice. This isn't a one-time check - we monitor registration status on an ongoing basis and are notified immediately if anything changes.",
      "All doctors are required to hold professional indemnity insurance that meets Medical Board of Australia standards. This protects both the practitioner and you as a patient. Our credentialing process follows the same standards used by hospitals and major health organisations: primary source verification of qualifications, reference checks, and confirmation of right to practise in Australia.",
      "If a doctor's registration lapses, is suspended, or has conditions imposed, they are immediately removed from the platform. There is no grace period and no workaround. We treat this the same way a hospital would - because that's the standard your healthcare should meet, whether it's delivered in a clinic or online.",
    ],
  },
  {
    id: "data-protection",
    icon: Lock,
    title: "Protecting your health information",
    paragraphs: [
      "Your health information is encrypted with AES-256-GCM - the same encryption standard used by banks and government agencies. We encrypt your data with the same standard banks use, though your medical certificate is considerably less interesting to hackers than your bank account. This isn't just transport encryption (protecting data while it moves between your browser and our servers). We apply field-level encryption to your personal health information, meaning individual data fields are encrypted at rest in our database.",
      "All data is stored exclusively on Australian-hosted servers. Your health information never leaves the country. We comply with the Privacy Act 1988 and all thirteen Australian Privacy Principles (APPs), which govern how personal information is collected, used, disclosed, and stored. APP 11 requires us to take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access - and we go well beyond 'reasonable.'",
      "During a consultation, only the reviewing doctor has access to your clinical information. After your request is completed, your data remains encrypted and accessible only to you through your patient dashboard. We don't sell, share, or use your health data for marketing purposes. If you want to understand exactly what we collect and why, our privacy policy spells it out in plain language - not legalese.",
    ],
  },
  {
    id: "clinical-governance",
    icon: Stethoscope,
    title: "Our clinical governance framework",
    paragraphs: [
      "Clinical governance isn't a buzzword we put on our website and forget about. Our Medical Director oversees all clinical operations, reviews adverse events, and ensures that every doctor on the platform operates within evidence-based guidelines. Clinical decisions are audited regularly - not to second-guess doctors, but to maintain consistently high standards across every consultation.",
      "Our protocols are aligned with RACGP (Royal Australian College of General Practitioners) standards for telehealth delivery. We maintain clear scope of practice limitations: we don't prescribe Schedule 8 medications, we don't issue certificates for workers' compensation claims requiring physical examination, and we don't treat conditions that require hands-on assessment. Knowing what we shouldn't do is as important as knowing what we can.",
      "When a patient's condition falls outside our scope - or when a doctor identifies something that warrants further investigation - we refer to in-person care. We provide clear guidance on where to seek help, whether that's a GP clinic, emergency department, or specialist. Adverse events are documented, reviewed by the Medical Director, and used to improve our processes. We treat mistakes as system problems to solve, not individual failures to hide.",
    ],
  },
  {
    id: "complaints-rights",
    icon: Scale,
    title: "Your rights and our complaints process",
    paragraphs: [
      "We respond to all complaints within 48 hours. Not 'up to 14 business days,' not 'we'll get back to you when we can.' If you're unhappy with any aspect of our service, email complaints@instantmed.com.au and a real person will respond within two working days. If we can't resolve your concern directly, we'll explain your options for escalation.",
      "You have the right to escalate any complaint to the Health Complaints Commissioner in your state or territory. We won't make this difficult or bury the information - here it is, upfront. You also have the right to lodge a notification with AHPRA if you believe a doctor has behaved unprofessionally. We support your right to do both of these things, because accountability is how trust is built.",
      "Our pricing is transparent and published on our website. There are no hidden fees, no surprise charges, and no upselling during your consultation. If your request is declined by a doctor - because it doesn't meet clinical criteria - you receive a full refund. You also have the right to access any records we hold about you, request corrections, and understand how your information has been used. These aren't concessions; they're your rights under Australian law.",
    ],
  },
  {
    id: "regulatory-compliance",
    icon: FileCheck,
    title: "Regulatory compliance and standards",
    paragraphs: [
      "Electronic prescriptions issued through InstantMed are generated via official PBS (Pharmaceutical Benefits Scheme) channels and comply with the Therapeutic Goods Act 1989. Our eScripts work at any Australian pharmacy - they're the same format used by every GP clinic that has adopted electronic prescribing, which is now the national standard. The days of losing a paper script in your back pocket are, mercifully, numbered.",
      "Our medical certificates carry the same legal weight as certificates issued during an in-person consultation. This has been confirmed by the Fair Work Commission in multiple decisions since 2020. Each certificate includes the doctor's full name, AHPRA registration number, date of assessment, and a unique verification ID that employers can check online. Under the Fair Work Act 2009, there is no requirement that a medical certificate come from a face-to-face consultation.",
      "We operate under Australian telehealth regulations, which require that consultations be conducted by practitioners registered in Australia, that appropriate clinical records are maintained, and that patients are informed about the nature and limitations of telehealth. Medicare-eligible services are billed through proper Medicare channels where applicable. We don't cut corners on compliance because the consequences - for you and for us - aren't worth it.",
    ],
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - doctor verification, data protection, governance, rights, compliance */
export function TrustGuideSection() {
  return (
    <section
      aria-label="Trust and safety guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            How we earn and maintain your trust
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Doctor verification, data protection, clinical governance, your
            rights, and the regulations we follow.
          </p>
        </Reveal>

        {/* Content sections */}
        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section, i) => (
            <Reveal key={section.id} delay={i * 0.05}>
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
            </Reveal>
          ))}
        </div>

        {/* Clinical governance link */}
        <div className="mt-12 pt-8 border-t border-border/40 text-center">
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
        </div>
      </div>
    </section>
  )
}
