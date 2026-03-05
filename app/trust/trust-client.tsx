'use client'

import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import {
  UserCheck,
  Lock,
  CheckCircle2,
  Star,
  ArrowRight,
  FileCheck,
  Send,
  Phone,
  Scale,
  ShieldCheck,
  Fingerprint,
  ServerCog,
  Eye,
} from "lucide-react"
import { usePatientCount, SOCIAL_PROOF } from "@/lib/social-proof"
import { getFeaturedTestimonials } from "@/lib/data/testimonials"
import NumberFlow from "@number-flow/react"
import { useSyncExternalStore } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

// Morning Canvas components
import { SplitHero } from "@/components/heroes"
import {
  StatStrip,
  ImageTextSplit,
  FeatureGrid,
  Timeline,
  AccordionSection,
  CTABanner,
} from "@/components/sections"

// ─── Hydration helper ──────────────────────────────────────────────

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

// ─── Data ──────────────────────────────────────────────────────────

const trustFAQs = [
  {
    question: "How do I know the doctors are real?",
    answer: "Every doctor on InstantMed holds current AHPRA registration — the same regulatory body that governs all Australian medical practitioners. You can verify any doctor's credentials yourself on the AHPRA public register.",
  },
  {
    question: "Will my employer accept certificates from InstantMed?",
    answer: "Yes. Our medical certificates are issued by AHPRA-registered Australian doctors and are legally equivalent to certificates from any in-person clinic. They include the doctor's name, registration number, and all required details.",
  },
  {
    question: "What happens to my personal health information?",
    answer: "Your data is protected with AES-256 encryption and stored exclusively on Australian servers. We comply with the Privacy Act 1988 and all thirteen Australian Privacy Principles.",
  },
  {
    question: "Is this actually reviewed by a doctor, or is it automated?",
    answer: "Every single request is reviewed by a qualified, AHPRA-registered Australian doctor who makes an independent clinical decision. There are no automated approvals — ever.",
  },
  {
    question: "What if I'm not happy with the service?",
    answer: "We respond to complaints within 48 hours and offer a full refund if we can't help you. You can also escalate concerns to the Health Complaints Commissioner in your state.",
  },
  {
    question: "Are electronic prescriptions legitimate?",
    answer: "Yes. Our eScripts are generated through official PBS channels and work at any Australian pharmacy. Electronic prescriptions are the national standard and fully compliant with the Therapeutic Goods Act.",
  },
]

// Rotate which 6 of 8 featured testimonials are shown, based on day-of-week.
const allFeatured = getFeaturedTestimonials()
const dayOffset = new Date().getDay() % Math.max(allFeatured.length - 5, 1)
const testimonials = [
  ...allFeatured.slice(dayOffset),
  ...allFeatured.slice(0, dayOffset),
].slice(0, 6)

// ─── Animation variants ────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

// ─── Page ──────────────────────────────────────────────────────────

