import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  UserCheck,
  Lock,
  FileText,
  Phone,
  CheckCircle,
  ExternalLink,
  Building2,
  Scale,
  Heart,
} from "lucide-react"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Why Trust InstantMed? | AHPRA Registered Doctors",
  description:
    "Learn about our doctor verification process, data security, Medicare compliance, and how we ensure safe, legitimate telehealth consultations.",
}

export default function TrustPage() {
  const trustPoints = [
    {
      icon: UserCheck,
      title: "AHPRA-Registered Doctors",
      description:
        "Every doctor on InstantMed is registered with the Australian Health Practitioner Regulation Agency (AHPRA). We verify credentials before they join and continuously monitor registration status.",
      details: [
        "All doctors hold current AHPRA registration",
        "We verify credentials directly with AHPRA",
        "Doctors must maintain professional indemnity insurance",
        "Regular audits of clinical decision-making",
      ],
    },
    {
      icon: Shield,
      title: "How Doctor Reviews Work",
      description:
        "Your request is reviewed by a qualified GP who makes an independent clinical decision. They may approve, request more information, or recommend an in-person consultation.",
      details: [
        "Doctors review your full medical history",
        "Clinical guidelines inform every decision",
        "Doctors can contact you if they need more info",
        "No automated approvals — every request is human-reviewed",
      ],
    },
    {
      icon: Lock,
      title: "Bank-Level Data Security",
      description:
        "Your health information is protected with enterprise-grade security. We comply with Australian Privacy Principles and store all data on Australian servers.",
      details: [
        "256-bit SSL encryption for all data",
        "Data stored on Australian servers only",
        "Compliant with Privacy Act 1988",
        "Regular security audits and penetration testing",
      ],
    },
    {
      icon: Building2,
      title: "Medicare Compliance",
      description:
        "Our prescriptions and referrals are Medicare-compliant. Electronic prescriptions work at any Australian pharmacy, and referrals are accepted by all specialists.",
      details: [
        "eScripts sent via official PBS channels",
        "Referrals valid for 12 months",
        "Full Medicare rebate eligibility",
        "Compliant with Therapeutic Goods Act",
      ],
    },
    {
      icon: Scale,
      title: "Complaints Process",
      description:
        "We take complaints seriously. If you&apos;re unhappy with our service, you can lodge a complaint directly with us or escalate to the relevant health ombudsman.",
      details: [
        "Respond to complaints within 48 hours",
        "Independent review by senior doctors",
        "Escalation to Health Complaints Commissioner",
        "Full refund if we can&apos;t help you",
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
              <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Trust & Safety
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                Your health. <span className="text-primary">Our responsibility.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                InstantMed is built on a foundation of trust, transparency, and clinical excellence. Here&apos;s how we keep
                you safe.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="py-2 px-4">
                  <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                  AHPRA Verified
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <Lock className="w-4 h-4 mr-2 text-primary" />
                  256-bit Encryption
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <Heart className="w-4 h-4 mr-2 text-primary" />
                  10,000+ Aussies Helped
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Points */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-12">
              {trustPoints.map((point) => (
                <div key={point.title} className="rounded-2xl border bg-card p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <point.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-2">{point.title}</h2>
                      <p className="text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-2 mt-6">
                    {point.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AHPRA Verification CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">Verify our doctors yourself</h2>
              <p className="text-muted-foreground mb-6">
                Every doctor&apos;s registration can be independently verified on the AHPRA public register. We encourage you
                to check.
              </p>
              <Button asChild variant="outline" className="rounded-full bg-transparent">
                <Link href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  AHPRA Public Register
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">Still have concerns?</h2>
              <p className="text-muted-foreground mb-6">
                We&apos;re happy to answer any questions about our processes, doctors, or security measures.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="rounded-full">
                  <Link href="/contact">
                    <FileText className="w-4 h-4 mr-2" />
                    Contact Us
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link href="tel:1300123456">
                    <Phone className="w-4 h-4 mr-2" />
                    1300 123 456
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
