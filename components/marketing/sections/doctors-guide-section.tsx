import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

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
    id: "ahpra-registration",
    sticker: "security-shield",
    title: "What AHPRA registration means",
    paragraphs: [
      "AHPRA - the Australian Health Practitioner Regulation Agency - is the national body that regulates all health practitioners in Australia. If a doctor isn't registered with AHPRA, they cannot legally practise medicine in this country. It's not optional, and there's no alternative pathway.",
      "AHPRA maintains a public register that anyone can search. It shows a practitioner's registration status, registration type, and any published conditions or undertakings.",
      "InstantMed does not use public marketing pages to disclose individual doctor names or doctor count. The responsible treating clinician is recorded in the clinical record and on issued documents where applicable.",
    ],
  },
  {
    id: "credentialing-process",
    sticker: "checklist",
    title: "How access is scoped",
    paragraphs: [
      "Before clinical access is enabled, current medical registration is checked against the AHPRA public register.",
      "Service-line capability flags then control which request types a clinician can review. Certificate, repeat-prescription, specialty, and prescribing permissions are scoped separately rather than granted as one broad role.",
      "The platform records the responsible treating clinician and applies role-aware access controls to clinical and operational data.",
    ],
  },
  {
    id: "telehealth-qualifications",
    sticker: "laptop",
    title: "Remote-assessment judgement",
    paragraphs: [
      "Remote assessment differs from an in-person consultation. The doctor must decide whether the information supplied is sufficient, whether follow-up is needed, and whether a physical examination or testing is the safer next step.",
      "Our telehealth model is built around patient identification, informed consent, clinical documentation, and the appropriate scope of remote consultations. Asynchronous review requires particular attention to thorough history-taking because there is no real-time back-and-forth unless the doctor needs more information.",
      "Prescription and specialty requests begin with a secure form, and the doctor may message or call before deciding. We do not promise a no-contact prescribing pathway.",
    ],
  },
  {
    id: "clinical-governance",
    sticker: "stethoscope",
    title: "Clinical governance and oversight",
    paragraphs: [
      "Clinical governance is the framework that keeps service scope, safety checks, decisions, and escalation pathways documented.",
      "Prescribing decisions remain clinician-made. Eligible low-risk certificate requests may use a logged doctor-owned protocol and are individually reviewed afterward.",
      "Decision records, complaints, incidents, and protocol changes create an audit trail for clinical leadership without turning an operational process into an unsupported marketing claim.",
    ],
  },
  {
    id: "scope-and-referrals",
    sticker: "medical-doctor",
    title: "Scope of practice and referrals",
    paragraphs: [
      "InstantMed offers focused one-off pathways rather than general or ongoing care: short medical certificates, repeat-prescription requests, and structured specialty assessments.",
      "Conditions requiring a physical examination - suspicious skin lesions, acute joint injuries, chest pain, abdominal pain requiring palpation - are outside the scope of what we can safely assess remotely. WorkCover certificates have specific requirements that typically require an in-person examination. Extended absences beyond a few days generally benefit from face-to-face assessment, and we'll recommend this.",
      `We'd rather refer you to the right care than pretend we can handle everything. If a doctor reviews your request and determines it's not appropriate for telehealth, they'll let you know and suggest the right next step - whether that's your regular GP, an emergency department, or a specialist. ${GUARANTEE} Getting it right matters more than getting the sale.`,
    ],
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - AHPRA, credentialing, telehealth qualifications, governance */
export function DoctorsGuideSection() {
  return (
    <section
      aria-label="Doctor credentialing guide"
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
            How we credential and support our doctors
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            AHPRA registration, service-line scope, clinical governance, and
            when we refer you elsewhere.
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