export default function TrustPage() {
  const mounted = useHasMounted()
  const patientCount = usePatientCount()

  return (
    <div className="min-h-screen">
      <Navbar variant="marketing" />

      <main id="main-content" aria-label="Trust and safety information">
        {/* ── Hero ──────────────────────────────────────────── */}
        <SplitHero
          pill="Trust & Safety"
          title="Your health. Our responsibility."
          highlightWords={["responsibility"]}
          subtitle="Real doctors. Transparent process. Every request reviewed by a qualified, AHPRA-registered clinician."
          imageSrc="/images/trust-hero.jpeg"
          imageAlt="Patient requesting a medical certificate from home"
        >
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground/80 tracking-wide uppercase">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            100% Australian-based · AHPRA registered · Privacy Act compliant
          </p>
        </SplitHero>

        {/* ── Stats Counter Strip ───────────────────────────── */}
        <StatStrip
          stats={[
            { value: mounted ? patientCount : 2400, suffix: "+", label: "Patients served" },
            { value: mounted ? SOCIAL_PROOF.averageRating * 10 : 49, suffix: "", label: "Average rating", prefix: "" },
            { value: mounted ? SOCIAL_PROOF.averageResponseMinutes : 34, suffix: " min", label: "Avg response" },
            { value: mounted ? SOCIAL_PROOF.operatingDays : 7, suffix: " days/wk", label: "Available" },
          ]}
        />

        {/* ── Doctor Verification ──────────────────────────── */}
        <ImageTextSplit
          title="AHPRA-registered doctors. No exceptions."
          highlightWords={["AHPRA-registered"]}
          description="Every doctor on InstantMed holds current registration with the Australian Health Practitioner Regulation Agency. We verify credentials before they join and monitor registration status continuously."
          imageSrc="/images/trust-doctor.jpeg"
          imageAlt="Doctor reviewing a patient request at their desk"
          imagePosition="right"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "All doctors hold current AHPRA registration",
              "Professional indemnity insurance required",
              "Regular clinical decision audits",
              "Doctors make independent clinical decisions",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm text-foreground/80 dark:text-foreground/70"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/clinical-governance"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Our clinical governance
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ImageTextSplit>

        {/* ── Data Protection ──────────────────────────────── */}
        <ImageTextSplit
          title="Your data stays in Australia. Always encrypted."
          highlightWords={["encrypted"]}
          description="Your health information is protected with AES-256 encryption — the same standard used by banks. All data stored on Australian servers, fully compliant with the Privacy Act 1988."
          imageSrc="/images/trust-security.jpeg"
          imageAlt="Secure data center with blue lighting"
          imagePosition="left"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "AES-256 encryption for all health data",
              "Stored exclusively on Australian servers",
              "Compliant with all 13 Australian Privacy Principles",
              "Regular security audits and penetration testing",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm text-foreground/80 dark:text-foreground/70"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Privacy policy
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ImageTextSplit>

        {/* ── Security Features Grid ───────────────────────── */}
        <FeatureGrid
          pill="Security"
          title="Built for trust at every layer"
          subtitle="Enterprise-grade security protecting your health information."
          highlightWords={["trust"]}
          features={[
            {
              icon: <Lock className="w-6 h-6" />,
              title: "AES-256 Encryption",
              description: "Bank-grade encryption for all personal health information at rest and in transit.",
            },
            {
              icon: <ShieldCheck className="w-6 h-6" />,
              title: "Privacy Act Compliant",
              description: "Full compliance with the Privacy Act 1988 and all 13 Australian Privacy Principles.",
            },
            {
              icon: <Fingerprint className="w-6 h-6" />,
              title: "AHPRA Verified",
              description: "Every doctor's registration is verified and continuously monitored.",
            },
            {
              icon: <ServerCog className="w-6 h-6" />,
              title: "Australian Servers",
              description: "All health data stored exclusively on Australian-based servers.",
            },
            {
              icon: <Eye className="w-6 h-6" />,
              title: "Clinical Audits",
              description: "Regular audits of clinical decisions to maintain the highest standards.",
            },
            {
              icon: <Scale className="w-6 h-6" />,
              title: "Complaints Process",
              description: "48-hour response guarantee. Escalation to Health Complaints Commissioner available.",
            },
          ]}
          columns={3}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── Accountability ───────────────────────────────── */}
        <ImageTextSplit
          title="Clear process. No automated approvals."
          highlightWords={["No automated"]}
          description="Every request is reviewed by a human doctor who reads your full medical history and makes an independent clinical decision. If something doesn't look right, they'll contact you directly."
          imageSrc=""
          imageAlt=""
          imagePosition="right"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "Every request is human-reviewed",
              "Complaints responded to within 48 hours",
              "Full refund if we can't help",
              "Escalation to Health Complaints Commissioner",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm text-foreground/80 dark:text-foreground/70"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Contact us
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ImageTextSplit>

        {/* ── Process Timeline ──────────────────────────────── */}
        <Timeline
          pill="Behind the scenes"
          title="What happens with your request"
          subtitle="Complete transparency on how your request is handled."
          highlightWords={["transparency"]}
          steps={[
            {
              title: "You submit your request",
              description: "Answer a few questions about your situation. Takes about 2 minutes.",
              icon: <FileCheck className="w-5 h-5" />,
            },
            {
              title: "Request enters review queue",
              description: "Securely transmitted and queued for doctor review.",
              icon: <Send className="w-5 h-5" />,
            },
            {
              title: "Doctor reviews your case",
              description: "An AHPRA-registered doctor reviews your full submission. Average ~34 min.",
              icon: <UserCheck className="w-5 h-5" />,
            },
            {
              title: "Personal follow-up",
              description: "The doctor may approve, request more info, or contact you directly.",
              icon: <Phone className="w-5 h-5" />,
            },
            {
              title: "Document delivered",
              description: "Certificates emailed to your dashboard. eScripts sent via SMS.",
              icon: <Send className="w-5 h-5" />,
            },
          ]}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── Testimonials ──────────────────────────────────── */}
        <TestimonialSection patientCount={patientCount} mounted={mounted} />

        {/* ── Trust FAQ ─────────────────────────────────────── */}
        <AccordionSection
          pill="Questions"
          title="Common questions about trust"
          subtitle="We understand you want to be sure."
          highlightWords={["trust"]}
          groups={[{ items: trustFAQs }]}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── CTA ───────────────────────────────────────────── */}
        <CTABanner
          title="Confident in the process?"
          subtitle={`Join ${mounted ? patientCount.toLocaleString() : "2,400"}+ Australians who've already made the switch.`}
          ctaText="Start a request"
          ctaHref="/request"
          secondaryText="No account required · Pay only after doctor review"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}

