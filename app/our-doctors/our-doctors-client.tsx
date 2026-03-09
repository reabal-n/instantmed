"use client"

import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CenteredHero } from "@/components/heroes"
import { FeatureGrid, IconChecklist, CTABanner } from "@/components/sections"
import type { FeatureItem, ChecklistItem } from "@/components/sections/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  ExternalLink,
  Stethoscope,
  GraduationCap,
  MapPin,
  Users,
  Building2,
  HeartPulse,
  Briefcase,
  BadgeCheck,
} from "lucide-react"

/* ────────────────────────────── Types ────────────────────────────── */

interface DoctorProfile {
  id: string
  full_name: string
  nominals: string | null
  ahpra_number: string | null
}

/* ────────────────────────────── Data ────────────────────────────── */

const credentials: FeatureItem[] = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: "AHPRA Registered",
    description:
      "Every doctor holds current registration with the Australian Health Practitioner Regulation Agency. No exceptions.",
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: "Qualified GPs",
    description:
      "Our doctors hold medical degrees from accredited Australian or equivalent international institutions.",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: "Australian Based",
    description:
      "All our doctors work from Australia and understand local healthcare guidelines and patient needs.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Medical Director Oversight",
    description:
      "Clinical protocols are developed and reviewed by a Medical Director with RACGP Fellowship.",
  },
]

const experienceAreas: FeatureItem[] = [
  {
    icon: <Stethoscope className="h-6 w-6" />,
    title: "General Practice",
    description:
      "Years of experience managing a wide range of common health concerns in community settings.",
  },
  {
    icon: <HeartPulse className="h-6 w-6" />,
    title: "Emergency Medicine",
    description:
      "Background in acute care equips our doctors to identify red flags and escalate appropriately.",
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: "Hospital Medicine",
    description:
      "Experience across public and private hospital systems throughout Australia.",
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: "Telehealth",
    description:
      "Trained specifically in remote consultation best practices and digital healthcare delivery.",
  },
]

const standards: ChecklistItem[] = [
  { text: "Current AHPRA registration verified before onboarding" },
  { text: "Minimum years of post-graduate clinical experience" },
  { text: "Professional indemnity insurance maintained" },
  { text: "Regular participation in continuing medical education" },
  { text: "Adherence to RACGP standards for general practice" },
  { text: "Background checks and credentialing completed" },
]

/* ────────────────────────────── Component ────────────────────────────── */

interface OurDoctorsClientProps {
  doctors: DoctorProfile[]
}

export default function OurDoctorsClient({ doctors }: OurDoctorsClientProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <CenteredHero
          pill="Real Australian Doctors"
          title="Every request reviewed by a real GP"
          highlightWords={["a real GP"]}
          subtitle="No algorithms. No shortcuts. Every single request is reviewed by an AHPRA-registered Australian doctor who takes the time to understand your situation before making a clinical decision."
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

        {/* Credentials Grid */}
        <FeatureGrid
          title="Our credentialing standards"
          subtitle="We hold our doctors to the same standards you'd expect from any quality medical practice."
          features={credentials}
          columns={4}
        />

        {/* Verified Doctor Profiles — bespoke section with schema.org/Physician microdata */}
        {doctors.length > 0 && (
          <section className="py-20 px-4 bg-muted/30">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl mb-4">
                Our consulting doctors
              </h2>
              <p className="text-muted-foreground">
                Each doctor&apos;s AHPRA registration can be independently verified
                on the public register.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="rounded-2xl border border-border/50 bg-card/60 dark:bg-white/5 backdrop-blur-sm p-6 text-center"
                  itemScope
                  itemType="https://schema.org/Physician"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1" itemProp="name">
                    Dr {doctor.full_name}
                  </h3>
                  {doctor.nominals && (
                    <p className="text-sm text-muted-foreground mb-2" itemProp="qualifications">
                      {doctor.nominals}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-primary mb-3">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>AHPRA Verified</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {doctor.ahpra_number}
                  </p>
                  <meta itemProp="medicalSpecialty" content="General Practice" />
                  <link
                    itemProp="sameAs"
                    href="https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience Areas */}
        <FeatureGrid
          title="Clinical experience that matters"
          subtitle="Our doctors bring diverse backgrounds in medicine, ensuring they can handle a range of clinical scenarios appropriately."
          features={experienceAreas}
          columns={2}
        />

        {/* Standards Checklist */}
        <IconChecklist
          title="What we require from every doctor"
          subtitle="Before any doctor reviews requests on InstantMed, they must meet these requirements."
          items={standards}
        />

        {/* Note below checklist */}
        <div className="px-4 -mt-12 mb-8">
          <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            Our consulting doctor roster varies based on availability. All doctors
            meet the same credentialing requirements and clinical standards.
          </p>
        </div>

        {/* AHPRA Verification */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Verify doctor registration yourself
            </h2>
            <p className="text-muted-foreground mb-6">
              Every doctor&apos;s registration can be independently verified
              on the AHPRA public register. The doctor&apos;s name appears on
              every certificate we issue — you&apos;re welcome to check.
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

        {/* CTA */}
        <CTABanner
          title="Ready to get started?"
          subtitle="Complete a short form and one of our doctors will review your request."
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
