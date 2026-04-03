'use client'

import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Heart,
  Shield,
  Zap,
  Users,
  GraduationCap,
  Clock,
  MapPin,
  BookOpen,
  ClipboardCheck,
} from "lucide-react"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip } from "@/components/marketing"
import { MediaMentions } from "@/components/marketing/media-mentions"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { ComplianceBar } from "@/components/shared/compliance-marquee"
import { CenteredHero } from "@/components/heroes"
import {
  ImageTextSplit,
  FeatureGrid,
  IconChecklist,
  AccordionSection,
  CTABanner,
} from "@/components/sections"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { AboutGuideSection } from "@/components/marketing/sections/about-guide-section"

// =============================================================================
// FAQ DATA
// =============================================================================

const ABOUT_FAQS = [
  {
    q: "What is InstantMed?",
    a: "InstantMed is an Australian telehealth platform that connects patients with AHPRA-registered doctors for medical certificates, repeat prescriptions, and consultations. Everything is handled online through structured clinical forms — no phone calls or video chats required for most requests.",
  },
  {
    q: "Is InstantMed a real medical practice?",
    a: "Yes. InstantMed is operated by registered medical practitioners with AHPRA oversight and Medical Director governance. Certificates and prescriptions issued through InstantMed carry the same legal standing as those from any other medical practice in Australia.",
  },
  {
    q: "Where is InstantMed based?",
    a: "InstantMed is based at Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010. All doctors on the platform are Australian-based and AHPRA-registered.",
  },
  {
    q: "How long has InstantMed been operating?",
    a: "InstantMed was founded to address well-documented gaps in primary care access across Australia — long GP wait times, declining bulk billing, and the inconvenience of clinic visits for straightforward healthcare needs. We are currently in our early operations phase.",
  },
  {
    q: "Who are the doctors behind InstantMed?",
    a: "All doctors on InstantMed are AHPRA-registered Australian medical practitioners with experience in general practice. Our clinical operations are led by a Medical Director who holds Fellowship of the Royal Australian College of General Practitioners (FRACGP).",
  },
  {
    q: "Is InstantMed covered by Medicare?",
    a: "InstantMed service fees are not Medicare rebateable as we are a private telehealth service. However, any medications prescribed through our platform may be eligible for PBS (Pharmaceutical Benefits Scheme) subsidies at your pharmacy.",
  },
  {
    q: "What services does InstantMed offer?",
    a: "We offer medical certificates (for work, university, and carer's leave), repeat prescriptions for stable medications, general consultations, and specialised pathways for hair loss, weight management, and men's and women's health.",
  },
  {
    q: "How does InstantMed protect my privacy?",
    a: "All personal health information is encrypted using AES-256-GCM encryption and stored on Australian servers. We comply with the Privacy Act 1988 and all 13 Australian Privacy Principles. We don't sell or share your data with third parties.",
  },
  {
    q: "Can I use InstantMed from anywhere in Australia?",
    a: "Yes, InstantMed is available Australia-wide. All you need is an internet connection. Our service is available to patients aged 18 and over (parental consent arrangements available for minors).",
  },
  {
    q: "How do I contact InstantMed?",
    a: "You can reach us by email at support@instantmed.com.au, by phone on 0450 722 549, or through our contact page. For complaints, email complaints@instantmed.com.au — we respond within 14 days.",
  },
] as const