// ─── Testimonial Section ──────────────────────────────────────────

function TestimonialSection({ patientCount, mounted: _mounted }: { patientCount: number; mounted: boolean }) {
  const shouldReduce = useReducedMotion()

  return (
    <section aria-label="Patient reviews" className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={shouldReduce ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="text-center mb-14"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-center gap-1 mb-4"
          >
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-5 h-5 fill-amber-400 text-amber-400"
              />
            ))}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            What patients say
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-muted-foreground text-lg"
          >
            Real feedback from{" "}
            <NumberFlow
              value={patientCount}
              format={{ notation: "compact", maximumFractionDigits: 1 }}
              className="font-medium text-foreground"
            />
            + patients across Australia.
          </motion.p>
        </motion.div>

        <TestimonialGrid />

        <motion.div
          initial={shouldReduce ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
          >
            View all reviews
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Testimonial Grid (staggered) ──────────────────────────────────

function TestimonialGrid() {
  const shouldReduce = useReducedMotion()

  const leftCol = testimonials.filter((_, i) => i % 2 === 0)
  const rightCol = testimonials.filter((_, i) => i % 2 !== 0)

  return (
    <motion.div
      initial={shouldReduce ? undefined : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className="grid md:grid-cols-2 gap-5"
    >
      <div className="space-y-5">
        {leftCol.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>
      <div className="space-y-5 md:pt-10">
        {rightCol.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>
    </motion.div>
  )
}

function TestimonialCard({
  testimonial: t,
}: {
  testimonial: ReturnType<typeof getFeaturedTestimonials>[number]
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2, transition: { duration: 0.25, ease: "easeOut" } }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "rounded-2xl p-6 sm:p-7",
        "bg-card border border-border/50",
        "hover:border-border hover:shadow-md hover:shadow-primary/5",
        "transition-[border-color,box-shadow] duration-200",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-0.5">
          {[...Array(t.rating)].map((_, i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <span className="text-[0.6875rem] font-medium text-muted-foreground/70 bg-muted/50 dark:bg-muted/30 rounded-full px-2.5 py-0.5">
          {t.service === "medical-certificate"
            ? "Med Cert"
            : t.service === "prescription"
              ? "Prescription"
              : "Consultation"}
        </span>
      </div>

      <p className="text-foreground/90 leading-relaxed">&ldquo;{t.text}&rdquo;</p>

      <div className="mt-5 flex items-center gap-3">
        {t.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.image}
            alt={t.name}
            width={36}
            height={36}
            loading="lazy"
            className="w-9 h-9 rounded-full bg-muted"
          />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">
            {t.location}
            {t.role && ` · ${t.role}`}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
