import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL, PRICING } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import {
  Building2,
  Search,
  Shield,
  CheckCircle,
  Mail,
  ArrowRight,
  HelpCircle,
} from "lucide-react"
import { ContentPageTracker } from "@/components/analytics/content-page-tracker"

const EMPLOYER_DATA: Record<string, { name: string; logo: string; logoWidth: number; industry: string }> = {
  woolworths:       { name: "Woolworths",         logo: "/logos/woolworths.png",        logoWidth: 120, industry: "retail" },
  coles:            { name: "Coles",              logo: "/logos/coles.png",             logoWidth: 100, industry: "retail" },
  telstra:          { name: "Telstra",            logo: "/logos/telstra.png",           logoWidth: 110, industry: "telecommunications" },
  "commonwealth-bank": { name: "Commonwealth Bank", logo: "/logos/commonwealthbank.png", logoWidth: 80,  industry: "banking" },
  anz:              { name: "ANZ",                logo: "/logos/ANZ.png",               logoWidth: 90,  industry: "banking" },
  westpac:          { name: "Westpac",            logo: "/logos/westpac.png",           logoWidth: 110, industry: "banking" },
  nab:              { name: "NAB",                logo: "/logos/nab.png",               logoWidth: 90,  industry: "banking" },
  amazon:           { name: "Amazon",             logo: "/logos/amazon.png",            logoWidth: 120, industry: "technology" },
  bhp:              { name: "BHP",                logo: "/logos/BHP.png",               logoWidth: 80,  industry: "mining" },
  bunnings:         { name: "Bunnings",           logo: "/logos/bunnings.png",          logoWidth: 120, industry: "retail" },
  "jb-hi-fi":       { name: "JB Hi-Fi",          logo: "/logos/jbhifi.png",            logoWidth: 100, industry: "retail" },
  mcdonalds:        { name: "McDonald's",         logo: "/logos/mcdonalds.png",         logoWidth: 60,  industry: "hospitality" },
  "sonic-healthcare": { name: "Sonic Healthcare", logo: "/logos/sonichealthcare.png",   logoWidth: 140, industry: "healthcare" },
  qantas:           { name: "Qantas",             logo: "/logos/qantas.svg",            logoWidth: 110, industry: "aviation" },
  deloitte:         { name: "Deloitte",           logo: "/logos/deloitte.svg",          logoWidth: 110, industry: "consulting" },
  pwc:              { name: "PwC",                logo: "/logos/pwc.svg",               logoWidth: 80,  industry: "consulting" },
  kpmg:             { name: "KPMG",               logo: "/logos/kpmg.svg",              logoWidth: 90,  industry: "consulting" },
  bupa:             { name: "Bupa",               logo: "/logos/bupa.svg",              logoWidth: 90,  industry: "health insurance" },
}

export function generateStaticParams() {
  return Object.keys(EMPLOYER_DATA).map((company) => ({ company }))
}

