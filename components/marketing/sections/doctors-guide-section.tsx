import { BadgeCheck, ClipboardCheck, GitBranch, Monitor, Shield, Stethoscope } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "ahpra-registration",
    icon: Shield,
    title: "What AHPRA registration means",
    paragraphs: [
      "AHPRA - the Australian Health Practitioner Regulation Agency - is the national body that regulates all health practitioners in Australia. If a doctor isn't registered with AHPRA, they cannot legally practise medicine in this country. It's not optional, and there's no alternative pathway.",
      "Registration means the doctor has completed an accredited medical degree, a supervised internship, and further supervised practice before being granted general or specialist registration. AHPRA also requires ongoing compliance: continuing professional development, recency of practice, professional indemnity insurance, and adherence to the Medical Board of Australia's codes and guidelines.",
      "AHPRA maintains a public register that anyone can search. You can look up any doctor's name and confirm their registration status, registration type, and whether any conditions or undertakings apply. If a doctor's registration lapses, they stop seeing patients that day - not after a grace period, not after a review. That day.",
    ],
  },
  {
    id: "credentialing-process",
    icon: ClipboardCheck,
    title: "Our credentialing process",
    paragraphs: [
      "Before a doctor reviews a single request on InstantMed, they go through a credentialing process that mirrors what you'd expect from a quality general practice. We verify current AHPRA registration directly against the public register, confirm professional indemnity insurance, and check minimum clinical experience requirements. Background checks are completed before onboarding begins.",
      "We also require telehealth-specific training. General practice experience is essential, but telehealth is a different modality - doctors need to understand the limitations of remote assessment, when to escalate, and how to communicate effectively without a physical examination. Not every experienced GP is automatically suited to telehealth, and we screen for this.",
      "Registration status is monitored on an ongoing basis, not just checked once at onboarding. If a doctor's registration status changes, their access to the platform is suspended immediately. Professional indemnity insurance is verified annually. This isn't a one-and-done credentialing exercise - it's continuous.",
    ],
  },
  {
    id: "telehealth-qualifications",
    icon: Monitor,
    title: "Telehealth qualifications and training",
    paragraphs: [
      "Telehealth is a specific clinical skillset, not just general practice conducted over the internet. Remote assessment techniques differ from in-person consultations - doctors need to gather clinical information differently, ask more targeted questions, and make careful judgements about when a condition can be safely managed remotely versus when it requires a physical examination.",
      "The Royal Australian College of General Practitioners (RACGP) has published specific telehealth guidelines that our doctors follow. These cover patient identification, informed consent for remote consultations, clinical documentation standards, and the appropriate scope of telehealth consultations. Our doctors are trained in asynchronous consultation models, which require particular attention to thorough history-taking since there's no real-time back-and-forth.",
      "Communication skills for asynchronous consultations are genuinely different from face-to-face medicine. Doctors need to be clear about what information they need, explain their reasoning when declining a request, and know when a situation warrants picking up the phone rather than relying on written communication alone.",
    ],
  },
  {
    id: "clinical-governance",
    icon: Stethoscope,
    title: "Clinical governance and oversight",
    paragraphs: [
      "Clinical governance isn't a buzzword we use to sound impressive - it's the framework that ensures consistent, safe clinical decisions across our consulting team. A Medical Director with RACGP Fellowship provides oversight of all clinical protocols and guidelines. Clinical protocols are reviewed quarterly and updated when evidence, regulations, or best practice changes.",
      "Clinical decisions are independently audited through a peer review process. This means a proportion of completed consultations are reviewed by another doctor to ensure the original decision was clinically appropriate, adequately documented, and consistent with our protocols. If patterns emerge - too many declines for a particular condition, or approvals that should have been escalated - they're identified and addressed.",
      "We maintain an incident reporting system where doctors can flag clinical concerns, near-misses, or situations where protocols didn't adequately cover a clinical scenario. These reports feed into protocol improvements. The goal is a learning system, not a punitive one - we want doctors to report freely so the whole team benefits.",
    ],
  },
  {
    id: "scope-and-referrals",
    icon: GitBranch,
    title: "Scope of practice and referrals",
    paragraphs: [
      "We're transparent about what our doctors can and can't do via telehealth. Conditions suitable for remote assessment include straightforward, self-limiting illnesses, repeat prescriptions for stable medications, and medical certificates for short-term absences. These are situations where the clinical decision is based primarily on patient-reported history - the same information available remotely as in person.",
      "Conditions requiring a physical examination - suspicious skin lesions, acute joint injuries, chest pain, abdominal pain requiring palpation - are outside the scope of what we can safely assess remotely. WorkCover certificates have specific requirements that typically require an in-person examination. Extended absences beyond a few days generally benefit from face-to-face assessment, and we'll recommend this.",
      "We'd rather refer you to the right care than pretend we can handle everything. If a doctor reviews your request and determines it's not appropriate for telehealth, they'll let you know and suggest the right next step - whether that's your regular GP, an emergency department, or a specialist. You'll receive a full refund if your request can't be fulfilled. Getting it right matters more than getting the sale.",
    ],
  },
] as const

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            How we credential and support our doctors
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            AHPRA registration, telehealth training, clinical governance, and
            when we refer you elsewhere.
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