export function AboutClient() {
  const faqSchemaItems = ABOUT_FAQS.map((f) => ({
    question: f.q,
    answer: f.a,
  }))

  const accordionGroups = [
    {
      category: "About InstantMed",
      items: ABOUT_FAQS.map((f) => ({ question: f.q, answer: f.a })),
    },
  ] as const

  return (
    <div className="flex min-h-screen flex-col">
      <FAQSchema faqs={faqSchemaItems} />
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <CenteredHero
          pill="About InstantMed"
          title="Healthcare shouldn't be hard"
          subtitle="We connect Australians with AHPRA-registered doctors for medical certificates, prescriptions, and consultations. Fast, simple, legitimate."
        />

        {/* Our Story */}
        <ImageTextSplit
          title="Our Story"
          description="InstantMed was built to make everyday healthcare simpler. We believe getting a medical certificate or renewing a prescription shouldn't require taking half a day off work or sitting in a waiting room when you're already unwell."
          imageSrc="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=800&q=80"
          imageAlt="Modern telehealth consultation"
          imagePosition="left"
        >
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              We asked ourselves: why can&apos;t straightforward healthcare be more accessible? For
              things like medical certificates and repeat prescriptions, there&apos;s a better way — one
              that respects your time without compromising on care.
            </p>
            <p>
              So we built InstantMed. A platform that connects you with real, AHPRA-registered Australian doctors
              who can review your requests quickly and professionally—all without the hassle of phone calls, video
              chats, or waiting rooms.
            </p>
          </div>
        </ImageTextSplit>

        {/* Values */}
        <FeatureGrid
          pill="Our Values"
          title="What we stand for"
          columns={3}
          features={[
            {
              icon: <Zap className="h-5 w-5" />,
              title: "Speed",
              description:
                "We believe healthcare should be fast. Most requests are reviewed within an hour.",
            },
            {
              icon: <Shield className="h-5 w-5" />,
              title: "Trust",
              description:
                "All our doctors are AHPRA-registered and fully licensed to practice in Australia.",
            },
            {
              icon: <Heart className="h-5 w-5" />,
              title: "Accessibility",
              description:
                "Healthcare should be accessible to everyone, regardless of location or schedule.",
            },
          ]}
        />

        {/* Our Doctors */}
        <FeatureGrid
          pill="Real Australian Doctors"
          title="Every request reviewed by a real GP"
          subtitle="There's no algorithm making decisions about your health. Every single request is reviewed by an AHPRA-registered Australian doctor who takes the time to understand your situation."
          columns={3}
          features={[
            {
              icon: <GraduationCap className="h-5 w-5" />,
              title: "AHPRA Verified",
              description:
                "Every doctor is registered with the Australian Health Practitioner Regulation Agency and holds a current medical license.",
            },
            {
              icon: <Clock className="h-5 w-5" />,
              title: "Experienced GPs",
              description:
                "Our doctors have years of clinical experience in Australian general practice. They know what they're doing.",
            },
            {
              icon: <MapPin className="h-5 w-5" />,
              title: "Based in Australia",
              description:
                "Our doctors work from Australia and understand the Australian healthcare system, prescribing guidelines, and patient needs.",
            },
          ]}
        />

        {/* Doctor blockquote */}
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-2xl">
            <blockquote className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
              <p className="text-muted-foreground italic mb-4">
                &ldquo;I review every request as if the patient were sitting in front of me. Just because it&apos;s online doesn&apos;t mean the standard of care is any different. If I have concerns or questions, I follow up. Patient safety always comes first.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-success/20 bg-muted">
                  <Image
                    src="https://api.dicebear.com/7.x/notionists/svg?seed=MedDirector"
                    alt="Our Medical Director"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Our Medical Director</p>
                  <p className="text-xs text-muted-foreground">MBBS FRACGP, AHPRA Registered</p>
                </div>
              </div>
            </blockquote>
          </div>
        </section>

        {/* Doctor Stats */}
        <DoctorCredibility
          variant="inline"
          stats={["experience", "approval", "sameDay", "reviews"]}
          className="max-w-3xl mx-auto px-4 sm:px-6 pb-8"
        />

        {/* Clinical Standards */}
        <FeatureGrid
          pill="Clinical Standards"
          title="How we maintain clinical standards"
          subtitle="Our clinical processes are designed by practising GPs and reviewed regularly."
          columns={2}
          features={[
            {
              icon: <BookOpen className="h-5 w-5" />,
              title: "Guided by RACGP Standards",
              description:
                "Our clinical processes align with the Royal Australian College of General Practitioners guidelines for telehealth and general practice.",
            },
            {
              icon: <ClipboardCheck className="h-5 w-5" />,
              title: "Regular Clinical Audits",
              description:
                "Peer review of clinical decisions ensures consistency and quality. We learn from every case.",
            },
            {
              icon: <Shield className="h-5 w-5" />,
              title: "Clear Scope of Practice",
              description:
                "We focus on what telehealth does well — low-complexity, high-frequency presentations. Complex cases are referred to in-person care.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Medical Director Oversight",
              description:
                "Our Medical Director reviews clinical protocols quarterly and after any significant incident.",
            },
          ]}
        />
        <div className="-mt-12 mb-8 text-center">
          <Link
            href="/clinical-governance"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Learn more about our clinical governance
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Our Team */}
        <IconChecklist
          pill="Our team"
          title="Built by Aussies, for Aussies"
          subtitle="We're a team of healthcare professionals, technologists, and patient advocates who are passionate about making healthcare better."
          columns={2}
          items={[
            {
              text: "AHPRA-Registered Doctors",
              subtext:
                "All our doctors are fully registered with AHPRA and hold valid medical licenses to practice in Australia. You can verify any doctor's registration on the AHPRA website.",
            },
            {
              text: "Australian-Based",
              subtext:
                "Our team and servers are based in Australia, ensuring your data stays local and secure under Australian law.",
            },
            {
              text: "Privacy-First",
              subtext:
                "We use bank-level 256-bit encryption and comply with all Australian Privacy Principles and health records legislation.",
            },
            {
              text: "TGA Compliant",
              subtext:
                "Our telehealth and e-prescribing services comply with Therapeutic Goods Administration regulations.",
            },
          ]}
        />
        <div className="-mt-12 mb-8 text-center">
          <Link
            href="/our-doctors"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Meet our doctors
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Compliance Bar */}
        <ComplianceBar />

        {/* Live Wait Time + Stats */}
        <LiveWaitTime variant="strip" />
        <StatsStrip className="bg-muted/20 border-y border-border/30" />

        {/* Media mentions */}
        <MediaMentions variant="strip" className="bg-muted/30" />

        {/* Tech Stack */}
        <section className="px-4 py-12 border-b border-border/30 dark:border-white/10">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-medium text-muted-foreground/60 text-center mb-8 uppercase tracking-widest">
              Built with
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-6">
              {[
                { name: 'Next.js', logo: '/logos/next.js.png', width: 80, maxWidth: 80 },
                { name: 'Supabase', logo: '/logos/supabase.png', width: 110, maxWidth: 110 },
                { name: 'Vercel', logo: '/logos/vercel.png', width: 80, maxWidth: 80 },
                { name: 'Stripe', logo: '/logos/stripe.png', width: 60, maxWidth: 60 },
                { name: 'Clerk', logo: '/logos/clerk.png', width: 70, maxWidth: 70 },
                { name: 'Anthropic', logo: '/logos/anthropic.png', width: 100, maxWidth: 100 },
                { name: 'Claude', logo: '/logos/claude.png', width: 70, maxWidth: 70 },
                { name: 'eRx', logo: '/logos/eRx.png', width: 50, maxWidth: 50 },
              ].map((tech) => (
                <div key={tech.name} className="flex flex-col items-center gap-2 group">
                  <div className="rounded-xl bg-white dark:bg-card border border-border/40 dark:border-white/10 shadow-sm px-4 py-2.5 flex items-center justify-center transition-shadow group-hover:shadow-md">
                    <Image
                      src={tech.logo}
                      alt={tech.name}
                      width={tech.width}
                      height={32}
                      unoptimized
                      style={{ maxWidth: tech.maxWidth }}
                      className="h-7 w-auto object-contain rounded dark:bg-white/90 dark:p-0.5"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-medium tracking-wide uppercase">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* E-E-A-T Guide */}
        <AboutGuideSection />

        {/* FAQs */}
        <AccordionSection
          pill="FAQs"
          title="Frequently asked questions"
          subtitle="Common questions about InstantMed, our doctors, and how the service works."
          groups={accordionGroups}
        />

        {/* Content Hub Cross-Links — E-E-A-T internal linking from trust page */}
        <section className="px-4 py-8 border-t border-border/30 dark:border-white/10">
          <div className="mx-auto max-w-3xl">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-center">
              Explore our health resources
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
              <Link href="/clinical-governance" className="text-primary hover:underline">
                Clinical governance
              </Link>
              <Link href="/our-doctors" className="text-primary hover:underline">
                Our doctors
              </Link>
              <Link href="/trust" className="text-primary hover:underline">
                Trust &amp; safety
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTABanner
          title="Ready to experience better healthcare?"
          subtitle="Join the Australians who have made the switch to InstantMed."
          ctaText="Start a request"
          ctaHref="/request"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