export async function generateMetadata({ params }: { params: Promise<{ company: string }> }): Promise<Metadata> {
  const { company } = await params
  const employer = EMPLOYER_DATA[company]
  if (!employer) return {}

  return {
    title: `Verify Medical Certificates | ${employer.name} Employees`,
    description: `${employer.name} employees and HR teams can verify InstantMed medical certificates instantly. AHPRA-registered doctors, accepted by all Australian employers.`,
    openGraph: {
      title: `Verify Medical Certificates | ${employer.name}`,
      description: `How ${employer.name} HR teams verify InstantMed medical certificates.`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/for/employers/${company}`,
    },
  }
}

function getFaqs(name: string) {
  return [
    {
      question: `Does ${name} accept online medical certificates?`,
      answer: `Yes. ${name}, like all Australian employers, must accept medical certificates from AHPRA-registered doctors under the Fair Work Act. InstantMed certificates meet all legal requirements.`,
    },
    {
      question: `How do I verify an InstantMed certificate from a ${name} employee?`,
      answer: "Enter the unique verification code at instantmed.com.au/verify. You'll see the patient name, dates, and issuing doctor's details. Compare with the document you received.",
    },
    {
      question: `Are telehealth certificates the same as GP certificates for ${name}?`,
      answer: "Yes. The Medical Board of Australia recognises telehealth as a legitimate healthcare delivery method. Certificates issued via telehealth carry identical legal weight.",
    },
    {
      question: "What if the certificate doesn't verify?",
      answer: `Contact us at ${CONTACT_EMAIL}. We investigate all reports of unverifiable certificates and cooperate with workplace investigations.`,
    },
  ]
}

export default async function EmployerCompanyPage({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params
  const employer = EMPLOYER_DATA[company]
  if (!employer) notFound()

  const faqs = getFaqs(employer.name)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }

  // #2 — Breadcrumb schema for SERP breadcrumbs
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://instantmed.com.au" },
      { "@type": "ListItem", position: 2, name: "For Employers", item: "https://instantmed.com.au/for/employers" },
      { "@type": "ListItem", position: 3, name: employer.name, item: `https://instantmed.com.au/for/employers/${company}` },
    ],
  }

  // #4 — Cross-links to other employer pages
  const otherEmployers = Object.entries(EMPLOYER_DATA)
    .filter(([slug]) => slug !== company)
    .slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col">
      <script id="faq-schema" type="application/ld+json"
        suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script id="breadcrumb-schema" type="application/ld+json"
        suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <Navbar variant="marketing" />
      {/* #11 — PostHog tracking for employer company pages */}
      <ContentPageTracker pageType="employer" slug={company} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-blue-50/30 dark:to-blue-950/10">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              For {employer.name} Employees & HR
            </Badge>

            <div className="flex justify-center mb-6">
              <div className="rounded-xl bg-white dark:bg-white/90 border border-border/30 dark:border-transparent px-6 py-3 shadow-sm">
                <Image
                  src={employer.logo}
                  alt={employer.name}
                  width={employer.logoWidth}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-4">
              Verifying Medical Certificates{" "}
              <span className="text-primary">for {employer.name}</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              InstantMed medical certificates are accepted by {employer.name} and all Australian employers.
              Verify any certificate instantly using our secure portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/verify">
                  <Search className="w-4 h-4 mr-2" />
                  Verify a Certificate
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent">
                <Link href="/for/employers">
                  Learn More for Employers
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Key facts */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
              What {employer.name} HR teams need to know
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-card rounded-2xl border p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">Legally Valid</h3>
                <p className="text-xs text-muted-foreground">
                  Issued by AHPRA-registered doctors. Same legal standing as in-person GP certificates under the Fair Work Act.
                </p>
              </div>
              <div className="bg-card rounded-2xl border p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">Instant Verification</h3>
                <p className="text-xs text-muted-foreground">
                  Every certificate has a unique code and QR code. Verify authenticity in seconds at instantmed.com.au/verify.
                </p>
              </div>
              <div className="bg-card rounded-2xl border p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">Tamper-Proof</h3>
                <p className="text-xs text-muted-foreground">
                  Digital certificates with unique IDs. Our system detects any alterations or duplications automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* #6 — Company-specific FAQs */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
              <HelpCircle className="w-5 h-5 inline mr-2" />
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

        {/* #5 — Internal link back to med cert landing */}
        <section className="py-12 border-t border-border/30">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {employer.name} employees can get a medical certificate from ${PRICING.MED_CERT.toFixed(2)} — no appointment needed.
            </p>
            <Button asChild variant="outline" className="rounded-full bg-transparent">
              <Link href="/medical-certificate">
                Get a Certificate Accepted by {employer.name}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        {/* #4 — Cross-links to other employer pages */}
        <section className="py-12 border-t border-border/30">
          <div className="max-w-3xl mx-auto px-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 text-center mb-6">
              Other organisations
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {otherEmployers.map(([slug, data]) => (
                <Link
                  key={slug}
                  href={`/for/employers/${slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {data.name}
                </Link>
              ))}
              <Link
                href="/for/employers"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary font-medium hover:bg-primary/10 transition-colors"
              >
                View all employers
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Need help verifying a certificate?
            </h2>
            <p className="text-muted-foreground mb-6">
              Our team can assist with bulk verification or questions about specific certificates.
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
      </main>

      <MarketingFooter />
    </div>
  )
}
