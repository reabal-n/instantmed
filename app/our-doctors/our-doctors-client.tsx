"use client"

import {
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  Shield,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { DoctorsGuideSection } from "@/components/marketing/sections/doctors-guide-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AccordionSection } from "@/components/sections/accordion-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { IconChecklist } from "@/components/sections/icon-checklist"
import type { ChecklistItem, FeatureItem } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FAQGroup } from "@/components/ui/faq-list"
import { Heading } from "@/components/ui/heading"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

/* ────────────────────────────── Data ────────────────────────────── */

function TrustIcon({ icon }: { icon: ReactNode }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
      {icon}
    </div>
  )
}

const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

const credentials: FeatureItem[] = [
  {
    icon: <TrustIcon icon={<BadgeCheck className="w-6 h-6 text-primary" />} />,
    title: "AHPRA Registered",
    description: DOCTOR_REGISTRATION,
  },
  {
    icon: <TrustIcon icon={<GraduationCap className="w-6 h-6 text-primary" />} />,
    title: "Service-line scope",
    description:
      "Capability controls limit each clinician to the service lines they are authorised to review.",
  },
  {
    icon: <TrustIcon icon={<Shield className="w-6 h-6 text-primary" />} />,
    title: "Role-scoped access",
    description:
      "Doctors access the clinical records needed for care; support access stays bounded and masked.",
  },
  {
    icon: <TrustIcon icon={<Shield className="w-6 h-6 text-primary" />} />,
    title: "Clinical Governance",
    description:
      "Clinical protocols are written, reviewed, and maintained under AHPRA-registered medical governance.",
  },
]

const accountabilityAreas: FeatureItem[] = [
  {
    icon: <StickerIcon name="stethoscope" size={48} />,
    title: "Registration verification",
    description:
      "AHPRA registration can be checked independently on the public practitioner register.",
  },
  {
    icon: <StickerIcon name="heart-with-pulse" size={48} />,
    title: "Scope-limited review",
    description:
      "Structured safety checks stop or redirect requests that are not suitable for online care.",
  },
  {
    icon: <StickerIcon name="hospital" size={48} />,
    title: "Doctor-owned protocols",
    description:
      "Medical-certificate protocol rules are owned by medical leadership and logged in the clinical record.",
  },
  {
    icon: <StickerIcon name="briefcase" size={48} />,
    title: "Escalation and decline",
    description:
      "Doctors can ask for more information, decline, or direct a patient to in-person or urgent care.",
  },
]

const standards: ChecklistItem[] = [
  { text: "Current AHPRA registration verified before any clinical work" },
  { text: "Service-line capability controls applied before case access" },
  { text: "Documented scope-of-practice and escalation rules" },
  { text: "Treating clinician recorded in the clinical record" },
  { text: "Prescribing decisions kept with the reviewing doctor" },
  { text: "Low-risk certificate protocol outcomes individually reviewed afterward" },
]

