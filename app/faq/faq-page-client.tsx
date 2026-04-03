"use client"

import Link from "next/link"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CenteredHero } from "@/components/heroes"
import { AccordionSection, CTABanner } from "@/components/sections"

/* ────────────────────────────── FAQ Data ────────────────────────────── */

const faqCategories = [
  {
    title: "General",
    faqs: [
      {
        q: "What is InstantMed?",
        a: "We\u2019re an Australian telehealth service that connects you with AHPRA-registered GPs for medical certificates, prescription renewals, and consultations. You fill in a quick form online, a real doctor reviews it, and you get your result. Medical certificates are typically issued in under 30 minutes, available 24/7.",
      },
      {
        q: "Is this actually legitimate?",
        a: "Completely. Every doctor on InstantMed is AHPRA-registered and follows the same clinical standards as in-person consultations. You can verify any doctor\u2019s registration on the public AHPRA register. Same rules, same standards \u2014 just more convenient.",
      },
      {
        q: "How long does it take?",
        a: "Most requests are reviewed within 1\u20132 hours during our operating hours (8am\u201310pm AEST, 7 days). If we can\u2019t help you, you get a full refund \u2014 no questions asked.",
      },
      {
        q: "How do I know if I need an in-person visit instead?",
        a: "We\u2019re best for straightforward things \u2014 sick certificates for common illness, repeat medication for stable conditions, and routine consultations. If something needs hands-on care, our doctors will let you know and recommend seeing a GP in person. That\u2019s the responsible thing to do.",
      },
      {
        q: "How does the doctor decide on my request?",
        a: "The same way they would in a clinic. A real doctor reviews your symptoms, history, and request. If it\u2019s safe and clinically appropriate, they approve it. If not, they\u2019ll ask for more info, suggest alternatives, or point you toward in-person care.",
      },
      {
        q: "Why was my request declined?",
        a: "It usually means the doctor felt an in-person assessment would be safer \u2014 for example, if symptoms suggest something that needs a physical exam. It\u2019s not personal, it\u2019s good medicine. You\u2019ll always get a full refund if we can\u2019t help.",
      },
      {
        q: "Will a doctor call me?",
        a: "Most requests are handled online without a call. But if the doctor needs to clarify something or has a clinical concern, they may reach out by phone or message. Think of it as your doctor being thorough \u2014 it\u2019s a good sign.",
      },
    ],
  },
  {
    title: "Telehealth & How It Works",
    faqs: [
      {
        q: "How does telehealth compare to seeing a GP in person?",
        a: "For many routine matters \u2014 sick certificates, repeat prescriptions, follow-up consultations \u2014 the clinical outcome is the same. The difference is you skip the waiting room and the drive. That said, some things genuinely need hands-on care, and our doctors will always tell you if that\u2019s the case.",
      },
      {
        q: "Can a telehealth doctor do everything an in-person doctor can?",
        a: "Not everything, and we\u2019re upfront about that. Telehealth is excellent for history-based assessments, medication management, and documentation. It can\u2019t replace a physical examination, blood tests, or procedures. If your situation needs any of those, we\u2019ll point you to the right place.",
      },
      {
        q: "Is telehealth regulated in Australia?",
        a: "Absolutely. Telehealth in Australia is regulated by AHPRA, the Medical Board of Australia, and the TGA \u2014 the same bodies that oversee in-person care. Our doctors are held to identical clinical and ethical standards whether they see you in a clinic or review your request online.",
      },
      {
        q: "What technology do I need to use InstantMed?",
        a: "A device with a web browser and an internet connection. That\u2019s it. No app to download, no special software, no video call setup. You fill in a form, a doctor reviews it, and you get your result. Deliberately simple.",
      },
      {
        q: "Can I use InstantMed if I\u2019m in a rural area?",
        a: "Yes \u2014 and this is one of the things telehealth does best. If you\u2019re hours from the nearest GP or your local clinic is booked out for weeks, we can help with the same routine matters we handle for anyone else. All you need is an internet connection.",
      },
    ],
  },
  {
    title: "Consultations",
    faqs: [
      {
        q: "What types of consultations do you offer?",
        a: "We offer general consultations, erectile dysfunction consults, hair loss consults, women\u2019s health consults, and weight management consults. Each is reviewed by an AHPRA-registered doctor who\u2019ll assess whether we can help or whether you\u2019d be better off with in-person care.",
      },
      {
        q: "Can I get a referral to a specialist?",
        a: "Our doctors can provide referrals to specialists where clinically appropriate. If your consultation reveals something that needs specialist input, the doctor will issue a referral as part of your consult \u2014 no extra charge.",
      },
      {
        q: "What happens after my consultation?",
        a: "Depends on the outcome. If the doctor approves a prescription, you\u2019ll receive an eScript via SMS. If they issue a certificate or referral, it\u2019ll appear in your patient dashboard. If they need more information or recommend in-person care, they\u2019ll let you know directly.",
      },
      {
        q: "Can I use InstantMed for mental health concerns?",
        a: "For some things, yes \u2014 like renewing a stable antidepressant prescription or getting a mental health care plan referral. But telehealth has limits here, and we respect them. If you\u2019re in crisis or need ongoing therapy, we\u2019ll direct you to appropriate services. If you need immediate support, contact Lifeline on 13 11 14 or Beyond Blue on 1300 22 4636.",
      },
    ],
  },
  {
    title: "Medical Certificates",
    faqs: [
      {
        q: "Will my employer actually accept this?",
        a: "Yes \u2014 our certificates are issued by registered Australian doctors and are legally valid for all workplaces, universities, and Centrelink. They carry the same weight as a certificate from an in-person visit.",
      },
      {
        q: "Can I get a backdated certificate?",
        a: "We can cover recent illness (within the last few days) if it makes clinical sense based on your symptoms and history. The doctor has the final say on dates \u2014 they\u2019ll work with you to get it right.",
      },
      {
        q: "What if my request is declined?",
        a: "You\u2019ll get a full refund within 3\u20135 business days. The doctor may also explain why and suggest an alternative, like an in-person visit for a more thorough assessment.",
      },
      {
        q: "What if I need more than 2 days off?",
        a: "For longer absences, the doctor may need a bit more detail about your condition or recommend an in-person visit. They\u2019ll guide you on the best next step.",
      },
      {
        q: "Can I get a certificate for carer\u2019s leave?",
        a: "Yes. If you\u2019re caring for an immediate family or household member who\u2019s sick or injured, our doctors can issue a carer\u2019s leave certificate. You\u2019ll need to provide some basic details about the person you\u2019re caring for and the nature of their illness or injury.",
      },
      {
        q: "Do universities accept online medical certificates?",
        a: "They do. Our certificates are issued by AHPRA-registered doctors and meet the same standard as any GP-issued certificate. Australian universities accept them for special consideration applications, deferred exams, and extension requests. We\u2019ve seen thousands used for exactly this.",
      },
    ],
  },
  {
    title: "Repeat Medication",
    faqs: [
      {
        q: "What medications can you prescribe?",
        a: "We focus on repeat medications for stable, ongoing conditions \u2014 things like blood pressure tablets, cholesterol medication, contraceptives, and similar. Some medications need in-person care first (like controlled substances or brand-new prescriptions), and we think that\u2019s the right call.",
      },
      {
        q: "What if my prescription request is declined?",
        a: "You\u2019ll get a full refund. The doctor may suggest alternatives or recommend an in-person visit \u2014 common reasons include needing physical monitoring or potential interactions with other medications.",
      },
      {
        q: "How do I receive my medication?",
        a: "Via SMS \u2014 you\u2019ll get a token you can show at any pharmacy in Australia. No paper needed, just your phone.",
      },
      {
        q: "Can you send it to my usual pharmacy?",
        a: "Absolutely. Nominate your preferred pharmacy and we\u2019ll send it directly to them.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    faqs: [
      {
        q: "Is my information secure?",
        a: "Your medical info is encrypted, stored in Australia, and fully compliant with the Privacy Act and Australian Privacy Principles. We take data security seriously \u2014 it\u2019s not an afterthought.",
      },
      {
        q: "Do you share my data with anyone?",
        a: "Your data is yours. We don\u2019t sell or share it with third parties. The only exceptions are things you\u2019d expect \u2014 sending prescriptions to your nominated pharmacy, and complying with legal requirements like mandatory disease reporting.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, just get in touch and we\u2019ll handle it. The only caveat: we\u2019re legally required to retain medical records for 7 years under Australian healthcare regulations.",
      },
      {
        q: "Where is my data stored?",
        a: "All data is stored on Australian servers. Your medical information is encrypted at rest using AES-256 encryption \u2014 the same standard used by banks. We don\u2019t store data offshore, and we don\u2019t cut corners on infrastructure.",
      },
      {
        q: "Do you comply with Australian Privacy Principles?",
        a: "Fully. We comply with all 13 Australian Privacy Principles under the Privacy Act 1988. That covers everything from how we collect and store your information to how we handle access requests and complaints. If you want the details, our privacy policy spells it out.",
      },
    ],
  },
  {
    title: "Payments & Refunds",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "Visa, Mastercard, Amex, Apple Pay, and Google Pay. Payments are processed securely via Stripe \u2014 we never see or store your card details.",
      },
      {
        q: "What\u2019s your refund policy?",
        a: "If we can\u2019t help you \u2014 for example, if your request is declined for clinical reasons \u2014 you get a full refund within 3\u20135 business days. No hoops, no hassle.",
      },
      {
        q: "Is there a Medicare rebate?",
        a: "Our consultation fees aren\u2019t covered by Medicare as we\u2019re a private telehealth service. That said, any prescriptions you receive can still attract PBS subsidies at the pharmacy.",
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

        {/* FAQ Sections — 7 categories with accordion */}
        <AccordionSection
          groups={accordionGroups}
          hideHeader
        />

        {/* CTA */}
        <CTABanner
          title="Still have questions?"
          subtitle="Our support team is here to help — reach out anytime."
          ctaText="Contact Support"
          ctaHref="/contact"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
