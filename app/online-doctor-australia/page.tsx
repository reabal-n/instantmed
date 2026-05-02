import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Pill,
  Shield,
  Stethoscope,
  XCircle,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { BreadcrumbSchema, FAQSchema } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getAllStateSlugs, statesData } from "@/lib/seo/data/states"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

// ============================================================================
// METADATA - head-term pillar for "online doctor australia"
// ============================================================================

const CANONICAL = "https://instantmed.com.au/online-doctor-australia"

export const metadata: Metadata = {
  title: "Online Doctor Australia | AHPRA-Registered GPs",
  description: `See an online doctor in Australia without the waiting room. AHPRA-registered GPs review medical certificates, prescriptions, and consultations online. ${PRICING_DISPLAY.FROM_MED_CERT}, 24/7 for med cert submissions, 8am\u201310pm AEST for Rx and consults.`,
  keywords: [
    "online doctor australia",
    "online doctor au",
    "online gp australia",
    "see a doctor online australia",
    "australian online doctor",
    "online doctor consultation australia",
    "online medical certificate australia",
    "online prescription australia",
    "online doctor same day",
    "online doctor no appointment",
  ],
  openGraph: {
    title: "Online Doctor Australia - AHPRA-Registered GPs | InstantMed",
    description: `See an Australian online doctor without leaving home. Med certs, repeat prescriptions, and consultations reviewed by AHPRA-registered GPs. Doctor-reviewed pathway from ${PRICING_DISPLAY.MED_CERT}.`,
    url: CANONICAL,
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Doctor Australia | InstantMed",
    description:
      "AHPRA-registered online GPs. Medical certificates, prescriptions, consultations - reviewed online.",
  },
  alternates: { canonical: CANONICAL },
}

// ============================================================================
// CONTENT
// ============================================================================

const STATS = [
  { value: "AHPRA", label: "Registered GPs", context: "Every review by an Australian-registered doctor" },
  { value: "24/7", label: "Med cert submission", context: "Doctor review follows when available" },
  { value: "24/7", label: "Med cert availability", context: "Rx + consults 8am–10pm AEST" },
  { value: `${PRICING_DISPLAY.MED_CERT}`, label: "From", context: "Full refund if we can't help" },
]

const SERVICES = [
  {
    icon: FileText,
    title: "Medical certificates",
    body: "Valid for employers, universities, and Centrelink. Doctor-reviewed pathway, accepted under the Fair Work Act 2009.",
    href: "/medical-certificate",
    cta: "Request a medical certificate",
    priceLabel: `From ${PRICING_DISPLAY.MED_CERT}`,
  },
  {
    icon: Pill,
    title: "Prescriptions & repeats",
    body: "eScripts for common ongoing medications reviewed by an AHPRA-registered doctor and sent to your phone.",
    href: "/prescriptions",
    cta: "Request a prescription",
    priceLabel: `From ${PRICING_DISPLAY.REPEAT_SCRIPT}`,
  },
  {
    icon: Stethoscope,
    title: "Online GP consultations",
    body: "Discuss a new symptom, ongoing concern, or get a treatment plan - async written review by an Australian GP.",
    href: "/consult",
    cta: "Book an online consultation",
    priceLabel: `From ${PRICING_DISPLAY.CONSULT}`,
  },
]

