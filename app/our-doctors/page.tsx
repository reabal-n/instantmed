import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  ExternalLink,
  Stethoscope,
  GraduationCap,
  MapPin,
  Users,
  CheckCircle,
  Building2,
  HeartPulse,
  Briefcase,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Our Doctors | AHPRA-Registered Australian GPs | InstantMed",
  description:
    "Every InstantMed request is reviewed by AHPRA-registered Australian doctors with experience in general practice, emergency medicine, and telehealth.",
  openGraph: {
    title: "Our Doctors | InstantMed",
    description:
      "Every request is reviewed by a real doctor. AHPRA-registered Australian GPs with years of clinical experience.",
  },
}

export default function OurDoctorsPage() {
  const credentials = [
    {
      icon: Shield,
      title: "AHPRA Registered",
      description:
        "Every doctor holds current registration with the Australian Health Practitioner Regulation Agency. No exceptions.",
    },
    {
      icon: GraduationCap,
      title: "Qualified GPs",
      description:
        "Our doctors hold medical degrees from accredited Australian or equivalent international institutions.",
    },
    {
      icon: MapPin,
      title: "Australian Based",
      description:
        "All our doctors work from Australia and understand local healthcare guidelines and patient needs.",
    },
    {
      icon: Users,
      title: "Medical Director Oversight",
      description:
        "Clinical protocols are developed and reviewed by a Medical Director with RACGP Fellowship.",
    },
  ]

  const experienceAreas = [
    {
      icon: Stethoscope,
      title: "General Practice",
      description: "Years of experience managing a wide range of common health concerns in community settings.",
    },
    {
      icon: HeartPulse,
      title: "Emergency Medicine",
      description: "Background in acute care equips our doctors to identify red flags and escalate appropriately.",
    },
    {
      icon: Building2,
      title: "Hospital Medicine",
      description: "Experience across public and private hospital systems throughout Australia.",
    },
    {
      icon: Briefcase,
      title: "Telehealth",
      description: "Trained specifically in remote consultation best practices and digital healthcare delivery.",
    },
  ]

  const standards = [
    "Current AHPRA registration verified before onboarding",
    "Minimum years of post-graduate clinical experience",
    "Professional indemnity insurance maintained",
    "Regular participation in continuing medical education",
    "Adherence to RACGP standards for general practice",
    "Background checks and credentialing completed",
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-emerald-50/30 dark:to-emerald-950/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 px-4 py-1.5">
                <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                Real Australian Doctors
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                Every request reviewed by{" "}
                <span className="text-primary">a real GP</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                No algorithms. No shortcuts. Every single request is reviewed by 
                an AHPRA-registered Australian doctor who takes the time to 
                understand your situation before making a clinical decision.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="outline" className="py-2 px-4">
                  <Shield className="w-4 h-4 mr-2 text-emerald-600" />
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
            </div>
          </div>
        </section>

        {/* Credentials Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Our credentialing standards
              </h2>
              <p className="text-muted-foreground">
                We hold our doctors to the same standards you&apos;d expect from 
                any quality medical practice.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {credentials.map((credential) => (
                <div
                  key={credential.title}
                  className="bg-card rounded-2xl border p-6 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <credential.icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {credential.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {credential.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Experience Areas */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Clinical experience that matters
                </h2>
                <p className="text-muted-foreground">
                  Our doctors bring diverse backgrounds in medicine, ensuring 
                  they can handle a range of clinical scenarios appropriately.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {experienceAreas.map((area) => (
                  <div
                    key={area.title}
                    className="bg-card rounded-2xl border p-6 flex gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <area.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {area.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {area.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Standards Checklist */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  What we require from every doctor
                </h2>
                <p className="text-muted-foreground">
                  Before any doctor reviews requests on InstantMed, they must meet 
                  these requirements.
                </p>
              </div>

              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <ul className="space-y-4">
                  {standards.map((standard) => (
                    <li key={standard} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-foreground">{standard}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Our consulting doctor roster varies based on availability. All doctors 
                meet the same credentialing requirements and clinical standards.
              </p>
            </div>
          </div>
        </section>

        {/* AHPRA Verification */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
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
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-6">
                Complete a short form and one of our doctors will review your request.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="rounded-full">
                  <Link href="/request">Get started</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link href="/clinical-governance">
                    Our clinical standards
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
