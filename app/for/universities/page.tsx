import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip, MediaMentions } from "@/components/marketing"
import { EmployerLogoMarquee } from "@/components/shared/employer-logo-marquee"
import { SampleCertificate } from "@/components/marketing/sample-certificate"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL } from "@/lib/constants"
import { Star } from "lucide-react"
import {
  Shield,
  CheckCircle,
  FileText,
  Search,
  ExternalLink,
  GraduationCap,
  Lock,
  HelpCircle,
  Mail,
  MapPin,
  Eye,
  BookOpen,
  Scale,
  BadgeCheck,
  ClipboardCheck,
  Building2,
} from "lucide-react"

export const metadata: Metadata = {
  title: "For Universities | Verify Medical Certificates",
  description:
    "Information for universities and educational institutions on verifying InstantMed medical certificates for special consideration, deferred exams, and assessment extensions.",
  openGraph: {
    title: "For Universities | InstantMed",
    description:
      "Learn how to verify medical certificates issued by InstantMed. Quick, secure verification for university administrators.",
    images: [{ url: "https://instantmed.com.au/og/universities.png", width: 1200, height: 630, alt: "InstantMed for Universities" }],
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/universities",
  },
}

const studentTestimonials = [
  {
    name: "Emily T.",
    location: "Randwick, NSW",
    text: "Had a migraine the morning of my final. Got a medical certificate within an hour and submitted my special consideration application the same day. Uni approved it no questions asked.",
    rating: 5,
  },
  {
    name: "James W.",
    location: "Clayton, VIC",
    text: "Needed a cert for a deferred exam after a stomach bug. The doctor was thorough and the certificate had everything my faculty required. Way easier than trying to get a same-day GP appointment during exam week.",
    rating: 5,
  },
  {
    name: "Priya K.",
    location: "St Lucia, QLD",
    text: "Got sick during my nursing placement week and needed documentation fast. Certificate was professional, had the AHPRA number, and my placement coordinator accepted it immediately.",
    rating: 5,
  },
]