const FAQS = [
  {
    question: "Is InstantMed a real doctor or an AI?",
    answer:
      "Every request is clinically reviewed by an AHPRA-registered Australian doctor. We use software to handle intake, triage, and delivery, but the clinical decision - whether to issue a certificate, approve a prescription, or decline - is always made by a human GP. No AI prescribes medication or issues certificates.",
  },
  {
    question: "Are InstantMed's doctors registered with AHPRA?",
    answer:
      "Yes. Every doctor reviewing requests on InstantMed holds current general registration with the Australian Health Practitioner Regulation Agency (AHPRA) and practises under RACGP-aligned clinical protocols. You can verify any Australian doctor on the public AHPRA register at ahpra.gov.au/Registration.",
  },
  {
    question: "Can I see an online doctor without a Medicare card?",
    answer:
      "Yes for medical certificates - Medicare is not required. Prescriptions and consultations generally require a Medicare number or Individual Healthcare Identifier (IHI) for eScript compliance and to meet PBS and TGA prescribing requirements. If you're an Australian resident without a Medicare card, contact us and we'll walk you through the options.",
  },
  {
    question: "Is InstantMed covered by Medicare or bulk-billed?",
    answer:
      "No. InstantMed is a private telehealth service, not a Medicare-subsidised one. There is no Medicare rebate and no bulk-billing. That also means no Medicare-card lottery for med certs, no 45-minute wait for a 6-minute bulk-billed appointment, and flat pricing regardless of your location or postcode.",
  },
  {
    question: "What can an online doctor actually prescribe in Australia?",
    answer:
      "Under TGA telehealth prescribing rules, Australian online doctors can prescribe Schedule 2, 3, and 4 medications where clinically appropriate - think antibiotics, contraception, asthma preventers, antihypertensives, PPIs, and most ongoing medications. Schedule 8 controlled substances (strong opioids, benzodiazepines, stimulants) cannot be prescribed via telehealth on a first-contact basis and are blocked at our intake.",
  },
  {
    question: "How fast will I actually hear back from the doctor?",
    answer:
      "Requests can be submitted any time. Doctor review timing depends on availability, case complexity, and whether follow-up questions are needed. We don't publish a customer-facing SLA guarantee, and you'll receive an email when your request has been reviewed.",
  },
  {
    question: "Can I use an online doctor for my children?",
    answer:
      "Our service is built for patients aged 18 and over. Minors can use InstantMed only with written consent from a parent or legal guardian who completes the request on their behalf. For infants, toddlers, or any situation requiring physical examination (persistent fever, rashes of concern, head injuries, breathing problems), please see an in-person GP or visit an emergency department.",
  },
  {
    question: "When should I avoid an online doctor and go in person instead?",
    answer:
      "Online GPs are great for straightforward conditions where clinical decisions can be made from history alone - med certs, repeat scripts on stable medication, uncomplicated infections, mental health check-ins. They're not appropriate for chest pain, shortness of breath, severe abdominal pain, suspected stroke, pregnancy complications, trauma, or anything else needing a physical exam or urgent imaging. In those cases, call 000 or go to your nearest emergency department.",
  },
]

// JSON-LD - MedicalBusiness, Breadcrumb, FAQPage
const medicalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "@id": `${CANONICAL}#business`,
  name: "InstantMed - Online Doctor Australia",
  description:
    "Australian telehealth platform connecting patients to AHPRA-registered doctors for medical certificates, prescriptions, and online consultations nationwide.",
  url: CANONICAL,
  logo: "https://instantmed.com.au/branding/logo.png",
  image: "https://instantmed.com.au/branding/logo.png",
  telephone: "+61-450-722-549",
  areaServed: {
    "@type": "Country",
    name: "Australia",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Level 1/457-459 Elizabeth Street",
    addressLocality: "Surry Hills",
    addressRegion: "NSW",
    postalCode: "2010",
    addressCountry: "AU",
  },
  priceRange: PRICING_DISPLAY.RANGE,
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
      description:
        "Medical certificates available 24/7. Prescription and consultation reviews 08:00–22:00 AEST.",
    },
  ],
  medicalSpecialty: "General Practice",
  isAcceptingNewPatients: true,
}

// ============================================================================
// PAGE
// ============================================================================

