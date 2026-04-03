import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip, MediaMentions } from "@/components/marketing"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
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
  BookOpen,
  Scale,
  BadgeCheck,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react"
import { SampleCertificate } from "@/components/marketing/sample-certificate"
import { CONTACT_EMAIL } from "@/lib/constants"

export const metadata: Metadata = {
  title: "For Employers | Verify Medical Certificates",
  description:
    "Information for employers on how to verify InstantMed medical certificates. Learn about our verification process, what certificates include, and how to confirm authenticity.",
  openGraph: {
    title: "For Employers | InstantMed",
    description:
      "Learn how to verify medical certificates issued by InstantMed. Quick, secure verification for employers.",
  },
}

const employerLogos = [
  { name: 'Woolworths', src: '/logos/woolworths.png', width: 90, maxWidth: 90 },
  { name: 'Coles', src: '/logos/coles.png', width: 70, maxWidth: 70 },
  { name: 'Telstra', src: '/logos/telstra.png', width: 80, maxWidth: 80 },
  { name: 'Commonwealth Bank', src: '/logos/commonwealthbank.png', width: 50, maxWidth: 50 },
  { name: 'ANZ', src: '/logos/ANZ.png', width: 60, maxWidth: 60 },
  { name: 'Westpac', src: '/logos/westpac.png', width: 80, maxWidth: 80 },
  { name: 'NAB', src: '/logos/nab.png', width: 60, maxWidth: 60 },
  { name: 'Amazon', src: '/logos/amazon.png', width: 90, maxWidth: 90 },
  { name: 'BHP', src: '/logos/BHP.png', width: 60, maxWidth: 60 },
  { name: 'Bunnings', src: '/logos/bunnings.png', width: 90, maxWidth: 90 },
  { name: 'JB Hi-Fi', src: '/logos/jbhifi.png', width: 70, maxWidth: 70 },
  { name: "McDonald's", src: '/logos/mcdonalds.png', width: 40, maxWidth: 40 },
  { name: 'Sonic Healthcare', src: '/logos/sonichealthcare.png', width: 110, maxWidth: 110 },
]

