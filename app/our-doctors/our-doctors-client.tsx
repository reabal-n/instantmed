"use client"

import {
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  MapPin,
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

/* ────────────────────────────── Data ────────────────────────────── */

function TrustIcon({ icon }: { icon: ReactNode }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
      {icon}
    </div>
  )
}

const credentials: FeatureItem[] = [
  {
    icon: <TrustIcon icon={<BadgeCheck className="w-6 h-6 text-primary" />} />,
    title: "AHPRA Registered",
    description:
      "Current, unrestricted registration with the Australian Health Practitioner Regulation Agency. Independently verifiable on the AHPRA public register.",
  },
  {
    icon: <TrustIcon icon={<GraduationCap className="w-6 h-6 text-primary" />} />,
    title: "Qualified doctor",
    description:
      "Medical degree from an accredited Australian or equivalent international institution, with current medical registration.",
  },
  {
    icon: <TrustIcon icon={<MapPin className="w-6 h-6 text-primary" />} />,
    title: "Australian Based",
    description:
      "Practising from within Australia under Australian healthcare guidelines and AHPRA jurisdiction.",
  },
  {
    icon: <TrustIcon icon={<Shield className="w-6 h-6 text-primary" />} />,
    title: "Clinical Governance",
    description:
      "Clinical protocols are written, reviewed, and maintained under AHPRA-registered medical governance.",
  },
]

const experienceAreas: FeatureItem[] = [
  {
    icon: <StickerIcon name="stethoscope" size={48} />,
    title: "General Practice",
    description:
      "Experience managing a wide range of common health concerns in community settings.",
  },
  {
    icon: <StickerIcon name="heart-with-pulse" size={48} />,
    title: "Emergency Medicine",
    description:
      "Acute-care background to identify red flags and escalate appropriately when a request falls outside telehealth scope.",
  },
  {
    icon: <StickerIcon name="hospital" size={48} />,
    title: "Hospital Medicine",
    description:
      "Experience across Australian public and private hospital systems.",
  },
  {
    icon: <StickerIcon name="briefcase" size={48} />,
    title: "Telehealth",
    description:
      "Trained in remote assessment, asynchronous review, documentation, and escalation when online care is not the right fit.",
  },
]

const standards: ChecklistItem[] = [
  { text: "Current AHPRA registration verified before any clinical work" },
  { text: "Minimum post-graduate clinical experience requirement" },
  { text: "Professional indemnity insurance maintained" },
  { text: "Ongoing continuing medical education" },
  { text: "Documented scope-of-practice and escalation rules" },
  { text: "Background checks and credentialing completed" },
]

const doctorFaqs: FAQGroup[] = [
  {
    category: "Our Clinical Team",
    items: [
      {
        question: "Is the reviewing doctor a real, registered Australian doctor?",
        answer:
          "Yes. Your request is reviewed by an AHPRA-registered Australian doctor. Registration and scope are verified internally before clinical work begins. We do not use overseas practitioners, nurse practitioners, or AI to make clinical decisions.",
      },
      {
        question: "Who actually reviews my request?",
        answer:
          "An AHPRA-registered Australian doctor reviews your request. Clinical accountability is recorded in the patient record and on issued clinical documents where applicable.",
      },
      {
        question: "What qualifications does the reviewing doctor hold?",
        answer:
          "A medical degree from an accredited Australian or equivalent international institution, current AHPRA registration, professional indemnity insurance, and experience across general practice, emergency medicine, and hospital systems. The Medical Director is subject to the same regulatory oversight and continuing professional development obligations as any other registered GP in Australia.",
      },
      {
        question: "How do you verify doctor credentials?",
        answer:
          "Credentials are verified against the AHPRA public register before any clinical work begins, and registration status is monitored on an ongoing basis rather than checked once. Professional indemnity insurance is verified annually. If registration status changes for any reason, platform access is suspended immediately. The same standards apply to any future clinician onboarded.",
      },
      {
        question: "Does the reviewing doctor have telehealth experience?",
        answer:
          "Yes. Telehealth is a specific clinical skillset beyond general practice. Reviewing doctors must understand remote assessment, asynchronous consultation, documentation, and appropriate escalation when a request falls outside what can be safely handled remotely.",
      },
      {
        question: "Will the same doctor review my follow-up requests?",
        answer:
          "We do not promise a specific doctor for every follow-up. The important part is clinical continuity: the reviewer can see relevant InstantMed request history and prior decisions before making the next call.",
      },
      {
        question: "What happens if the doctor has concerns about my request?",
        answer:
          "If something important is missing, we'll ask for it. The reviewing doctor may also recommend that you see a GP in person, or decline the request entirely. If your request is declined for clinical reasons, you receive a full refund. We would rather refer you to the right care than issue something that is not clinically appropriate.",
      },
      {
        question: "What clinical oversight is in place?",
        answer:
          "Our Medical Director is responsible for designing and maintaining all clinical protocols, which are reviewed on a regular cadence and enforced through the platform itself (including hard blocks on out-of-scope requests and controlled substances). Our full clinical governance framework is documented at /clinical-governance.",
      },
      {
        question: "What can and cannot be prescribed?",
        answer:
          "Prescribing follows TGA (Therapeutic Goods Administration) guidelines and the treating doctor's scope of practice. Schedule 8 controlled substances (including opioids, benzodiazepines, and stimulants) are not available through telehealth on our platform. If a medication falls outside what can be safely prescribed remotely, the doctor will tell you and suggest an alternative pathway.",
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
          pill="AHPRA-Registered Australian Practice"
          title="Every request reviewed by a real doctor"
          highlightWords={["a real doctor"]}
          subtitle="No algorithms. No shortcuts. Every request is reviewed by an AHPRA-registered Australian doctor who takes the time to understand your situation before making a clinical decision."
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
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              Australian Based
            </Badge>
          </div>
        </CenteredHero>

        {/* Page superpower — distinguishes from anonymous or offshore care by
            anchoring registration and governance without publicly marketing
            individual doctor identity. */}
        <ServiceClaimSection
          eyebrow="Registered, governed, accountable"
          headline={
            <>
              The doctor reviewing your case is <span className="text-primary">on the AHPRA register</span>.
            </>
          }
          body="Registration, scope, and clinical accountability are verified before any doctor reviews requests on InstantMed. No offshore prescribers, no anonymous decision-making, no AI standing in for clinical judgment."
        />

        {/* Credentials Grid */}
        <FeatureGrid
          title="Our credentialing standards"
          subtitle="The standards we uphold for every clinician who reviews a request on InstantMed."
          features={credentials}
          columns={4}
        />

        {/* Experience Areas */}
        <FeatureGrid
          title="Clinical experience that matters"
          subtitle="A background across general practice, emergency medicine, and hospital systems means clinical scenarios are handled appropriately."
          features={experienceAreas}
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
              before clinical work begins, with ongoing monitoring for any
              registration change.
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
              Health resources reviewed by a registered GP
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
          subtitle="Complete a short form and an AHPRA-registered doctor will review your request."
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
