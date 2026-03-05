'use client'

import Link from "next/link"
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
import { ComplianceBar } from "@/components/shared/compliance-marquee"
import { CenteredHero } from "@/components/heroes"
import {
  ImageTextSplit,
  FeatureGrid,
  IconChecklist,
  CTABanner,
} from "@/components/sections"

export function AboutClient() {
  return (
    <div className="flex min-h-screen flex-col">
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
          description="InstantMed was born from frustration. We were tired of waiting weeks for GP appointments, taking half-days off work for simple script renewals, and dealing with the endless paperwork that comes with traditional healthcare."
          imageSrc="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=800&q=80"
          imageAlt="Modern telehealth consultation"
          imagePosition="left"
        >
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              We asked ourselves: why can&apos;t getting a medical certificate or prescription be as simple as
              ordering food online? Why do you need to sit in a waiting room for 45 minutes when a doctor can
              review your request in minutes?
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
            <blockquote className="rounded-2xl border border-border/50 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-6">
              <p className="text-muted-foreground italic mb-4">
                &ldquo;I review every request as if the patient were sitting in front of me. Just because it&apos;s online doesn&apos;t mean the standard of care is any different. If I have concerns or questions, I follow up. Patient safety always comes first.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-success/20 bg-muted">
                  <img
                    src="https://api.dicebear.com/7.x/notionists/svg?seed=MedDirector"
                    alt="Our Medical Director"
                    className="w-full h-full object-cover"
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
