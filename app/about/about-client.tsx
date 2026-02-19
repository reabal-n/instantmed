'use client'

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Heart, Shield, Zap, Users, CheckCircle2, Stethoscope, GraduationCap, Clock, MapPin, BookOpen, ClipboardCheck } from "lucide-react"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip } from "@/components/marketing"
import { MediaMentions } from "@/components/marketing/media-mentions"
import { ComplianceBar } from "@/components/shared/compliance-marquee"
import { useReducedMotion } from "framer-motion"
import {
  AnimatedOrbs,
  GlowLine,
  ShimmerButton,
} from "@/components/ui/premium-effects"
import { GridStagger } from "@/components/effects/stagger-container"
import { ParallaxSection } from "@/components/ui/parallax-section"

export function AboutClient() {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <ParallaxSection speed={0.2}>
          <section className="relative px-4 py-12 sm:py-16 lg:py-20 overflow-hidden">
            {/* Animated background orbs */}
            {!prefersReducedMotion && (
              <AnimatedOrbs orbCount={3} className="opacity-40" />
            )}
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4 interactive-pill cursor-default">
                  <Heart className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground/80">About InstantMed</span>
                </div>
                <h1
                  className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Healthcare shouldn&apos;t be hard
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                  We connect Australians with AHPRA-registered doctors for medical certificates, prescriptions, and consultations. Fast, simple, legitimate.
                </p>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Story */}
        <ParallaxSection speed={0.15}>
          <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=800&q=80"
                    alt="Modern telehealth consultation"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Our Story</h2>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      InstantMed was born from frustration. We were tired of waiting weeks for GP appointments, taking
                      half-days off work for simple script renewals, and dealing with the endless paperwork that comes
                      with traditional healthcare.
                    </p>
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
                </div>
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Values */}
        <ParallaxSection speed={0.2}>
          <section className="px-4 py-12 sm:px-6 lg:py-16">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2
                    className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    What we stand for
                  </h2>
                </div>

                <GridStagger columns={3} staggerDelay={0.1} className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      icon: Zap,
                      title: "Speed",
                      description: "We believe healthcare should be fast. Most requests are reviewed within an hour.",
                      color: "primary",
                    },
                    {
                      icon: Shield,
                      title: "Trust",
                      description: "All our doctors are AHPRA-registered and fully licensed to practice in Australia.",
                      color: "#4f46e5",
                    },
                    {
                      icon: Heart,
                      title: "Accessibility",
                      description: "Healthcare should be accessible to everyone, regardless of location or schedule.",
                      color: "#EC4899",
                    },
                  ].map((value) => {
                    const Icon = value.icon
                    return (
                      <div key={value.title} className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover-lift card-warm-hover">
                        <div
                          className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                          style={{
                            background: `linear-gradient(135deg, ${value.color}20, ${value.color}10)`,
                            border: `1px solid ${value.color}30`,
                          }}
                        >
                          <Icon className="h-5 w-5" style={{ color: value.color }} />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{value.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{value.description}</p>
                      </div>
                    )
                  })}
                </GridStagger>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Our Doctors Section */}
        <section className="px-4 py-12 sm:px-6 lg:py-16 bg-emerald-50/50 dark:bg-emerald-950/10">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 mb-4">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Real Australian Doctors</span>
              </div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Every request reviewed by a real GP
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                There&apos;s no algorithm making decisions about your health. Every single request is reviewed by an 
                AHPRA-registered Australian doctor who takes the time to understand your situation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Doctor credentials */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 text-center hover-lift">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">AHPRA Verified</h3>
                <p className="text-sm text-muted-foreground">
                  Every doctor is registered with the Australian Health Practitioner Regulation Agency and holds a current medical license.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 text-center hover-lift">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Experienced GPs</h3>
                <p className="text-sm text-muted-foreground">
                  Our doctors have years of clinical experience in Australian general practice. They know what they&apos;re doing.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 text-center hover-lift">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Based in Australia</h3>
                <p className="text-sm text-muted-foreground">
                  Our doctors work from Australia and understand the Australian healthcare system, prescribing guidelines, and patient needs.
                </p>
              </div>
            </div>

            {/* Doctor quote */}
            <div className="mt-10 max-w-2xl mx-auto">
              <blockquote className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 hover-lift">
                <p className="text-muted-foreground italic mb-4">
                  &ldquo;I review every request as if the patient were sitting in front of me. Just because it&apos;s online doesn&apos;t mean the standard of care is any different. If I have concerns or questions, I follow up. Patient safety always comes first.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-emerald-500/20">
                    <Image 
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face" 
                      alt="Dr. Sarah M. - Medical Director"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Dr. Sarah M.</p>
                    <p className="text-xs text-muted-foreground">Medical Director, MBBS FRACGP</p>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Clinical Standards */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-3 interactive-pill cursor-default">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground/80">Clinical Standards</span>
                </div>
                <h2
                  className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  How we maintain clinical standards
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  Our clinical processes are designed by practising GPs and reviewed regularly.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    Guided by RACGP Standards
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Our clinical processes align with the Royal Australian College of General Practitioners guidelines for telehealth and general practice.
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Regular Clinical Audits
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Peer review of clinical decisions ensures consistency and quality. We learn from every case.
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Clear Scope of Practice
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    We focus on what telehealth does well — low-complexity, high-frequency presentations. Complex cases are referred to in-person care.
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Medical Director Oversight
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Our Medical Director reviews clinical protocols quarterly and after any significant incident.
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/clinical-governance" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  Learn more about our clinical governance
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-3 interactive-pill cursor-default">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground/80">Our team</span>
                </div>
                <h2
                  className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Built by Aussies, for Aussies
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  We&apos;re a team of healthcare professionals, technologists, and patient advocates who are passionate
                  about making healthcare better.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    AHPRA-Registered Doctors
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    All our doctors are fully registered with AHPRA and hold valid medical licenses to practice in
                    Australia. You can verify any doctor&apos;s registration on the AHPRA website.
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Australian-Based
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Our team and servers are based in Australia, ensuring your data stays local and secure under Australian law.
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Privacy-First
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    We use bank-level 256-bit encryption and comply with all Australian Privacy Principles and health records legislation.
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    TGA Compliant
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Our telehealth and e-prescribing services comply with Therapeutic Goods Administration regulations.
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/our-doctors" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  Meet our doctors
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance Bar */}
        <ComplianceBar />

        {/* Live Wait Time + Stats */}
        <LiveWaitTime variant="strip" />
        <StatsStrip className="bg-muted/20 border-y border-border/30" />

        {/* Media mentions */}
        <MediaMentions variant="strip" className="bg-muted/30" />

        {/* CTA */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="glass-card rounded-3xl p-6 lg:p-8">
                <h2
                  className="text-2xl font-bold tracking-tight sm:text-3xl mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ready to experience better healthcare?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Join the Australians who have made the switch to InstantMed.
                </p>
                <Link href="/request">
                  <ShimmerButton className="px-8 h-12 font-semibold">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </ShimmerButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
