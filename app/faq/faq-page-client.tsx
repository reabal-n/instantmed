"use client"

import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { CenteredHero } from "@/components/heroes"
import { AccordionSection, CTABanner } from "@/components/sections"

/* ────────────────────────────── FAQ Data ────────────────────────────── */

const faqCategories = [
  {
    title: "General",
    faqs: [
      {
        q: "What is InstantMed?",
        a: "We're an Australian telehealth service that connects you with registered GPs for medical certificates and prescription renewals. You submit your request online, and a doctor reviews it. They may approve it, request more information, or recommend an in-person consultation if needed.",
      },
      {
        q: "Is this service legal and legitimate?",
        a: "100% legitimate. InstantMed is operated by AHPRA-registered medical practitioners in Australia. All consultations are conducted by qualified doctors who follow the same clinical standards as in-person consultations. You can verify any doctor's registration on the public AHPRA register.",
      },
      {
        q: "How long does it take?",
        a: "Most requests are reviewed within 1-2 hours during business hours (8am-10pm AEST). We aim to respond within 24 hours maximum. If we can\u2019t help you, you get a full refund.",
      },
      {
        q: "How do I know if I need an in-person visit instead?",
        a: "Our service is best for straightforward requests like sick certificates for minor illness and repeat prescriptions for stable conditions. If you have a new or complex condition, worsening symptoms, or need a physical examination, we'll recommend an in-person visit. Our doctors will let you know if that\u2019s the case.",
      },
      {
        q: "How does the doctor decide on my request?",
        a: "A real doctor reviews your symptoms, medical history, and request \u2014 just like they would in a clinic. If it's clinically appropriate and safe, they approve it. If not, they'll ask for more info, suggest alternatives, or recommend in-person care. You can learn more on our How We Decide page.",
      },
      {
        q: "Why was my request declined?",
        a: "Doctors decline requests when approving them wouldn't be safe or appropriate \u2014 like when a physical exam is needed, or when symptoms suggest something more serious. It's not personal. It's a doctor doing their job properly. You get a full refund if we can't help you.",
      },
      {
        q: "Will a doctor call me?",
        a: "The doctor reviews your request based on the information you provide. If they need clarification or have clinical concerns, they may contact you by phone or message. This is to ensure safe, appropriate care \u2014 it\u2019s a feature, not a bug.",
      },
    ],
  },
  {
    title: "Medical Certificates",
    faqs: [
      {
        q: "Will my employer actually accept this?",
        a: "Yes. Our medical certificates are issued by registered Australian doctors and are legally valid for all workplaces, universities, and Centrelink. They're identical in validity to certificates issued in-person.",
      },
      {
        q: "Can I get a backdated certificate?",
        a: "We can issue certificates for recent illness (within the last few days) if clinically appropriate based on your symptoms and history. The doctor makes the final decision on what dates are appropriate. We cannot backdate certificates for extended periods.",
      },
      {
        q: "What if my request is declined?",
        a: "If the doctor determines a certificate isn\u2019t clinically appropriate, you'll receive a full refund within 3-5 business days. They may also explain why and suggest alternatives, like seeing a doctor in person for a more thorough assessment.",
      },
      {
        q: "What if I need more than 2 days off?",
        a: "For extended sick leave, the doctor may need additional information or recommend an in-person consultation depending on your condition. They'll let you know the best path forward.",
      },
    ],
  },
  {
    title: "Prescriptions",
    faqs: [
      {
        q: "What medications can you prescribe?",
        a: "We can prescribe repeat medications for stable, ongoing conditions where you have an established treatment history. This includes common medications like blood pressure tablets, cholesterol medication, contraceptives, and more. We cannot prescribe: Schedule 8 controlled substances (opioids, ADHD meds, benzodiazepines), certain antibiotics, or medications requiring physical examination.",
      },
      {
        q: "What if my prescription request is declined?",
        a: "If the doctor determines a prescription isn\u2019t clinically appropriate, you'll receive a full refund. They may recommend alternatives or suggest an in-person consultation. Common reasons include: medication requires physical monitoring, it\u2019s a new medication, or there are potential interactions with your other medications.",
      },
      {
        q: "How do I receive my prescription?",
        a: "We use electronic prescribing (eRx). If approved, you'll receive an SMS with a token that you can present at any pharmacy in Australia. No paper script needed.",
      },
      {
        q: "Can you send it to my usual pharmacy?",
        a: "Absolutely. Just nominate your preferred pharmacy and we'll send it directly to them if your prescription is approved.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    faqs: [
      {
        q: "Is my information secure?",
        a: "Bank-level secure. We use 256-bit SSL encryption for all data transmission and storage. Your medical information is stored in Australia and complies with the Privacy Act 1988 and Australian Privacy Principles.",
      },
      {
        q: "Do you share my data with anyone?",
        a: "Never. We don\u2019t sell or share your data with third parties. Ever. The only exceptions are: sending prescriptions to your nominated pharmacy (because you asked us to), and complying with legal requirements (like mandatory disease reporting).",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, you can request full deletion of your account and data at any time. Note that we\u2019re legally required to retain medical records for 7 years as per Australian healthcare regulations.",
      },
    ],
  },
  {
    title: "Payments & Refunds",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "Visa, Mastercard, American Express, and digital wallets including Apple Pay and Google Pay. All payments are processed securely via Stripe. We don\u2019t store your card details.",
      },
      {
        q: "What's your refund policy?",
        a: "If we\u2019re unable to help you (e.g., your request is declined for clinical reasons), you'll receive a full refund within 3-5 business days. No questions asked, no hoops to jump through.",
      },
      {
        q: "Is there a Medicare rebate for the consultation?",
        a: "Our consultation fees aren't covered by Medicare as they\u2019re a private telehealth service. However, any prescriptions you receive are Medicare-eligible.",
      },
    ],
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export default function FAQPage() {
  // Flat list for schema.org structured data
  const allFaqs = faqCategories.flatMap((cat) =>
    cat.faqs.map((f) => ({ question: f.q, answer: f.a })),
  )

  // Map to AccordionSection groups format
  const accordionGroups = faqCategories.map((cat) => ({
    category: cat.title,
    items: cat.faqs.map((f) => ({ question: f.q, answer: f.a })),
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <FAQSchema faqs={allFaqs} />
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <CenteredHero
          pill="Help Centre"
          title="Got questions? We've got answers."
          highlightWords={["answers"]}
          subtitle="Everything you need to know about InstantMed."
        >
          <p className="text-sm text-muted-foreground">
            Can&apos;t find your answer?{" "}
            <Link
              href="/contact"
              className="text-primary hover:underline font-medium"
            >
              Get in touch
            </Link>
          </p>
        </CenteredHero>

        {/* FAQ Sections — 5 categories with accordion */}
        <AccordionSection
          title="Frequently Asked Questions"
          subtitle="Browse by category to find the answer you're looking for."
          highlightWords={["Questions"]}
          groups={accordionGroups}
        />

        {/* CTA */}
        <CTABanner
          title="Still have questions?"
          subtitle="Our support team typically responds within 2 hours."
          ctaText="Contact Support"
          ctaHref="/contact"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
