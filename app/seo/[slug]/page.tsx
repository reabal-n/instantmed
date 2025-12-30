import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Clock, Shield } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// SEO Landing Page Configuration
const seoPages: Record<
  string,
  {
    title: string
    h1: string
    description: string
    keywords: string[]
    ctaHref: string
    ctaText: string
    faqs: { q: string; a: string }[]
    relatedLinks: { href: string; text: string }[]
  }
> = {
  "medical-certificate-for-work": {
    title: "Medical Certificate for Work Online | Same Day | InstantMed",
    h1: "Get a Medical Certificate for Work Online",
    description:
      "Need a medical certificate for work? Get a valid doctor's certificate online in under 1 hour. Accepted by Australian employers. No appointments needed.",
    keywords: ["medical certificate for work", "work sick certificate online", "employer medical certificate"],
    ctaHref: "/medical-certificate/request?reason=work",
    ctaText: "Get Certificate for Work",
    faqs: [
      {
        q: "Will my employer accept an online medical certificate?",
        a: "Yes. Online medical certificates issued by AHPRA-registered doctors are legally valid and accepted by Australian employers.",
      },
      {
        q: "How quickly can I get a medical certificate for work?",
        a: "Most certificates are issued within 1 hour during business hours (8am-10pm AEST).",
      },
      {
        q: "Can I get a backdated medical certificate?",
        a: "Doctors can only certify illness they've assessed. Same-day or next-day backdating may be possible if clinically appropriate.",
      },
    ],
    relatedLinks: [
      { href: "/medical-certificate", text: "All Medical Certificates" },
      { href: "/seo/medical-certificate-for-uni", text: "Medical Certificate for Uni" },
    ],
  },
  "medical-certificate-for-uni": {
    title: "Medical Certificate for University Online | InstantMed",
    h1: "Medical Certificate for University & Exams",
    description:
      "Get a medical certificate for university special consideration or missed exams. Valid for all Australian universities. Quick online process.",
    keywords: ["medical certificate for uni", "university sick certificate", "special consideration certificate"],
    ctaHref: "/medical-certificate/request?reason=uni",
    ctaText: "Get Certificate for Uni",
    faqs: [
      {
        q: "Will my university accept this certificate?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and accepted by all Australian universities for special consideration applications.",
      },
      {
        q: "Can I use this for a missed exam?",
        a: "Yes. The certificate states the dates you were unfit to attend class or sit exams.",
      },
    ],
    relatedLinks: [
      { href: "/medical-certificate", text: "All Medical Certificates" },
      { href: "/seo/medical-certificate-for-work", text: "Medical Certificate for Work" },
    ],
  },
  "repeat-blood-pressure-medication": {
    title: "Repeat Blood Pressure Medication Online | InstantMed",
    h1: "Get Your Blood Pressure Medication Renewed Online",
    description:
      "Need a repeat script for your blood pressure medication? Get it reviewed and renewed online by an Australian doctor. E-script sent to your phone.",
    keywords: ["blood pressure medication online", "repeat blood pressure script", "hypertension medication refill"],
    ctaHref: "/prescriptions/request?medication=blood-pressure",
    ctaText: "Request Repeat Script",
    faqs: [
      {
        q: "Can I get my blood pressure medication renewed online?",
        a: "Yes, if you&apos;re on a stable dose and your BP is well-controlled. The doctor may request recent BP readings.",
      },
      {
        q: "What information do I need?",
        a: "Your current medication name and dose, how long you&apos;ve been taking it, and recent blood pressure readings if available.",
      },
    ],
    relatedLinks: [
      { href: "/prescriptions", text: "All Prescriptions" },
    ],
  },
  "uti-treatment-online": {
    title: "UTI Treatment Online Australia | Same Day | InstantMed",
    h1: "Get UTI Treatment Online — Fast Relief",
    description:
      "Burning when you pee? Get assessed and treated for a urinary tract infection online. Antibiotics prescribed same-day if appropriate.",
    keywords: ["UTI treatment online", "urinary tract infection online doctor", "UTI antibiotics online australia"],
    ctaHref: "/womens-health?condition=uti",
    ctaText: "Get UTI Treatment",
    faqs: [
      {
        q: "Can you prescribe antibiotics for a UTI online?",
        a: "Yes, if your symptoms are consistent with a straightforward UTI and you don&apos;t have any red flags requiring in-person assessment.",
      },
      {
        q: "How quickly can I get treatment?",
        a: "Most UTI consultations are reviewed within 30 minutes. If antibiotics are prescribed, you'll receive an e-script immediately.",
      },
    ],
    relatedLinks: [
      { href: "/womens-health", text: "Women's Health" },
    ],
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = seoPages[slug]
  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://instantmed.com.au/seo/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/seo/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(seoPages).map((slug) => ({ slug }))
}

export default async function SEOLandingPage({ params }: PageProps) {
  const { slug } = await params
  const page = seoPages[slug]

  if (!page) {
    notFound()
  }

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex min-h-screen flex-col bg-hero">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-24">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {page.h1}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8">{page.description}</p>

              <Link href={page.ctaHref}>
                <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                  {page.ctaText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#00E2B5]" />
                  <span>Usually under 1 hour</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#00E2B5]" />
                  <span>AHPRA-registered doctors</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                  <span>Legally valid</span>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 bg-mesh">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-xl font-bold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {page.faqs.map((faq, index) => (
                  <div key={index} className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Related Links */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-lg font-semibold text-center mb-4">Related Services</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {page.relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm text-[#00E2B5] hover:underline">
                    {link.text} →
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
