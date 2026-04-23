import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  MapPin,
  MonitorSmartphone,
  Pill,
  Scale,
  Shield,
  Stethoscope,
  Video,
  XCircle,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { BreadcrumbSchema, FAQSchema } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getAllStateSlugs, statesData } from "@/lib/seo/data/states"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// ============================================================================
// METADATA - head-term pillar for "telehealth australia" and related
// ============================================================================

const CANONICAL = "https://instantmed.com.au/telehealth-australia"

export const metadata: Metadata = {
  title: { absolute: "Telehealth Australia | Online, No Waiting Room | InstantMed" },
  description: `Telehealth in Australia explained - how it works, what it costs, the Medicare and PBS rules, and which conditions are suitable for virtual care. InstantMed delivers AHPRA-governed telehealth nationwide from ${PRICING_DISPLAY.MED_CERT}.`,
  keywords: [
    "telehealth australia",
    "australian telehealth",
    "telehealth au",
    "telehealth services australia",
    "online telehealth australia",
    "telehealth doctor australia",
    "telehealth medicare",
    "telehealth prescription",
    "telehealth medical certificate",
    "telehealth consultation australia",
  ],
  openGraph: {
    title: "Telehealth Australia | Online, No Waiting Room | InstantMed",
    description: `A practical guide to telehealth in Australia: regulation, cost, Medicare, suitable conditions, and how to get started. ${PRICING_DISPLAY.FROM_MED_CERT} with AHPRA-registered doctors.`,
    url: CANONICAL,
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telehealth Australia | InstantMed",
    description:
      "How telehealth works in Australia - regulation, cost, Medicare, and which conditions it's safe for.",
  },
  alternates: { canonical: CANONICAL },
}

// ============================================================================
// CONTENT
// ============================================================================

const STATS = [
  { value: "2011", label: "Telehealth legal in AU", context: "Federally recognised since the MBS reform" },
  { value: `~${SOCIAL_PROOF.certTurnaroundMinutes} min`, label: "Med cert turnaround", context: "Reviewed around the clock" },
  { value: "AHPRA", label: "Clinical governance", context: "RACGP-aligned standards" },
  { value: `${PRICING_DISPLAY.MED_CERT}`, label: "From", context: "Private fee, refund if declined" },
]

const MODALITIES = [
  {
    icon: FileText,
    title: "Asynchronous (store-and-forward)",
    body: "You submit a structured form; a doctor reviews it when they're next on queue. Fastest and most scalable - ideal for med certs and repeat scripts on stable medication.",
  },
  {
    icon: Video,
    title: "Synchronous video or phone",
    body: "Real-time consultation with a GP for situations that need back-and-forth questioning or visual assessment. More common in Medicare-subsidised telehealth than in private services.",
  },
  {
    icon: MonitorSmartphone,
    title: "Hybrid follow-up",
    body: "Async intake, then a phone call if the doctor needs clarification. InstantMed uses this pattern - free optional doctor call-backs where clinically useful.",
  },
]

