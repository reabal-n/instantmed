"use client"

import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CenteredHero } from "@/components/heroes"
import { Timeline, FeatureGrid, CTABanner } from "@/components/sections"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import {
  Clock,
  Shield,
  CreditCard,
  Send,
} from "lucide-react"
import Link from "next/link"

/* ────────────────────────────── Data ────────────────────────────── */

const processSteps = [
  {
    title: "Tell us what you need",
    description:
      "Pick your service and answer a few quick questions. Takes about 2 minutes. No account needed to get started.",
  },
  {
    title: "A real doctor reviews it",
    description:
      "An AHPRA-registered GP reviews your request and medical history. If they need more info, they\u2019ll reach out directly. Most reviews done within the hour.",
  },
  {
    title: "Get your document",
    description:
      "If approved: med cert emailed as PDF, medication sent to your phone for any pharmacy. If not approved, you get a full refund. No questions asked.",
  },
]

const features = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Fast turnaround",
    description:
      "Most requests reviewed within hours. If we can't help, you get a full refund.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "AHPRA registered",
    description:
      "All our doctors are registered with AHPRA. We checked.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "No subscriptions",
    description:
      "Pay per consult. No monthly fees, no hidden charges, no surprises.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Digital delivery",
    description:
      "Everything sent via email or SMS. No app to download, nothing to print.",
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export function HowItWorksContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <CenteredHero
          pill="How It Works"
          title="Healthcare that fits your life"
          highlightWords={["your life"]}
          subtitle="Submit your request online. A real Australian doctor reviews it and determines the best way to help you. Convenient, but still thorough."
        />

        {/* Process Steps */}
        <Timeline
          pill="3 simple steps"
          title="Three steps. That's it."
          highlightWords={["steps"]}
          subtitle="No hidden steps, no surprises, no catch."
          steps={processSteps}
        />

        {/* Doctor Credibility */}
        <DoctorCredibility
          variant="section"
          stats={["experience", "approval", "sameDay"]}
          className="px-4 sm:px-6"
        />

        {/* Features */}
        <FeatureGrid
          pill="Why InstantMed?"
          title="Why Aussies trust us"
          highlightWords={["trust"]}
          subtitle="Real reasons, not marketing fluff."
          features={features}
          columns={4}
        />

        {/* Regulatory Partners */}
        <RegulatoryPartners className="py-12" />

        {/* Long-form E-E-A-T Guide Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* AHPRA Badge */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Reviewed by AHPRA-registered GPs</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-3 tracking-tight">
              How online healthcare actually works in Australia
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              The clinical process behind what looks simple, and why it&apos;s more thorough than you might think.
            </p>

            <div className="space-y-10">
              {/* Section 1 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">What happens when you submit a request</h3>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    When you fill in our questionnaire, you&apos;re providing the same information you&apos;d give a GP in a face-to-face consultation: your symptoms, how long you&apos;ve had them, relevant medical history, and any medications you&apos;re taking. The form is structured to capture the clinical details a doctor needs to make an informed assessment.
                  </p>
                  <p>
                    This isn&apos;t a rubber-stamp process. The doctor reads your responses, reviews your history if you&apos;ve used the service before, and applies the same clinical judgement they would in a consulting room. If something doesn&apos;t add up or they need more information, they&apos;ll message you through the platform. If they determine your situation requires in-person care, they&apos;ll say so, and you get a full refund.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">The clinical standards behind the screen</h3>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Every doctor on InstantMed is registered with the Australian Health Practitioner Regulation Agency (AHPRA) and holds a current medical registration. They follow the same clinical standards as any GP clinic, because they are GPs. The Medical Board of Australia&apos;s guidelines on telehealth require the same duty of care, record-keeping, and clinical decision-making as in-person consultations.
                  </p>
                  <p>
                    Our clinical governance framework includes regular auditing, peer review, and adherence to RACGP clinical guidelines. Doctors can decline to issue a certificate or prescription if it&apos;s not clinically appropriate, and they do. An approval rate below 100% is a feature, not a bug. It means the clinical judgement is genuine.
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Medical certificates vs prescriptions vs consultations</h3>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    We offer three core services, each with a different clinical pathway. Medical certificates are for short-term illness; the doctor assesses whether your reported symptoms justify time off work or study. Repeat prescriptions are for medications you already take; the doctor confirms it&apos;s safe to continue and sends an eScript to your phone. General consultations are for new health concerns; the doctor reviews your questionnaire and responds in writing with treatment advice, prescriptions, or referrals as needed.
                  </p>
                  <p>
                    The clinical rigour scales with the complexity. A medical certificate for a one-day cold is relatively straightforward. A general consultation about ongoing symptoms requires more assessment and may involve follow-up questions through the platform. A prescription for a medication you&apos;ve been taking for years requires different checks than one for a new concern. The process adapts. The standard doesn&apos;t.
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">What we can and can&apos;t do online</h3>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Telehealth works well for conditions where the diagnosis is primarily history-based: cold and flu, gastro, back pain, mental health concerns, medication renewals, skin conditions (with photos), UTIs, and similar. These are conditions where a GP&apos;s assessment relies on what you describe rather than what they can physically examine.
                  </p>
                  <p>
                    We&apos;re upfront about what falls outside our scope. We can&apos;t prescribe Schedule 8 medications (opioids, stimulants, benzodiazepines). We won&apos;t issue medical certificates for WorkCover claims. Those require in-person examination. Conditions requiring blood tests, imaging, or physical examination (suspicious lumps, joint injuries, chest pain) should be seen face-to-face. If your situation needs in-person care, we&apos;ll tell you, and refund you.
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Your privacy and data security</h3>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Doctor-patient confidentiality applies fully to telehealth consultations. Your health information is encrypted with AES-256, the same standard used by banks, and is never shared with employers, insurers, or third parties without your explicit consent. Because this is a private service (not billed to Medicare), there&apos;s no record on your Medicare claims history.
                  </p>
                  <p>
                    We comply with the Australian Privacy Principles (APPs 1–13) and the Privacy Act 1988. Your data is stored on Australian servers. You can request access to or deletion of your health records at any time. For full details, see our <Link href="/privacy" className="text-primary hover:underline">privacy policy</Link>.
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical governance link */}
            <div className="mt-10 pt-6 border-t border-border/30">
              <p className="text-xs text-muted-foreground text-center">
                Read more about our clinical standards in our{' '}
                <Link href="/clinical-governance" className="text-primary hover:underline">clinical governance framework</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-muted/50 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-3 tracking-tight">
              Common questions
            </h2>
            <p className="text-center text-muted-foreground mb-10">
              Everything you need to know about using InstantMed.
            </p>

            <div className="space-y-4">
              {[
                {
                  q: "Is this a real doctor?",
                  a: "Yes. Every request is reviewed by an AHPRA-registered Australian GP. They're real doctors with real medical degrees and current registration, the same doctors who work in clinics and hospitals.",
                },
                {
                  q: "How long does it take?",
                  a: "Medical certificates are typically issued within 30 minutes, 24/7. Prescriptions and consultations are reviewed within 1–2 hours — all async, no phone call required. Prescriptions and consultations are available 8am–10pm AEST, 7 days.",
                },
                {
                  q: "Will my employer accept an online medical certificate?",
                  a: "Yes. Certificates from AHPRA-registered doctors are legally valid under the Fair Work Act. They carry the same weight as certificates from in-person GP visits. Every certificate includes the doctor's AHPRA registration and a unique verification ID.",
                },
                {
                  q: "Do I need to be available for a call?",
                  a: "No. InstantMed is fully async — you submit your form, the doctor reviews it, and you get a written response. No need to be free at a specific time. If the doctor needs clarification, they'll message you through the platform.",
                },
                {
                  q: "Do I need a Medicare card?",
                  a: "For medical certificates, no. For prescriptions and consultations, Medicare details are requested so the doctor can verify your identity and prescribing history, but this is a private service and no Medicare rebate is claimed.",
                },
                {
                  q: "What if the doctor can't help me?",
                  a: "You get a full refund. If your situation requires in-person care, controlled substances, or falls outside what telehealth can safely manage, the doctor will let you know and recommend appropriate next steps.",
                },
                {
                  q: "Is my information private?",
                  a: "Completely. Your health data is encrypted with bank-level security and never shared with employers, insurers, or anyone else without your consent. Because we're a private service, nothing appears on your Medicare history.",
                },
                {
                  q: "Can I use this for my kids?",
                  a: "We primarily serve adults (18+). Minors may be assessed with parental consent for certain services, but complex paediatric cases should be seen by a GP in person.",
                },
                {
                  q: "How do I receive my documents?",
                  a: "Medical certificates are emailed as PDFs and available in your patient dashboard. Prescriptions are sent as eScripts via SMS. Take your phone to any pharmacy. Consultation notes are available in your dashboard.",
                },
                {
                  q: "Is this available outside major cities?",
                  a: "Yes. InstantMed works anywhere in Australia with internet access. Regional, rural, and remote patients use our service regularly. It was designed to bridge the gap where GP access is limited.",
                },
                {
                  q: "What hours are you open?",
                  a: "Medical certificates are available 24/7. Prescriptions and consultations: 8am–10pm AEST, 7 days a week including public holidays. You can submit anytime. Requests outside operating hours are reviewed first thing next session.",
                },
                {
                  q: "How is this different from calling a GP clinic?",
                  a: "No appointments, no waiting rooms, no phone queues. You submit your request when it suits you, and a doctor reviews it without you needing to be available at a specific time. Same quality of care, different delivery method.",
                },
              ].map((faq, i) => (
                <div key={i} className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Pick what you need, fill in a quick form, and a GP takes care of the rest. Reviewed within 1–2 hours, most days."
          ctaText="Get Med Cert"
          ctaHref="/request?service=med-cert"
          secondaryText="Renew medication"
          secondaryHref="/request?service=prescription"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
