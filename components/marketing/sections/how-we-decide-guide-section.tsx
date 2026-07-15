import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")

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
    id: "clinical-process",
    sticker: "checklist",
    title: "The clinical decision-making process",
    paragraphs: [
      CLINICAL_DECISION_MODEL,
      "Remote assessment uses the history you provide rather than a physical examination. That makes structured questions, clear scope boundaries, and follow-up especially important. If the pathway cannot safely answer the clinical question remotely, it stops and directs you to more suitable care.",
      "Clinical outcomes are recorded, and business staff cannot override a decline. The decision must stay within the doctor's scope and the documented pathway for that service.",
    ],
  },
  {
    id: "telehealth-assessment",
    sticker: "laptop",
    title: "How telehealth assessment works",
    paragraphs: [
      "When a doctor reviews your request, they can use the information you supplied for that pathway: questionnaire responses, relevant medical history, current medications, prior InstantMed records, and any follow-up details. Whether that is enough depends on the request and the limits of remote assessment.",
      "The form organises the patient history consistently, but it cannot reproduce an examination, observations, or diagnostic testing. The doctor may call or message before deciding, and some presentations must move to in-person care.",
      "Not every condition is suitable for remote assessment. If the doctor determines that your situation requires a physical examination, diagnostic tests, or in-person monitoring, they'll tell you. This isn't a limitation of our platform - it's a limitation of medicine that applies equally to phone consultations, video calls, and any other form of remote care. We work within those boundaries rather than pretending they don't exist.",
    ],
  },
  {
    id: "declined-requests",
    sticker: "synchronize",
    title: "When and why requests are declined",
    paragraphs: [
      "Requests are declined when the doctor determines that approving them wouldn't be clinically appropriate. Common reasons include: the condition requires a physical examination that can't be done remotely, the medication needs monitoring (blood tests, blood pressure checks) that we can't verify, the symptoms suggest something more serious that warrants urgent or in-person care, or the information provided is incomplete and the patient hasn't responded to follow-up.",
      "A decline is a clinical outcome, not a failed checkout. It means the request could not be approved safely within the pathway. Where appropriate, the outcome explains why and points to a more suitable next step.",
      `${REFUND_PAYMENT_PROCESS} Your bank controls when the refund appears on your statement.`,
    ],
  },
  {
    id: "safety-protocols",
    sticker: "warning",
    title: "Safety protocols and escalation",
    paragraphs: [
      "When a review identifies red flags, the safe next step takes priority over speed. Depending on the concern, the doctor may call or message and direct you to urgent or in-person care.",
      "Emergency guidance in the intake is not a diagnosis and does not replace 000. Patients with severe or rapidly worsening symptoms should seek urgent care immediately rather than wait for an online outcome.",
      "Clinical incidents and reported adverse outcomes follow the documented incident process. They are recorded, reviewed, and reported to the relevant authority where a legal or professional reporting duty applies.",
    ],
  },
  {
    id: "transparency",
    sticker: "eye",
    title: "Transparency and accountability",
    paragraphs: [
      "Every clinical decision made on our platform is documented - who reviewed it, when, what information they had, and what they decided. This isn't just good practice; it's a requirement of operating a legitimate medical service. These records exist for the same reason they exist in any GP clinic: accountability, continuity of care, and the ability to learn from patterns over time.",
      "Clinical governance uses documented protocols, outcome records, incident review, and complaint handling to identify where a pathway or process needs to change. The governance page explains the current framework without promising an unsupported audit cadence.",
      `If you have a concern about a clinical decision, contact complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
    ],
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - clinical decision-making, safety, transparency */
export function HowWeDecideGuideSection() {
  return (
    <section
      aria-label="Clinical decision-making guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered doctors
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            How clinical decisions are made on our platform
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The process, the safeguards, and what happens when the answer is no.
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
            {CLINICAL_DECISION_MODEL}{" "}
            <Link
              href="/clinical-governance"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Read our clinical governance framework
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
