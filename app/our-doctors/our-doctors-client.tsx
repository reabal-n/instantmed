"use client"

import {
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  MapPin,
  Shield,
  Users,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { MarketingFooter } from "@/components/marketing"
import { DoctorsGuideSection } from "@/components/marketing/sections"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AccordionSection, CTABanner,FeatureGrid, IconChecklist } from "@/components/sections"
import type { ChecklistItem,FeatureItem } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
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
    title: "Qualified GP",
    description:
      "Medical degree from an accredited Australian or equivalent international institution. Practising as a general practitioner.",
  },
  {
    icon: <TrustIcon icon={<MapPin className="w-6 h-6 text-primary" />} />,
    title: "Australian Based",
    description:
      "Practising from within Australia under Australian healthcare guidelines and AHPRA jurisdiction.",
  },
  {
    icon: <TrustIcon icon={<Users className="w-6 h-6 text-primary" />} />,
    title: "Medical Director",
    description:
      "Clinical protocols are written and maintained by our AHPRA-registered Medical Director, who also reviews every request.",
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
      "Trained in remote-assessment best practice and RACGP telehealth guidelines.",
  },
]

const standards: ChecklistItem[] = [
  { text: "Current AHPRA registration verified before any clinical work" },
  { text: "Minimum post-graduate clinical experience requirement" },
  { text: "Professional indemnity insurance maintained" },
  { text: "Ongoing continuing medical education" },
  { text: "Clinical work aligned with RACGP standards for general practice" },
  { text: "Background checks and credentialing completed" },
]

const doctorFaqs: FAQGroup[] = [
  {
    category: "Our Clinical Team",
    items: [
      {
        question: "Is the reviewing doctor a real, registered Australian GP?",
        answer:
          "Yes. Your request is reviewed by an AHPRA-registered Australian general practitioner whose name and registration number you can independently verify on the AHPRA public register at ahpra.gov.au. We do not use overseas practitioners, nurse practitioners, or AI to make clinical decisions.",
      },
      {
        question: "Who actually reviews my request?",
        answer:
          "InstantMed currently operates with one AHPRA-registered Australian GP who serves as both the treating practitioner and the Medical Director. You are not being reviewed by an anonymous team behind a logo. You are being reviewed by a named, registered, identifiable clinician. Their name and AHPRA number appear on every certificate and prescription we issue, and are available on request for any consultation.",
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
          "Yes. Telehealth is a specific clinical skillset beyond general practice, and our Medical Director practises in line with RACGP telehealth standards covering remote assessment, asynchronous consultation, and appropriate escalation when a request falls outside what can be safely handled remotely.",
      },
      {
        question: "Will the same doctor review my follow-up requests?",
        answer:
          "At current scale, yes. Because a single AHPRA-registered Medical Director reviews requests on the platform, your follow-up is seen by the same clinician with access to your previous consultation history. As additional clinicians are onboarded, any new reviewer has access to the same history on the platform to provide continuity of care.",
      },
      {
        question: "What happens if the doctor has concerns about my request?",
        answer:
          "The reviewing doctor may contact you for additional information, recommend that you see a GP in person, or decline the request entirely. If your request is declined for clinical reasons, you receive a full refund. We would rather refer you to the right care than issue something that is not clinically appropriate.",
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
        question: "How many doctors does InstantMed have?",
        answer:
          "InstantMed currently operates with one AHPRA-registered Australian GP, who serves as both the treating practitioner and the Medical Director. This is an honest disclosure of scale. The platform is built to support multiple clinicians, and our credentialing standards are documented and enforceable for every clinician who joins.",
      },
    ],
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

interface OurDoctorsClientProps {
  /** Count of AHPRA-verified consulting doctors. We never render individual names. */
  verifiedDoctorCount: number
}

export default function OurDoctorsClient({ verifiedDoctorCount }: OurDoctorsClientProps) {
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
          title="Every request reviewed by a real GP"
          highlightWords={["a real GP"]}
          subtitle="No algorithms. No shortcuts. Every request is reviewed by an AHPRA-registered Australian doctor who takes the time to understand your situation before making a clinical decision."
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="outline" className="py-2 px-4">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              AHPRA Registered
            </Badge>
            <Badge variant="outline" className="py-2 px-4">
              <GraduationCap className="w-4 h-4 mr-2 text-primary" />
              Qualified GPs
            </Badge>
            <Badge variant="outline" className="py-2 px-4">
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              Australian Based
            </Badge>
          </div>
        </CenteredHero>

        {/* Page superpower — distinguishes from "telehealth platforms staffed
            by anonymous overseas doctors" by anchoring the named-AHPRA-doctor
            promise that this page is built to make. Per CLAUDE.md identity
            constraint, we do NOT name the individual doctor; the verifiable
            registration is the claim. */}
        <ServiceClaimSection
          eyebrow="Named, registered, verifiable"
          headline={
            <>
              The doctor reviewing your case is <span className="text-primary">on the AHPRA register</span>.
            </>
          }
          body="Their name appears on every certificate and prescription we issue. You can independently verify their registration on ahpra.gov.au at any time. No anonymous reviewers, no offshore prescribers, no AI standing in for clinical judgment."
        />

        {/* Credentials Grid */}
        <FeatureGrid
          title="Our credentialing standards"
          subtitle="The standards we uphold for every clinician who reviews a request on InstantMed."
          features={credentials}
          columns={4}
        />

        {/* Clinical team summary - singular Medical Director model per CLAUDE.md
            Platform Identity. We surface the count (currently 1) and the
            credentialing standards every clinician on the platform meets. */}
        {verifiedDoctorCount > 0 && (
          <section className="py-20 px-4 bg-muted/30">
            <div className="mx-auto max-w-3xl text-center">
              <Heading level="h2" className="mb-4">
                Our clinical team
              </Heading>
              <p className="text-muted-foreground mb-8">
                InstantMed currently operates with an AHPRA-registered
                Australian GP who serves as both the treating practitioner and
                the Medical Director. This is an honest disclosure of scale.
                You are reviewed by a named, registered, identifiable clinician
                whose AHPRA status you can verify independently.
              </p>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none px-6 py-5">
                <BadgeCheck className="w-6 h-6 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">
                    AHPRA-verified consulting clinicians
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {verifiedDoctorCount}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      currently active
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-6 max-w-xl mx-auto">
                The treating practitioner&apos;s name and AHPRA number appear
                on every certificate and prescription we issue, so you can
                independently verify them on the AHPRA register. The
                credentialing standards listed above apply to every clinician
                who joins the platform.
              </p>
            </div>
          </section>
        )}

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
              The treating doctor&apos;s registration can be independently
              verified on the AHPRA public register. Their name appears on
              every certificate we issue, so you are welcome to check.
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