export default function UniversitiesPage() {
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
      question: "Are online medical certificates valid for special consideration?",
      answer:
        "Yes. Certificates issued by AHPRA-registered doctors via telehealth carry the same validity as those from in-person GP visits. The Medical Board of Australia recognises telehealth as a legitimate healthcare delivery method, and universities across Australia accept telehealth-issued certificates for special consideration applications.",
    },
    {
      question: "Can students get backdated certificates?",
      answer:
        "Certificates can cover absences up to 48 hours prior if clinically appropriate. The doctor makes this determination based on the student's reported symptoms. This is particularly relevant for students who fall ill during exams or assessments and are unable to see a doctor on the day.",
    },
    {
      question: "What information is on the certificate?",
      answer:
        "Doctor's full name, AHPRA registration number, date of consultation, patient's name and DOB, period of unfitness, unique verification ID, doctor's signature, and practice details. This includes all elements typically required by university special consideration policies.",
    },
    {
      question: "How do we verify a certificate?",
      answer:
        "Enter the unique verification code at instantmed.com.au/verify. This confirms the certificate was genuinely issued by our practice, the dates match, and the doctor is AHPRA-registered. This is more robust than paper certificates which typically have no verification mechanism.",
    },
    {
      question: "Do certificates meet university requirements?",
      answer:
        "Yes. Our certificates contain all elements required by Australian universities for special consideration: registered practitioner details, AHPRA registration number, dates of unfitness, practitioner signature, and practice details. They align with TEQSA's expectations for supporting documentation in academic integrity processes.",
    },
    {
      question: "Can we set up an institutional arrangement?",
      answer:
        `Contact us at ${CONTACT_EMAIL} to discuss institutional arrangements, bulk verification workflows, or integration with your special consideration systems.`,
    },
  ]

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <div className="flex min-h-screen flex-col">
      <script id="faq-schema" type="application/ld+json"
        suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-blue-50/30 dark:to-blue-950/10">
          <div className="max-w-3xl mx-auto px-4 text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
                <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                For Universities &amp; Education
              </Badge>
              <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-6">
                Verifying InstantMed{" "}
                <span className="text-primary">Medical Certificates</span>
                {" "}for Universities
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Everything you need to know about verifying medical certificates
                submitted for special consideration, deferred exams, and
                assessment extensions.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/verify">
                  <Search className="w-4 h-4 mr-2" />
                  Go to Verification Portal
                </Link>
              </Button>
          </div>
        </section>

        {/* Logo Marquee */}
        <section className="border-b border-border/30 dark:border-white/10">
          <EmployerLogoMarquee />
        </section>

        {/* About InstantMed */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6 text-center">
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
                  independent clinical decision. Each case is assessed individually
                  based on the information provided.
                </p>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>Level 1/457-459 Elizabeth St, Surry Hills NSW 2010</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>ABN: 64 694 559 334</span>
                  </div>
                </div>
              </div>
          </div>
        </section>

        {/* How to Verify */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
                How to verify a certificate
              </h2>
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold">
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
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold">
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
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Review the results
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      If valid, you&apos;ll see the certificate details including the student&apos;s name,
                      dates, and issuing doctor. Compare these with the document submitted for
                      special consideration.
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </section>

        {/* What Certificates Include */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
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
                          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
                Why you can trust our certificates
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-card rounded-2xl border p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-success" />
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
                  <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-success" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Secure &amp; Tamper-Proof</h3>
                  <p className="text-sm text-muted-foreground">
                    Each certificate has a unique verification code. Our system detects
                    any alterations or duplications.
                  </p>
                </div>

                <div className="bg-card rounded-2xl border p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-success" />
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
        </section>

        {/* University Guide */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                University Guide
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                A university administrator&apos;s guide to telehealth medical certificates
              </h2>
            </div>

            <div className="space-y-8">
              {/* 1. Legal standing */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">The validity of telehealth certificates in higher education</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Since the expansion of telehealth during 2020, the Medical Board of Australia has formally recognised telehealth as a legitimate healthcare delivery method. Certificates issued via telehealth by AHPRA-registered practitioners carry identical legal and clinical weight to those from in-person consultations.
                  </p>
                  <p>
                    TEQSA&apos;s Higher Education Standards Framework requires institutions to have fair and transparent processes for managing student grievances, including illness-related academic adjustments. Telehealth-issued certificates from registered practitioners meet the evidentiary standard expected for special consideration, deferred examinations, and assessment extensions.
                  </p>
                  <p>
                    For university administrators, this means a medical certificate from InstantMed should be treated identically to one from any other registered medical practice in Australia.
                  </p>
                </div>
              </div>

              {/* 2. What to look for */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">What to look for on a certificate</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    A valid Australian medical certificate should include: the practitioner&apos;s full name, their AHPRA registration number (verifiable at{" "}
                    <a href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      ahpra.gov.au
                    </a>
                    ), the date of the clinical assessment, the patient&apos;s name and date of birth, the specific dates the patient is certified unfit for duties, and the practitioner&apos;s signature. Digital signatures are accepted under Australian law.
                  </p>
                  <p>
                    InstantMed certificates also include a unique verification ID and QR code for instant verification. This provides an additional layer of authenticity that traditional paper certificates from most GP clinics do not offer. You can verify any certificate at{" "}
                    <Link href="/verify" className="text-primary hover:underline">
                      instantmed.com.au/verify
                    </Link>.
                  </p>
                </div>
              </div>

              {/* 3. Special consideration processes */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Special consideration and deferred assessments</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Most Australian universities require students to submit a medical certificate within 3-5 business days of a missed assessment. InstantMed certificates are typically issued within 30 minutes, available 24/7 - meaning students can obtain documentation promptly, even on weekends, public holidays, or during after-hours exam periods when GP clinics are closed.
                  </p>
                  <p>
                    Our certificates contain all elements typically required by university special consideration policies: practitioner details, AHPRA registration, consultation date, period of unfitness, and the practitioner&apos;s signature. Faculties should assess the certificate on its merits, applying the same standards as any certificate from a registered medical practice.
                  </p>
                </div>
              </div>

              {/* 4. Student privacy */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Student privacy and health information</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Under Australian privacy law, students are not required to disclose their specific diagnosis. The certificate confirms unfitness for study or assessment - that is the extent of what institutions are entitled to know. Requiring students to provide additional clinical details beyond what appears on the certificate may breach privacy obligations.
                  </p>
                  <p>
                    InstantMed complies with the Australian Privacy Principles and stores patient health information in accordance with the Privacy Act 1988. We do not share patient clinical details with educational institutions beyond what is stated on the certificate itself.
                  </p>
                </div>
              </div>

              {/* 5. Verification */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Verification and academic integrity</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    InstantMed provides instant certificate verification at{" "}
                    <Link href="/verify" className="text-primary hover:underline">
                      instantmed.com.au/verify
                    </Link>
                    . Enter the unique certificate ID to confirm authenticity. This is more robust than paper certificates from traditional clinics, which typically have no verification mechanism beyond calling the practice directly.
                  </p>
                  <p>
                    If you encounter a certificate that does not verify, contact us at{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                    . We investigate all reports and cooperate with academic integrity processes where appropriate.
                  </p>
                </div>
              </div>
            </div>

            {/* AHPRA badge + clinical governance */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                <span>All doctors AHPRA-registered</span>
              </div>
              <span className="hidden sm:inline">·</span>
              <Link href="/clinical-governance" className="flex items-center gap-1.5 text-primary hover:underline">
                <FileText className="w-3.5 h-3.5" />
                View our clinical governance framework
              </Link>
            </div>
          </div>
        </section>

        {/* Student testimonials */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2 text-center">
              What students say
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-10">
              Real reviews from students whose certificates were accepted for special consideration.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {studentTestimonials.map((t) => (
                <div key={t.name} className="bg-card rounded-2xl border p-5 space-y-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
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
        </section>

        {/* Contact CTA */}
        <section className="py-16">
          <div className="max-w-xl mx-auto px-4 text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
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
                  <a href={`mailto:${CONTACT_EMAIL}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </a>
                </Button>
              </div>
          </div>
        </section>

        {/* Social Proof */}
        <LiveWaitTime variant="strip" services={['med-cert']} />
        <StatsStrip className="bg-muted/20 border-y border-border/30" />
        <MediaMentions className="bg-muted/30" />
      </main>

      <MarketingFooter />
    </div>
  )
}
