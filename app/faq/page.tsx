import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { MessageCircle, HelpCircle } from "lucide-react"

export const metadata = {
  title: "FAQs | InstantMed",
  description:
    "Frequently asked questions about InstantMed online medical consultations, prescriptions, and certificates.",
}

const faqCategories = [
  {
    title: "General",
    emoji: "💡",
    faqs: [
      {
        q: "What is InstantMed?",
        a: "We're an Australian telehealth service that connects you with registered GPs for medical certificates, prescription renewals, and specialist referrals. You submit your request online, and a doctor reviews it. They may approve it, request more information, or recommend an in-person consultation if needed.",
      },
      {
        q: "Is this actually legit?",
        a: "100%. InstantMed is operated by AHPRA-registered medical practitioners in Australia. All consultations are conducted by qualified GPs who follow the exact same clinical standards as in-person consultations.",
      },
      {
        q: "How long does it take?",
        a: "Most requests are reviewed within 2-4 hours during business hours. We aim to respond within 24 hours. If we can't help you, you get a full refund.",
      },
      {
        q: "Do I need to create an account?",
        a: "Yes, but it takes 2 minutes. We need to verify your identity and store your medical history for continuity of care. Your data is encrypted and never shared with third parties.",
      },
      {
        q: "Will a doctor call me?",
        a: "The doctor reviews your request based on the information you provide. If they need clarification or have clinical concerns, they may contact you by phone or message. This is to ensure safe, appropriate care.",
      },
    ],
  },
  {
    title: "Medical Certificates",
    emoji: "📋",
    faqs: [
      {
        q: "Will my employer actually accept this?",
        a: "Yes. Our medical certificates are issued by registered Australian GPs and are legally valid for all workplaces, universities, and Centrelink. They're identical in validity to certificates issued in-person.",
      },
      {
        q: "Can I get a backdated certificate?",
        a: "We can issue certificates for recent illness (within the last few days) if clinically appropriate based on your symptoms and history. The doctor makes the final decision on what dates are appropriate.",
      },
      {
        q: "What if I need more than 2 days off?",
        a: "For extended sick leave, the doctor may need additional information or recommend an in-person consultation depending on your condition. They'll let you know the best path forward.",
      },
    ],
  },
  {
    title: "Prescriptions",
    emoji: "💊",
    faqs: [
      {
        q: "Can you prescribe any medication?",
        a: "We can prescribe repeat medications for stable, ongoing conditions where you have an established history. We cannot prescribe controlled substances (Schedule 8), certain antibiotics, or medications requiring physical examination. Every prescription decision is made by the reviewing doctor based on clinical appropriateness.",
      },
      {
        q: "How do I receive my prescription?",
        a: "We use electronic prescribing (eRx). If approved, you'll receive an SMS with a token that you can present at any pharmacy in Australia.",
      },
      {
        q: "Can you send it to my usual pharmacy?",
        a: "Absolutely. Just nominate your preferred pharmacy and we'll send it directly to them if your prescription is approved.",
      },
      {
        q: "What if my prescription request is declined?",
        a: "If the doctor determines a prescription isn't clinically appropriate based on the information provided, you'll receive a full refund. They may also recommend alternative options or suggest an in-person consultation.",
      },
    ],
  },
  {
    title: "Referrals",
    emoji: "🏥",
    faqs: [
      {
        q: "How long is a referral valid?",
        a: "Standard GP referrals are valid for 12 months from the date of issue. Some specialists may require a new referral after this period, but that's on them, not us.",
      },
      {
        q: "Do referrals include Medicare rebates?",
        a: "Yes, our referrals are Medicare-compliant. You'll receive the standard Medicare rebate when you see the specialist. No funny business.",
      },
      {
        q: "Can I get a referral for any specialist?",
        a: "We can refer to most specialists including dermatologists, psychiatrists, cardiologists, and more. Some referrals may require additional clinical information, but we'll guide you through it.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    emoji: "🔒",
    faqs: [
      {
        q: "Is my information secure?",
        a: "Bank-level secure. We use 256-bit SSL encryption for all data transmission and storage. Your medical information is stored in Australia and complies with the Privacy Act 1988. We take this stuff seriously.",
      },
      {
        q: "Do you share my data with anyone?",
        a: "Never. We don't sell or share your data with third parties. Ever. The only exception is when we need to send a prescription to your nominated pharmacy (because, you know, you asked us to).",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, you can request full deletion of your account and data at any time. Note that we're legally required to retain medical records for 7 years (blame the government, not us).",
      },
    ],
  },
  {
    title: "Payments & Refunds",
    emoji: "💳",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "Visa, Mastercard, American Express, and digital wallets including Apple Pay and Google Pay. All payments are processed securely via Stripe. We don't store your card details.",
      },
      {
        q: "What's your refund policy?",
        a: "If we're unable to help you (e.g., your request is declined for clinical reasons), you'll receive a full refund within 3-5 business days. No questions asked, no hoops to jump through.",
      },
      {
        q: "Is there a Medicare rebate for the consult?",
        a: "Our consultation fees aren't covered by Medicare as they're a private telehealth service. However, any prescriptions or referrals you receive are Medicare-eligible. So you save on time, if not on the consult fee.",
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-[#00E2B5]/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-[#00E2B5]/10 text-[#00E2B5] border-0 px-4 py-1.5">
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                Help Centre
              </Badge>
              <h1
                className="text-4xl md:text-5xl font-bold text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Got questions? <span className="text-gradient-mint">We've got answers.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Everything you need to know about InstantMed. Can't find your answer?{" "}
                <Link href="/contact" className="text-[#00E2B5] hover:underline">
                  Hit us up
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-12 pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-10">
              {faqCategories.map((category, catIndex) => (
                <div
                  key={category.title}
                  className="animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.1 + catIndex * 0.1}s`, animationFillMode: "forwards" }}
                >
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                    <span className="text-2xl">{category.emoji}</span>
                    {category.title}
                  </h2>
                  <TiltCard>
                    <Accordion type="single" collapsible className="overflow-hidden">
                      {category.faqs.map((faq, faqIndex) => (
                        <AccordionItem
                          key={faqIndex}
                          value={`${catIndex}-${faqIndex}`}
                          className="border-b border-white/10 last:border-0"
                        >
                          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline hover:bg-white/5 transition-colors">
                            <span className="font-medium text-foreground pr-4">{faq.q}</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-4 text-muted-foreground leading-relaxed">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TiltCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <TiltCard className="p-8">
                <div className="text-4xl mb-4">🤔</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Still scratching your head?</h2>
                <p className="text-muted-foreground mb-6">
                  Our support team is here to help. We typically respond within 2 hours (and yes, we're actually
                  helpful).
                </p>
                <Button asChild className="rounded-full btn-premium text-[#0A0F1C]">
                  <Link href="/contact">
                    <MessageCircle className="mr-2 w-4 h-4" />
                    Contact Support
                  </Link>
                </Button>
              </TiltCard>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