const employeeTestimonials = [
  {
    name: "Sarah M.",
    location: "Bondi, NSW",
    text: "Woke up with gastro at 6am, had my cert by 8:30. HR didn't question it.",
    rating: 5,
  },
  {
    name: "Tom H.",
    location: "Carlton, VIC",
    text: "Missed an exam and needed a cert for special consideration. Done before my next lecture. The doctor asked follow-up questions too which made it feel legit.",
    rating: 5,
  },
  {
    name: "Nick B.",
    location: "Pyrmont, NSW",
    text: "Gastro the night before a big work thing. Cert was in my inbox by 7am. Exactly what I needed.",
    rating: 5,
  },
]

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
      question: "Are online medical certificates legally valid?",
      answer:
        "Yes. Certificates issued by AHPRA-registered doctors via telehealth carry the same legal weight as those from in-person GP visits. The Medical Board of Australia recognises telehealth as a legitimate healthcare delivery method.",
    },
    {
      question: "Can I reject an online medical certificate?",
      answer:
        "Under the Fair Work Act, employers must accept 'reasonable evidence' of illness. A certificate from an AHPRA-registered doctor meets this standard. Rejecting a valid certificate could constitute a breach.",
    },
    {
      question: "How do I verify an InstantMed certificate?",
      answer:
        "Enter the unique verification code at instantmed.com.au/verify. This confirms the certificate was genuinely issued by our practice, the dates match, and the doctor is AHPRA-registered.",
    },
    {
      question: "What information is on the certificate?",
      answer:
        "Doctor's full name, AHPRA registration number, date of consultation, patient's name and DOB, period of unfitness, unique verification ID, doctor's signature, and practice details.",
    },
    {
      question: "Can I ask the employee what they were sick with?",
      answer:
        "Generally, no. Under Australian privacy law, employees are not required to disclose their specific diagnosis. The certificate confirms unfitness for work — that's the extent of what employers are entitled to know.",
    },
    {
      question: "What if I suspect a certificate is fraudulent?",
      answer:
        `Use our verification portal. If the certificate ID doesn't verify, contact us at ${CONTACT_EMAIL}. We take fraudulent use seriously and cooperate with workplace investigations.`,
    },
    {
      question: "Do your certificates meet Fair Work requirements?",
      answer:
        "Yes. They contain all elements required under the Fair Work Act: registered practitioner details, dates of unfitness, practitioner signature, and AHPRA registration number.",
    },
    {
      question: "Can employees get backdated certificates?",
      answer:
        "Certificates can cover absences up to 48 hours prior if clinically appropriate. The doctor makes this determination based on the patient's reported symptoms.",
    },
    {
      question: "How quickly can employees get a certificate?",
      answer:
        "Most certificates are issued in under 30 minutes, available 24/7. This means employees can produce a certificate whenever they need one.",
    },
    {
      question: "Can we set up a corporate account?",
      answer:
        `Contact us at ${CONTACT_EMAIL} to discuss volume arrangements for your organisation.`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-blue-50/30 dark:to-blue-950/10">
          <div className="max-w-3xl mx-auto px-4 text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                For Employers & HR Teams
              </Badge>
              <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-6">
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
        </section>

        {/* Employer logos */}
        <section className="py-12 border-b border-border/30 dark:border-white/10">
          <div className="max-w-5xl mx-auto px-4">
            <p className="text-xs font-medium text-muted-foreground/60 text-center mb-8 uppercase tracking-widest">
              Used by employees at Australia&apos;s leading organisations
            </p>
            <div className="flex flex-wrap justify-center items-center gap-5 md:gap-8">
              {employerLogos.map((logo) => (
                <div key={logo.name} className="flex items-center justify-center rounded-lg bg-white dark:bg-white/90 border border-border/30 dark:border-transparent px-3 py-2 shadow-sm">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={logo.width}
                    height={32}
                    unoptimized
                    style={{ maxWidth: logo.maxWidth }}
                    className="h-7 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
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
                      If valid, you&apos;ll see the certificate details including the patient name, 
                      dates, and issuing doctor. Compare these with the document you received.
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
                  <h3 className="font-semibold text-foreground mb-2">Secure & Tamper-Proof</h3>
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

        {/* Employer's Guide */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Employer Guide
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                An employer&apos;s guide to telehealth medical certificates
              </h2>
            </div>

            <div className="space-y-8">
              {/* 1. Legal standing */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">The legal standing of telehealth certificates</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Since the expansion of telehealth during 2020, the Medical Board of Australia has formally recognised telehealth as a legitimate healthcare delivery method. Certificates issued via telehealth by AHPRA-registered practitioners carry identical legal weight to those from in-person consultations.
                  </p>
                  <p>
                    The Fair Work Act requires &quot;a medical certificate or statutory declaration&quot; as evidence of illness — it does not specify the mode of consultation. Multiple Fair Work Commission decisions have upheld telehealth certificates as valid evidence, and no distinction is drawn between certificates issued following a face-to-face appointment versus a telehealth assessment.
                  </p>
                  <p>
                    For employers, this means a medical certificate from InstantMed carries the same obligations and protections as one from any other registered medical practice in Australia.
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

              {/* 3. Fair Work obligations */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Your obligations under the Fair Work Act</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Employers can request a medical certificate for any period of personal/carer&apos;s leave. However, this must be applied consistently — you cannot require certificates from some employees and not others for the same absence duration. Policies that single out individuals or apply different thresholds may constitute adverse action.
                  </p>
                  <p>
                    You must accept certificates from any registered medical practitioner, not just a specific clinic or your preferred provider. You cannot require the employee to disclose their diagnosis — the certificate confirms unfitness for work, and that is the extent of the information you are entitled to receive. Sick leave policies should be clearly communicated to all employees in advance, ideally in writing.
                  </p>
                </div>
              </div>

              {/* 4. Managing patterns */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Managing sick leave patterns</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    If you are concerned about frequent absences, the appropriate response is a formal performance management process — not challenging individual certificates. Employers can request a medical assessment through an independent medical examiner for ongoing fitness-for-duty concerns, but this is a separate process from standard sick leave and should be handled with legal advice.
                  </p>
                  <p>
                    The Fair Work Ombudsman provides{" "}
                    <a href="https://www.fairwork.gov.au/leave/sick-and-carers-leave" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      detailed guidance
                    </a>{" "}
                    on managing excessive absenteeism within the bounds of the law.
                  </p>
                </div>
              </div>

              {/* 5. Verification */}
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Verification and fraud prevention</h3>
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
                    . We investigate all reports and take fraudulent use seriously.
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

        {/* Employee testimonials */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2 text-center">
              What employees say
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-10">
              Real reviews from employees whose certificates were accepted without issue.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {employeeTestimonials.map((t) => (
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
        <MediaMentions variant="strip" className="bg-muted/30" />
      </main>

      <MarketingFooter />
    </div>
  )
}