const FAQS = [
  {
    question: "Is telehealth legal in Australia?",
    answer:
      "Yes - telehealth has been a federally recognised form of medical care in Australia since 2011, when the Medicare Benefits Schedule was extended to cover video consultations for specific populations. Since 2020 it's been dramatically expanded, first under temporary COVID-era item numbers and then through the permanent telehealth items introduced in the 2022 Medicare reforms. The Medical Board of Australia and AHPRA publish binding telehealth guidelines that every Australian doctor must follow when delivering virtual care.",
  },
  {
    question: "Does Medicare pay for telehealth?",
    answer:
      "Medicare subsidises telehealth for patients who have an established relationship with a GP - generally meaning a face-to-face visit at the same practice within the previous 12 months. This is known as the 'established clinical relationship' rule, introduced in 2022 to curb pop-up bulk-billing telehealth services. InstantMed is a private telehealth service and does not claim Medicare rebates; our fees are private-pay, but you can still use your PBS entitlements when filling eScripts at any Australian pharmacy.",
  },
  {
    question: "Is telehealth as good as seeing a doctor in person?",
    answer:
      "For conditions where the clinical decision can be made from history alone - short-term sick leave, repeat scripts, many UTIs, mental health check-ins, contraception - research shows telehealth outcomes are comparable to in-person care when delivered by properly trained clinicians. For anything requiring a physical examination (abdominal palpation, cardiac auscultation, ear, nose and throat exam, rashes that won't photograph well) telehealth is a poor substitute and we'll either decline or refer you to an in-person GP.",
  },
  {
    question: "What does a telehealth consultation actually cost in Australia?",
    answer: `That depends entirely on the provider and whether Medicare applies. GP-based telehealth with an established-relationship patient may be bulk-billed or carry a small gap fee. Private telehealth services like InstantMed charge a flat fee per request - medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and general consultations from ${PRICING_DISPLAY.CONSULT}. The trade-off is simple: you pay a small fee for immediate, structured access without the wait or the Medicare card requirement.`,
  },
  {
    question: "Can a telehealth doctor send a prescription to my pharmacy?",
    answer:
      "Yes. Australian telehealth doctors issue eScripts under the federal Electronic Prescriptions framework. You receive an SMS with a QR code token, which any Australian pharmacy can scan to dispense the medication. eScripts are not a separate or lesser category of prescription - they are the same legal document as a paper script, valid across every PBS-participating pharmacy in the country, including Chemist Warehouse, Priceline, TerryWhite, and independent community pharmacies.",
  },
  {
    question: "What telehealth regulations have changed recently in Australia?",
    answer:
      "The 2023 Medical Board telehealth guidelines tightened prescribing rules for telehealth - particularly around controlled substances, first-contact prescribing of addictive medications, and the need to identify patients before issuing prescriptions. The 2022 Medicare reforms introduced the established-relationship rule for Medicare-subsidised telehealth. Across the same period, the TGA has maintained strict prohibitions on telehealth prescribing of Schedule 8 drugs at first contact. InstantMed's intake and clinical protocols are explicitly built around these rules.",
  },
  {
    question: "Can I use telehealth from regional or remote Australia?",
    answer:
      "Yes - telehealth was originally expanded in Australia specifically to improve access for regional and remote patients. InstantMed covers every Australian postcode from Broome to Hobart with no difference in price, turnaround, or service level. For some remote communities served by Aboriginal Community Controlled Health Organisations or Royal Flying Doctor Service teams, telehealth is a complement to - not a replacement for - these primary-care relationships, and we recommend staying connected with your local service for ongoing complex care.",
  },
  {
    question: "Is my information safe in a telehealth consultation?",
    answer:
      "Australian telehealth services are bound by the Privacy Act 1988, the Australian Privacy Principles, and state-based health records legislation (Health Records and Information Privacy Act 2002 in NSW, Health Records Act 2001 in Victoria, and equivalents elsewhere). InstantMed encrypts all Protected Health Information at rest and in transit, enforces row-level security on every database query, and limits access to the treating doctor. Your health information is not shared with employers, insurers, or any third party without explicit consent.",
  },
]

// JSON-LD - MedicalBusiness with Country area served + Breadcrumb + FAQPage
const medicalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "@id": `${CANONICAL}#business`,
  name: "InstantMed - Telehealth Australia",
  description:
    "Private telehealth service operating across Australia, delivering medical certificates, prescriptions, and consultations through AHPRA-registered doctors under RACGP-aligned clinical governance.",
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
        "Medical certificates 24/7. Prescription and consultation reviews 08:00–22:00 AEST, seven days a week.",
    },
  ],
  medicalSpecialty: "General Practice",
  isAcceptingNewPatients: true,
}

// ============================================================================
// PAGE
// ============================================================================