const doctorFaqs: FAQGroup[] = [
  {
    category: "Our Clinical Team",
    items: [
      {
        question: "Is the reviewing doctor AHPRA registered?",
        answer:
          `${DOCTOR_REGISTRATION} ${CLINICAL_DECISION_MODEL}`,
      },
      {
        question: "Who actually reviews my request?",
        answer:
          "An AHPRA-registered doctor performs clinical reviews. Clinical accountability is recorded in the patient record and on issued clinical documents where applicable.",
      },
      {
        question: "What qualifications does the reviewing doctor hold?",
        answer:
          "The public claim we make is the one you can verify: the treating clinician holds current AHPRA medical registration and works within their authorised service scope. AHPRA registration can be checked on the public register.",
      },
      {
        question: "How do you verify doctor credentials?",
        answer:
          "AHPRA registration is checked against the public register before clinical access is enabled. Separate service-line capability flags control which request types a clinician can review.",
      },
      {
        question: "How do service-line capabilities work?",
        answer:
          "A clinician can review only the service lines enabled for their profile. This lets InstantMed verify scope separately for certificates, repeat prescriptions, specialties, and prescribing permissions.",
      },
      {
        question: "Will the same doctor review my follow-up requests?",
        answer:
          "We do not promise a specific doctor for every follow-up. The important part is clinical continuity: the reviewer can see relevant InstantMed request history and prior decisions before making the next call.",
      },
      {
        question: "What happens if the doctor has concerns about my request?",
        answer:
          `If something important is missing, we'll ask for it. The reviewing doctor may also recommend that you see a GP in person, or decline the request entirely. ${GUARANTEE} We would rather refer you to the right care than issue something that is not clinically appropriate.`,
      },
      {
        question: "What clinical oversight is in place?",
        answer:
          "AHPRA-registered medical leadership owns the clinical protocols, service boundaries, and escalation rules. Platform safety checks support those rules; prescribing decisions remain with the doctor. The framework is documented at /clinical-governance.",
      },
      {
        question: "What can and cannot be prescribed?",
        answer:
          "Prescribing stays within Australian medicines rules, the doctor's scope, and the selected pathway's exclusions. InstantMed does not prescribe Schedule 8 controlled substances, and additional medicines are excluded when remote assessment or monitoring is not suitable. The doctor will direct you to another pathway when needed.",
      },
      {
        question: "Do you use anonymous reviewers?",
        answer:
          "No. We do not hide clinical accountability behind a logo. Reviewer identity and registration details are recorded in the clinical record and on issued clinical documents where applicable.",
      },
    ],
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export default function OurDoctorsClient() {
  const allFaqs = doctorFaqs.flatMap((g) =>
    g.items.map((f) => ({ question: f.question, answer: f.answer }))
  )

  return (
    <div className="flex min-h-screen flex-col">
      <FAQSchema faqs={allFaqs} />
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <CenteredHero
          pill="AHPRA-registered doctors"
          title="Doctor-owned clinical care"
          highlightWords={["Doctor-owned"]}
          subtitle={CLINICAL_DECISION_MODEL}
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="outline" className="py-2 px-4">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              AHPRA Registered
            </Badge>
            <Badge variant="outline" className="py-2 px-4">
              <GraduationCap className="w-4 h-4 mr-2 text-primary" />
              Registered doctors
            </Badge>
            <Badge variant="outline" className="py-2 px-4">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              Capability scoped
            </Badge>
          </div>
        </CenteredHero>

        {/* Anchor registration and governance without publicly marketing
            individual doctor identity or doctor count. */}
        <ServiceClaimSection
          eyebrow="Registered, governed, accountable"
          headline={
            <>
              The doctor reviewing your case is <span className="text-primary">on the AHPRA register</span>.
            </>
          }
          body="AHPRA registration is independently verifiable, service-line access is capability-scoped, and the responsible clinician is recorded in the clinical record."
        />

        {/* Credentials Grid */}
        <FeatureGrid
          title="Our credentialing standards"
          subtitle="The standards we uphold for every clinician who reviews a request on InstantMed."
          features={credentials}
          columns={4}
        />

        {/* Accountability Areas */}
        <FeatureGrid
          title="How clinical accountability works"
          subtitle="Verifiable registration, bounded scope, doctor-owned protocols, and a clear escalation path."
          features={accountabilityAreas}
          columns={2}
        />

        {/* Standards Checklist */}
        <IconChecklist
          title="What we require from every clinician"
          subtitle="Before any clinician reviews requests on InstantMed, they must meet these requirements."
          items={standards}
        />

        {/* Note below checklist */}
        <div className="px-4 -mt-12 mb-8">
          <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            The credentialing requirements and clinical standards above apply
            to every clinician who joins the platform, regardless of when they
            onboard.
          </p>
        </div>

        {/* AHPRA Verification */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="mx-auto max-w-2xl text-center">
            <Heading level="h2" className="mb-4">
              Verify the registration yourself
            </Heading>
            <p className="text-muted-foreground mb-6">
            Doctor registration is checked against the AHPRA public register
              before clinical work begins. You can verify current registration
              directly on the public register.
            </p>
            <Button asChild variant="outline" className="rounded-full bg-transparent">
              <Link
                href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                AHPRA Public Register
              </Link>
            </Button>
          </div>
        </section>

        {/* E-E-A-T Guide */}
        <DoctorsGuideSection />

        {/* FAQs */}
        <AccordionSection
          pill="Common Questions"
          title="Frequently asked questions about our clinical team"
          subtitle="Straight answers about credentials, oversight, and how our clinical governance model works."
          groups={doctorFaqs}
        />

        {/* Content Hub Cross-Links - E-E-A-T internal linking */}
        <section className="px-4 py-8 border-t border-border/30 dark:border-white/10">
          <div className="mx-auto max-w-3xl">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-center">
              Health information and service guides
            </h3>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
              <Link href="/conditions" className="text-primary hover:underline">
                Health conditions
              </Link>
              <Link href="/symptoms" className="text-primary hover:underline">
                Symptom checker
              </Link>
              <Link href="/guides" className="text-primary hover:underline">
                Health guides
              </Link>
              <Link href="/blog" className="text-primary hover:underline">
                Health articles
              </Link>
              <Link href="/about" className="text-primary hover:underline">
                About InstantMed
              </Link>
              <Link href="/clinical-governance" className="text-primary hover:underline">
                Clinical governance
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTABanner
          title="Ready to get started?"
          subtitle={CLINICAL_DECISION_MODEL}
          ctaText="Start a request"
          ctaHref="/request"
          secondaryText="Our clinical standards"
          secondaryHref="/clinical-governance"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