export default function OnlineDoctorAustraliaPage() {
  const stateSlugs = getAllStateSlugs()

  return (
    <>
      <script
        id="online-doctor-australia-business-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(medicalBusinessSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Online Doctor Australia", url: CANONICAL },
        ]}
      />
      <FAQSchema faqs={FAQS} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* ─────────────── Hero ─────────────── */}
          <section className="px-4 py-14 sm:py-20 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6">
                <SectionPill>Australia-wide · AHPRA registered</SectionPill>
              </div>
              <Heading level="display" className="mb-4">
                Online doctor in Australia - reviewed by AHPRA-registered GPs
              </Heading>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                Medical certificates, repeat prescriptions, and consultations reviewed by
                Australian-registered doctors. No appointments, no waiting rooms. Every
                request goes to a real GP - not an algorithm.
              </p>

              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 bg-transparent"
                >
                  <Link href="/medical-certificate">See medical certificates</Link>
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  AHPRA-registered doctors
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Doctor-reviewed med certs
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Every Australian postcode
                </span>
              </div>
            </div>
          </section>

          {/* Page superpower — anchors the "AHPRA-registered, no algorithm"
              promise above the stats so the stats reinforce the claim. */}
          <ServiceClaimSection
            eyebrow="Real GPs, not chatbots"
            headline={
              <>
                Every request reviewed by an <span className="text-primary">AHPRA-registered Australian GP</span>.
              </>
            }
            body="No AI prescribes. No algorithm declines. The clinical decision is always made by a human Australian doctor whose registration you can verify on ahpra.gov.au."
          />

          {/* ─────────────── Stats ─────────────── */}
          <section className="px-4 py-10 bg-white dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-5 shadow-md shadow-primary/[0.06] dark:shadow-none text-center"
                  >
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1 font-medium">
                      {stat.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 leading-snug">
                      {stat.context}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────── What is an online doctor ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <Heading level="h2" className="mb-6">
                What an Australian online doctor actually does
              </Heading>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  An online doctor in Australia is, for every clinical purpose, the same
                  practitioner you would see inside a bricks-and-mortar clinic - an AHPRA-registered
                  medical practitioner who has completed an Australian medical degree, internship,
                  and general registration pathway. The only thing that changes is how you reach them.
                  Instead of booking a 15-minute slot in a waiting room, you submit a structured
                  intake form with your history and symptoms, and a GP reviews it on the other side.
                  The clinical decision - approve, decline, or ask for more information - is made by
                  a human doctor every single time, and logged against their provider number.
                </p>
                <p>
                  At InstantMed, the majority of requests fall into three buckets: a medical
                  certificate for a brief illness, a repeat prescription for a medication you&apos;ve
                  already been stable on, or a consultation about a new or ongoing symptom. Each one
                  is handled by a doctor who reads your history, applies RACGP-aligned clinical
                  reasoning, and either issues what you need or writes back explaining why they
                  can&apos;t. If they decline, you get a full refund - we would rather lose a fee
                  than issue something that isn&apos;t clinically appropriate.
                </p>
                <p>
                  The legal framework for seeing a doctor online in Australia is set by the TGA,
                  AHPRA, and the Medical Board. Telehealth consultations have been formally
                  recognised since 2011, and the regulatory guidance has tightened substantially
                  since 2022 with the Medical Board&apos;s updated telehealth guidelines. InstantMed
                  operates entirely within those guidelines: we require identity verification for
                  prescriptions, we block first-contact prescribing of Schedule 8 drugs, and we
                  maintain auditable records of every clinical decision for the full period required
                  by state health records legislation.
                </p>
              </div>
            </div>
          </section>

          {/* ─────────────── Services grid ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <Heading level="h2" className="mb-3">
                  What you can see an online doctor for
                </Heading>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Three services cover most of what Australians actually need a GP for. Every one is
                  reviewed by a real doctor, not an algorithm.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {SERVICES.map((service) => {
                  const Icon = service.icon
                  return (
                    <div
                      key={service.title}
                      className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none flex flex-col"
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground text-lg mb-2">
                        {service.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                        {service.body}
                      </p>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
                        {service.priceLabel}
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full justify-center"
                      >
                        <Link href={service.href}>
                          {service.cta}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ─────────────── How it works ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <Heading level="h2" className="mb-6">
                How seeing a doctor online actually works
              </Heading>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  The whole process is designed to replace the 90-minute round trip to a GP clinic
                  with a 2-minute form and a doctor review. You start at{" "}
                  <Link href="/request" className="text-primary hover:underline font-medium">
                    /request
                  </Link>{" "}
                  by choosing what you need - certificate, prescription, or consultation - and walk
                  through a structured intake that mirrors the questions a GP would ask in the
                  consulting room. Because the intake is conditional on your answers, a repeat
                  prescription for a long-term medication will ask a different set of questions to a
                  new consultation about a persistent cough. Every answer goes into an encrypted
                  record that only the treating doctor sees.
                </p>
                <p>
                  Once you submit, the request lands in a doctor&apos;s queue. They open it, read
                  your full history, and make a decision. For straightforward requests, they approve
                  and the system generates the deliverable - a PDF medical certificate or an
                  eScript - which you receive by email and SMS. For more complex cases, the doctor
                  may send you a message asking a clarifying question, or offer a brief phone call at
                  no extra charge. If they decline, the decision is always explained and you&apos;re
                  refunded automatically. There is no hidden AI step and no outsourcing of clinical
                  decisions - it&apos;s a queue of real GPs working through real patients.
                </p>
                <p>
                  When a prescription is approved, your eScript token arrives on your phone as a QR
                  code. You walk into any pharmacy in Australia - Chemist Warehouse, Priceline,
                  TerryWhite, your local independent - hand over the token, and collect the
                  medication. eScripts are federally regulated under the Electronic Prescriptions
                  programme and work identically to a paper script at every participating pharmacy
                  in the country, which is essentially all of them.
                </p>
              </div>
            </div>
          </section>

          {/* ─────────────── Good for / not for ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <Heading level="h2" className="mb-3">
                  When an online doctor is the right call - and when it isn&apos;t
                </Heading>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Telehealth has real clinical limits. We would rather tell you upfront than take a
                  fee for something we can&apos;t safely handle.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-card border border-success/30 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <h3 className="font-semibold text-foreground">Good fit for an online doctor</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Short-term sick leave (cold, flu, gastro, migraine)</li>
                    <li>• Repeat scripts for stable, ongoing medications</li>
                    <li>• Uncomplicated urinary tract infections in women</li>
                    <li>• Contraception and pill scripts (continuing use)</li>
                    <li>• Skin conditions with clear photos (acne, eczema, tinea)</li>
                    <li>• Mental health check-ins and continuing care</li>
                    <li>• University assessment extensions and carer&apos;s leave</li>
                    <li>• Referral or pathology request letters for stable issues</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-card border border-destructive/30 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <h3 className="font-semibold text-foreground">Needs in-person or emergency care</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Chest pain, shortness of breath, suspected stroke (call 000)</li>
                    <li>• Severe abdominal pain or uncontrolled bleeding</li>
                    <li>• Head injuries and trauma</li>
                    <li>• Pregnancy complications</li>
                    <li>• Fevers in infants or complex paediatric presentations</li>
                    <li>• Mental health crises with risk of self-harm (Lifeline 13 11 14)</li>
                    <li>• Schedule 8 drugs (opioids, benzos, stimulants) - first contact</li>
                    <li>• WorkCover and fitness-to-work medicals needing physical exam</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────── Regulatory / AHPRA context ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <Heading level="h2" className="mb-6">
                The regulatory ground under Australian online doctors
              </Heading>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Australian online doctors operate under the same legal and professional framework
                  as any other Australian GP. AHPRA - the Australian Health Practitioner Regulation
                  Agency - sets the registration standards for every medical practitioner in the
                  country. Every doctor treating patients through InstantMed holds current general
                  registration and is publicly searchable at{" "}
                  <span className="text-foreground font-medium">ahpra.gov.au/Registration</span>.
                  The Medical Board of Australia, which sits within AHPRA, issues specific telehealth
                  guidelines updated most recently in 2023, and InstantMed&apos;s clinical governance
                  is explicitly designed around them.
                </p>
                <p>
                  Prescribing is regulated at the federal level by the Therapeutic Goods Administration
                  (TGA), which classifies medications by schedule and restricts how each one can be
                  prescribed. Schedule 2 and 3 medications are available over-the-counter or with
                  pharmacist oversight; Schedule 4 medications require a doctor&apos;s prescription
                  but can be prescribed via telehealth; Schedule 8 controlled substances have strict
                  prescribing rules that generally require in-person assessment, and InstantMed
                  blocks first-contact requests for any Schedule 8 medication at intake. The
                  Pharmaceutical Benefits Scheme (PBS) then governs how those medications are
                  subsidised - private telehealth prescriptions are valid under PBS, meaning you
                  still pay the same co-payment at the pharmacy as you would with a paper script
                  from your local GP.
                </p>
                <p>
                  Clinical protocols follow RACGP (Royal Australian College of General Practitioners)
                  guidance. InstantMed&apos;s internal triage rules, question sets, and decision
                  support are all anchored to current RACGP standards. We maintain clinical
                  governance oversight, audit a sample of clinical decisions, and log every
                  consultation for the full period required by each state&apos;s health records
                  legislation. This isn&apos;t unique to us - it&apos;s the baseline every telehealth
                  service in Australia has to meet, and it&apos;s the reason seeing an online doctor
                  is a clinically serious option, not a novelty.
                </p>
              </div>
            </div>
          </section>

          {/* ─────────────── Cross-links to key hubs ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <Heading level="h2" className="mb-3">
                  Explore the rest of the service
                </Heading>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Head to any of these hubs to see the specific conditions, medications, and
                  locations we cover.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/conditions"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                >
                  <BookOpen className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Conditions we treat
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Full list of conditions an online doctor can help with
                  </div>
                </Link>
                <Link
                  href="/prescriptions"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                >
                  <Pill className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Online prescriptions
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Repeat scripts, eScripts, and what we can prescribe
                  </div>
                </Link>
                <Link
                  href="/locations/state/nsw"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                >
                  <MapPin className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Location coverage
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Every state and 40+ Australian cities
                  </div>
                </Link>
                <Link
                  href="/faq"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                >
                  <MessageSquare className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Full FAQ
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Every question we&apos;ve been asked about online GPs
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* ─────────────── State hub ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <Heading level="h2" className="mb-3">
                  Online doctors in every Australian state
                </Heading>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Dedicated guides for each state and territory. Same doctors, same turnaround -
                  different local context.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stateSlugs.map((slug) => {
                  const state = statesData[slug]
                  return (
                    <Link
                      key={slug}
                      href={`/locations/state/${slug}`}
                      className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {state.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {state.cities.length}+ cities
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-[transform,color]" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ─────────────── FAQs ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-3xl">
              <Heading level="h2" className="text-center mb-10">
                Online doctor Australia - FAQs
              </Heading>
              <div className="space-y-4">
                {FAQS.map((faq, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────── Final CTA ─────────────── */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <Heading level="h2" className="mb-4">
                Ready to see an Australian online doctor?
              </Heading>
              <p className="text-muted-foreground mb-8">
                Fill in the form, a doctor reviews it, your certificate or prescription is on the
                way. Refund if we can&apos;t help.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 bg-transparent"
                >
                  <Link href="/consult">Book a consultation</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                From {PRICING_DISPLAY.MED_CERT} · AHPRA-registered doctors · Full refund if we
                can&apos;t help
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
