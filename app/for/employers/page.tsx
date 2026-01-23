import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip, MediaMentions } from "@/components/marketing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  CheckCircle,
  FileText,
  Search,
  ExternalLink,
  Building2,
  Lock,
  HelpCircle,
  Mail,
  MapPin,
  Eye,
} from "lucide-react"
import { SampleCertificate } from "@/components/marketing/sample-certificate"

export const metadata: Metadata = {
  title: "For Employers | Verify Medical Certificates | InstantMed",
  description:
    "Information for employers on how to verify InstantMed medical certificates. Learn about our verification process, what certificates include, and how to confirm authenticity.",
  openGraph: {
    title: "For Employers | InstantMed",
    description:
      "Learn how to verify medical certificates issued by InstantMed. Quick, secure verification for employers.",
  },
}

export default function EmployersPage() {
  const certificateFeatures = [
    "Patient's full name",
    "Date of issue",
    "Period of unfitness (from/to dates)",
    "Unique verification code",
    "Issuing doctor's name and AHPRA number",
    "InstantMed clinic details and ABN",
    "QR code linking to verification portal",
  ]

  const faqs = [
    {
      question: "Are InstantMed certificates legally valid?",
      answer:
        "Yes. InstantMed certificates are issued by AHPRA-registered Australian doctors and are legally equivalent to certificates issued by any other registered medical practitioner in Australia.",
    },
    {
      question: "How do I verify a certificate?",
      answer:
        "Enter the unique verification code (found on the certificate) into our verification portal at instantmed.com.au/verify. The system will confirm if the certificate is genuine and display the relevant details.",
    },
    {
      question: "What if the verification fails?",
      answer:
        "A failed verification may indicate an incorrectly entered code, a certificate issued before our verification system was implemented, or a document not issued by InstantMed. Contact us if you need assistance.",
    },
    {
      question: "Can I contact InstantMed to verify directly?",
      answer:
        "Yes. For additional verification or if you have concerns, you can email support@instantmed.com.au with the certificate details. We respond within one business day.",
    },
    {
      question: "Who issues the certificates?",
      answer:
        "All certificates are reviewed and issued by AHPRA-registered Australian doctors. You can verify any doctor's registration on the AHPRA public register.",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-blue-50/30 dark:to-blue-950/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-0 px-4 py-1.5">
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                For Employers & HR Teams
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                Verifying InstantMed{" "}
                <span className="text-primary">Medical Certificates</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Everything you need to know about verifying the authenticity of 
                medical certificates issued through InstantMed.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/verify">
                  <Search className="w-4 h-4 mr-2" />
                  Go to Verification Portal
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* About InstantMed */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
                About InstantMed
              </h2>
              <div className="bg-card rounded-2xl border p-6 md:p-8 space-y-4">
                <p className="text-muted-foreground">
                  InstantMed is a registered Australian telehealth provider that offers 
                  medical certificates and repeat prescriptions through online consultations 
                  with AHPRA-registered doctors.
                </p>
                <p className="text-muted-foreground">
                  Every request is reviewed by a qualified Australian GP who makes an 
                  independent clinical decision. We do not auto-approve requests — each 
                  case is assessed individually based on the information provided.
                </p>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>Level 1/457-459 Elizabeth St, Surry Hills NSW 2010</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href="mailto:support@instantmed.com.au" className="text-primary hover:underline">
                      support@instantmed.com.au
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>ABN: 12 345 678 901</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Verify */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                How to verify a certificate
              </h2>
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Locate the verification code
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Find the unique code on the certificate. It typically appears in the format 
                      <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs">IM-ABC12345</code> 
                      or 
                      <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs">MC-12345678</code>.
                      You can also scan the QR code if one is present.
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-2xl border p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Visit the verification portal
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Go to{" "}
                      <Link href="/verify" className="text-primary hover:underline">
                        instantmed.com.au/verify
                      </Link>{" "}
                      and enter the verification code in the search field.
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-2xl border p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Review the results
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      If valid, you&apos;ll see the certificate details including the patient name, 
                      dates, and issuing doctor. Compare these with the document you received.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Certificates Include */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                What our certificates look like
              </h2>
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Sample certificate preview */}
                <SampleCertificate />
                
                {/* Features list */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    What&apos;s included
                  </h3>
                  <div className="bg-card rounded-2xl border p-6">
                    <ul className="space-y-3">
                      {certificateFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                Why you can trust our certificates
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-card rounded-2xl border p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">AHPRA-Registered Doctors</h3>
                  <p className="text-sm text-muted-foreground">
                    Every certificate is issued by a doctor registered with the Australian 
                    Health Practitioner Regulation Agency.
                  </p>
                  <Link
                    href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-primary hover:underline mt-3"
                  >
                    Verify on AHPRA
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>

                <div className="bg-card rounded-2xl border p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Secure & Tamper-Proof</h3>
                  <p className="text-sm text-muted-foreground">
                    Each certificate has a unique verification code. Our system detects 
                    any alterations or duplications.
                  </p>
                </div>

                <div className="bg-card rounded-2xl border p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Clinical Standards</h3>
                  <p className="text-sm text-muted-foreground">
                    Our protocols align with RACGP standards and are overseen by 
                    a Medical Director with FRACGP qualification.
                  </p>
                  <Link
                    href="/clinical-governance"
                    className="inline-flex items-center text-xs text-primary hover:underline mt-3"
                  >
                    Our standards
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                <HelpCircle className="w-6 h-6 inline mr-2" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.question} className="bg-card rounded-2xl border p-6">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Need further assistance?
              </h2>
              <p className="text-muted-foreground mb-6">
                If you have questions about a specific certificate or need additional 
                verification, our team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="rounded-full">
                  <Link href="/verify">Verify a Certificate</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <a href="mailto:support@instantmed.com.au">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <LiveWaitTime variant="strip" services={['med-cert']} />
        <StatsStrip className="bg-muted/20 border-y border-border/30" />
        <MediaMentions variant="strip" className="bg-muted/30" />
      </main>

      <MarketingFooter />
    </div>
  )
}