export default function TelehealthAustraliaPage() {
  const stateSlugs = getAllStateSlugs()

  return (
    <>
      <script
        id="telehealth-australia-business-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(medicalBusinessSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Telehealth Australia", url: CANONICAL },
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
                <SectionPill>Nationwide · AHPRA-governed</SectionPill>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Telehealth in Australia - how virtual care actually works
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                A plain-English guide to telehealth in Australia: the regulation, the cost, the
                rules around Medicare and PBS, and the conditions it&apos;s genuinely suitable for.
                Plus the fastest way to use it, if you need something today.
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
                  <Link href="/consult">Book a telehealth consult</Link>
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-primary" />
                  Privacy Act 1988 compliant
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  ~{SOCIAL_PROOF.certTurnaroundMinutes} min med cert turnaround
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  RACGP-aligned protocols
                </span>
              </div>
            </div>
          </section>

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

          {/* ─────────────── What telehealth actually is ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">
                What telehealth actually is - and isn&apos;t
              </h2>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Telehealth is a delivery model, not a separate kind of medicine. In Australia, the
                  term covers any clinical care delivered remotely using information and
                  communication technology - video, phone, secure messaging, or structured
                  asynchronous intake forms. The doctor is exactly the same medical practitioner
                  they would be in a clinic: AHPRA-registered, working under the Medical Board&apos;s
                  Good Medical Practice code, documenting the consultation in a medical record.
                  What changes is the interface between patient and clinician. The clinical
                  judgment itself happens in the same place it always has - inside a doctor&apos;s
                  head.
                </p>
                <p>
                  There are three broad modalities of telehealth used in Australia. The best-known
                  is synchronous video - the Zoom-style consultation that expanded dramatically
                  during 2020. Phone-based consultations are also extremely common, especially under
                  Medicare-subsidised items in rural and regional areas. The third modality, and
                  the one InstantMed predominantly uses, is asynchronous or &apos;store-and-forward&apos;
                  telehealth: a patient completes a structured intake, the doctor reviews it later,
                  and they either approve, decline, or come back with a follow-up question. Each
                  modality has specific strengths: sync video is better for visual assessment and
                  rapport, async is dramatically faster for straightforward decisions.
                </p>
                <p>
                  Telehealth is not, despite a common misconception, a second-rate version of GP
                  care. For many conditions it&apos;s empirically equivalent, and for some things
                  (access from regional Australia, out-of-hours needs, mobility-limited patients)
                  it&apos;s actually superior. What it cannot do is physically examine you. Any
                  presentation where the diagnosis depends on palpating an abdomen, auscultating a
                  heart, examining an ear canal, or assessing a gait is a poor fit for telehealth,
                  and any responsible service will decline those requests rather than pretend the
                  exam can be skipped.
                </p>
              </div>
            </div>
          </section>

          {/* ─────────────── Modalities grid ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  The three telehealth modalities used in Australia
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Different tools for different clinical situations. InstantMed leans heavily on
                  asynchronous review - but hybrid follow-up is always available.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {MODALITIES.map((modality) => {
                  const Icon = modality.icon
                  return (
                    <div
                      key={modality.title}
                      className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none"
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground text-lg mb-2">
                        {modality.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {modality.body}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ─────────────── Regulatory landscape ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="w-5 h-5 text-primary" />
                <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
                  Regulatory landscape
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">
                Medicare, the PBS, and the rules that govern Australian telehealth
              </h2>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  Australian telehealth sits on top of three overlapping regulatory layers, and
                  understanding them makes the market much easier to navigate. The first layer is
                  professional registration through AHPRA and the Medical Board, which applies to
                  every medical practitioner regardless of how they deliver care. The 2023 Medical
                  Board telehealth guidelines set specific expectations: identification of the
                  patient before prescribing, continuity of care where possible, and clinical
                  judgement that matches the standards of in-person care. Every telehealth doctor
                  in Australia must follow these guidelines, and breaches are handled by the same
                  notification and disciplinary process as any other AHPRA matter.
                </p>
                <p>
                  The second layer is Medicare. Following the 2022 reforms, Medicare-subsidised
                  telehealth items require an &apos;established clinical relationship&apos; - a prior
                  face-to-face visit at the same practice within the last 12 months, with specific
                  exemptions for rural patients, blood-borne virus screening, and some mental health
                  items. This rule was introduced to stop pop-up bulk-billing telehealth services
                  from claiming rebates for one-off patients. InstantMed is a private-pay
                  telehealth service - we don&apos;t claim Medicare rebates, which means no gap-fee
                  uncertainty and no need for a pre-existing patient relationship with the practice. The
                  trade-off is that you pay the full private fee rather than a Medicare co-payment.
                </p>
                <p>
                  The third layer is the TGA and the Pharmaceutical Benefits Scheme. The TGA
                  classifies every medication by schedule, and the rules for telehealth prescribing
                  depend on the schedule. Schedule 2 and 3 medications are available at pharmacies
                  without a prescription. Schedule 4 medications - most antibiotics, contraception,
                  antidepressants, antihypertensives, many asthma medications - can be prescribed
                  via telehealth. Schedule 8 controlled substances (strong opioids, benzodiazepines,
                  dexamphetamine, methylphenidate) generally cannot be prescribed at first contact
                  via telehealth, and InstantMed blocks any such request at intake. When a
                  telehealth doctor writes an eScript for a PBS-listed medication, you still receive
                  the normal PBS subsidy at the pharmacy - telehealth prescriptions are not
                  second-class under the PBS.
                </p>
              </div>
            </div>
          </section>

          {/* ─────────────── Suitable vs unsuitable ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  Which conditions are suitable for telehealth - and which aren&apos;t
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  The honest list. If a condition needs a physical exam or an emergency response,
                  telehealth isn&apos;t the right tool.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-card border border-success/30 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <h3 className="font-semibold text-foreground">Suitable for telehealth</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Acute short-term illnesses needing a medical certificate</li>
                    <li>• Ongoing medications you&apos;re stable on (BP, thyroid, pill, PPIs)</li>
                    <li>• Uncomplicated UTIs in non-pregnant women</li>
                    <li>• Most contraception requests and counselling</li>
                    <li>• Mental health check-ins and continuing care</li>
                    <li>• Hair loss, skin concerns with photos, acne management</li>
                    <li>• Sexual health screening requests and referrals</li>
                    <li>• Travel-related script needs for returning travellers</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-card border border-destructive/30 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <h3 className="font-semibold text-foreground">Not suitable for telehealth</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Chest pain, breathing difficulty, suspected stroke (call 000)</li>
                    <li>• Acute abdominal pain, suspected appendicitis</li>
                    <li>• Any trauma, wounds, or suspected fractures</li>
                    <li>• Infants and young children with acute illness</li>
                    <li>• Schedule 8 controlled substances at first contact</li>
                    <li>• New diagnoses requiring physical examination</li>
                    <li>• Pregnancy complications and antenatal emergencies</li>
                    <li>• Mental health crises with active safety risk (13 11 14)</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────── Who telehealth is for ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">
                Who benefits most from Australian telehealth
              </h2>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  The population that gains the most from telehealth in Australia is anyone for
                  whom a traditional GP visit has a high fixed cost. For regional and remote
                  Australians, that fixed cost is travel - a 90-minute drive or a flight to the
                  nearest clinic with a same-day appointment. For shift workers in mining,
                  healthcare, hospitality, and logistics, the fixed cost is scheduling: a
                  traditional clinic is only open during the hours they&apos;re least available. For
                  FIFO and DIDO workers in the WA and QLD resources sector, the fixed cost is
                  continuity - they need a repeat script on their residential rotation, not when
                  they happen to be on-site. Telehealth dissolves each of these frictions in a way
                  that traditional clinics structurally can&apos;t.
                </p>
                <p>
                  There are also specific populations where telehealth is not just convenient but
                  clinically important. Mobility-limited patients benefit from removing the
                  transport barrier. Immunocompromised patients avoid the infection risk of a
                  waiting room full of respiratory viruses. Parents of young children avoid the
                  logistical nightmare of taking a toddler with them to an appointment for
                  themselves. Students with assessment deadlines, carers juggling multiple
                  responsibilities, and people living with anxiety conditions that make clinical
                  environments stressful - all of these groups have material, documented benefits
                  from telehealth access, and the research base backing this up has grown
                  substantially since 2020.
                </p>
                <p>
                  Telehealth isn&apos;t a replacement for having a regular GP. If you have a complex
                  chronic condition, you should still have a GP who knows your full history and can
                  coordinate specialist care. But for the high-volume, straightforward needs that
                  make up the majority of Australian primary care visits - med certs, repeat
                  scripts, uncomplicated acute issues - a private telehealth service like InstantMed
                  is often the fastest, most predictable option. It sits alongside your regular GP
                  relationship, not on top of it.
                </p>
              </div>
            </div>
          </section>

          {/* ─────────────── Cross-links ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  Explore InstantMed&apos;s telehealth services
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Specific pages for each service type, plus condition guides and location coverage.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/medical-certificate"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <FileText className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Telehealth med certs
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Work, study, carer&apos;s leave - 24/7 turnaround
                  </div>
                </Link>
                <Link
                  href="/prescriptions"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Pill className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Telehealth prescriptions
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    eScripts sent to your phone, valid at any pharmacy
                  </div>
                </Link>
                <Link
                  href="/consult"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Stethoscope className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Telehealth consultations
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Discuss a symptom or get a treatment plan
                  </div>
                </Link>
                <Link
                  href="/conditions"
                  className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <BookOpen className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Conditions we treat
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Full list of conditions suited to telehealth
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* ─────────────── State hub ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  Telehealth coverage in every Australian state
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Each state page has local context on access pressure, Medicare rules, and
                  accepted documentation by universities and employers.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stateSlugs.map((slug) => {
                  const state = statesData[slug]
                  return (
                    <Link
                      key={slug}
                      href={`/locations/state/${slug}`}
                      className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {state.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {state.population} residents
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ─────────────── FAQs ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground text-center mb-10">
                Telehealth Australia - FAQs
              </h2>
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
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
                Use telehealth the way it&apos;s meant to work
              </h2>
              <p className="text-muted-foreground mb-8">
                Fill in a form, an AHPRA-registered doctor reviews it, certificate or eScript
                arrives the same day. Refund if it&apos;s not the right fit.
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
                  <Link href="/medical-certificate">See medical certificates</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                From {PRICING_DISPLAY.MED_CERT} · AHPRA-registered doctors · RACGP-aligned protocols
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
