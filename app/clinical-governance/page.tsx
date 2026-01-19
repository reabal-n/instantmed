import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  UserCheck,
  BookOpen,
  Scale,
  CheckCircle,
  ExternalLink,
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
  Stethoscope,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Clinical Governance | InstantMed",
  description:
    "Learn how InstantMed maintains clinical standards through Medical Director oversight, RACGP-aligned protocols, and regular audits.",
  openGraph: {
    title: "Clinical Governance | InstantMed",
    description:
      "Our clinical processes are designed by practising GPs and reviewed regularly to meet Australian standards.",
  },
}

export default function ClinicalGovernancePage() {
  const governanceAreas = [
    {
      icon: UserCheck,
      title: "Clinical Leadership",
      description:
        "Our medical team operates under the oversight of a Medical Director who holds Fellowship with the Royal Australian College of General Practitioners (FRACGP).",
      details: [
        "Medical Director reviews all clinical protocols",
        "Senior GP oversight on complex cases",
        "Direct escalation pathway for clinical concerns",
        "Regular clinical team meetings",
      ],
    },
    {
      icon: BookOpen,
      title: "Guidelines We Follow",
      description:
        "Our clinical processes align with established Australian medical standards and regulations.",
      details: [
        "RACGP Standards for General Practices (5th edition)",
        "Therapeutic Goods Administration (TGA) prescribing regulations",
        "Pharmaceutical Benefits Scheme (PBS) guidelines",
        "Australian Privacy Principles (APP)",
        "AHPRA Telehealth Guidelines",
      ],
    },
    {
      icon: ClipboardCheck,
      title: "Quality Assurance",
      description:
        "We maintain clinical quality through systematic review and continuous improvement.",
      details: [
        "Regular peer review of clinical decisions",
        "Random audits of certificates and prescriptions",
        "Incident reporting and learning framework",
        "Patient feedback integration into protocols",
      ],
    },
    {
      icon: Scale,
      title: "Scope of Practice",
      description:
        "We focus on what telehealth does well — low-complexity, high-frequency presentations.",
      details: [
        "Medical certificates for common presentations",
        "Repeat prescriptions for stable conditions",
        "Straightforward clinical assessments",
        "Complex or high-risk cases referred to in-person care",
      ],
    },
    {
      icon: RefreshCw,
      title: "Continuous Improvement",
      description:
        "Our protocols evolve based on clinical evidence and operational learnings.",
      details: [
        "Quarterly protocol reviews by Medical Director",
        "Post-incident reviews and process updates",
        "Integration of new clinical guidelines",
        "Regular training for consulting doctors",
      ],
    },
    {
      icon: AlertTriangle,
      title: "Safety Boundaries",
      description:
        "Clear limits protect patients. Some things require in-person assessment.",
      details: [
        "No controlled substances (S8 medications)",
        "No treatments requiring physical examination",
        "Automatic escalation for red-flag symptoms",
        "Clear referral pathways to emergency and specialist care",
      ],
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 px-4 py-1.5">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Clinical Governance
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                Good medicine starts with{" "}
                <span className="text-primary">good governance</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Our clinical processes are designed by practising GPs and
                reviewed regularly to ensure every patient interaction meets
                Australian standards.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="py-2 px-4">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Medical Director Oversight
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <BookOpen className="w-4 h-4 mr-2 text-primary" />
                  RACGP-Aligned
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <Stethoscope className="w-4 h-4 mr-2 text-primary" />
                  Practising GPs
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Governance Areas */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              {governanceAreas.map((area) => (
                <div
                  key={area.title}
                  className="rounded-2xl border bg-card p-6 md:p-8"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <area.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        {area.title}
                      </h2>
                      <p className="text-muted-foreground">{area.description}</p>
                    </div>
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-2 mt-6">
                    {area.details.map((detail, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* External Verification */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Independent verification
              </h2>
              <p className="text-muted-foreground mb-6">
                Our doctors&apos; registration can be independently verified on
                the AHPRA public register. Our clinical standards align with
                RACGP guidelines for general practice.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link
                    href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    AHPRA Register
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link
                    href="https://www.racgp.org.au/running-a-practice/practice-standards"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    RACGP Standards
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Questions about our clinical standards?
              </h2>
              <p className="text-muted-foreground mb-6">
                We&apos;re happy to explain how we maintain quality and safety
                across all consultations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="rounded-full">
                  <Link href="/contact">Contact us</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link href="/our-doctors">Meet our doctors</Link>
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
