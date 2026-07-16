import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS: Array<{
  id: string
  sticker: StickerIconName
  title: string
  paragraphs: readonly string[]
}> = [
  {
    id: "doctor-verification",
    sticker: "security-shield",
    title: "How we verify our doctors",
    paragraphs: [
      getApprovedClaim("doctor_registration"),
      "AHPRA maintains a public register showing a practitioner's registration status, registration type, and any published conditions or undertakings.",
      "InstantMed checks registration before clinical access is enabled and uses separate capability controls for certificate, prescription, specialty, and prescribing work.",
    ],
  },
  {
    id: "data-protection",
    sticker: "lock",
    title: "Protecting your health information",
    paragraphs: [
      "Personal health information is protected with field-level AES-256-GCM encryption at rest and TLS in transit. Primary health records are stored on Australian-hosted infrastructure.",
      "The Privacy Act 1988 and Australian Privacy Principles govern how personal information is collected, used, disclosed, secured, accessed, and corrected.",
      getApprovedClaim("clinical_access_scope"),
    ],
  },
  {
    id: "clinical-governance",
    sticker: "stethoscope",
    title: "Our clinical governance framework",
    paragraphs: [
      "Clinical protocols, decision records, incidents, complaints, and edge cases sit within a documented governance framework.",
      "We maintain clear scope-of-practice limitations: we don't prescribe Schedule 8 medications, we don't issue certificates for workers' compensation claims requiring physical examination, and we don't treat conditions that require hands-on assessment. Knowing what we shouldn't do is as important as knowing what we can.",
      getApprovedClaim("clinical_decision_model"),
    ],
  },
  {
    id: "complaints-rights",
    sticker: "scales",
    title: "Your rights and our complaints process",
    paragraphs: [
      `${getApprovedClaim("complaints_timing")} Email complaints@instantmed.com.au to start the process.`,
      "You have the right to escalate any complaint to the Health Complaints Commissioner in your state or territory. We won't make this difficult or bury the information - here it is, upfront. You also have the right to lodge a notification with AHPRA if you believe a doctor has behaved unprofessionally. We support your right to do both of these things, because accountability is how trust is built.",
      `${getApprovedClaim("refund_payment_process")} You can also request access to records we hold about you, ask for corrections, and understand how your information has been used.`,
    ],
  },
  {
    id: "regulatory-compliance",
    sticker: "certificate",
    title: "Regulatory compliance and standards",
    paragraphs: [
      "Approved electronic prescriptions use Australia's electronic-prescribing infrastructure. The patient presents the token to an Australian pharmacy, which applies its normal dispensing checks.",
      "Medical certificates issued through InstantMed include the doctor's name, AHPRA registration number, date of assessment, and a unique verification ID that employers can check online. Employer and institution policies can vary, so we keep the document clear and verifiable rather than promising universal acceptance.",
      "InstantMed is a private-pay service. Clinical records, informed consent, practitioner registration, prescribing rules, privacy obligations, and the limitations of remote assessment still apply.",
    ],
  },
]

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            AHPRA-registered clinical review
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
                <div className="shrink-0 mt-0.5">
                  <StickerIcon name={section.sticker} size={36} />
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
            {getApprovedClaim("clinical_decision_model")} Read{" "}
            <Link
              href="/clinical-governance"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              our clinical governance framework
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
