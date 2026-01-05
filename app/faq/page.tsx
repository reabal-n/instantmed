import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { MessageCircle, HelpCircle } from "lucide-react"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
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
        a: "We're an Australian telehealth service that connects you with registered GPs for medical certificates and prescription renewals. You submit your request online, and a doctor reviews it. They may approve it, request more information, or recommend an in-person consultation if needed.",
      },
      {
        q: "Is this service legal and legitimate?",
        a: "100% legitimate. InstantMed is operated by AHPRA-registered medical practitioners in Australia. All consultations are conducted by qualified GPs who follow the same clinical standards as in-person consultations. You can verify any doctor's registration on the public AHPRA register.",
      },
      {
        q: "How long does it take?",
        a: "Most requests are reviewed within 1-2 hours during business hours (8am-10pm AEST). We aim to respond within 24 hours maximum. If we can&apos;t help you, you get a full refund.",
      },
      {
        q: "How do I know if I need a GP visit instead?",
        a: "Our service is best for straightforward requests like sick certificates for minor illness and repeat prescriptions for stable conditions. If you have a new or complex condition, worsening symptoms, or need a physical examination, we'll recommend an in-person visit. Our doctors will let you know if that&apos;s the case.",
      },
      {
        q: "Will a doctor call me?",
        a: "The doctor reviews your request based on the information you provide. If they need clarification or have clinical concerns, they may contact you by phone or message. This is to ensure safe, appropriate care — it&apos;s a feature, not a bug.",
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
        a: "We can issue certificates for recent illness (within the last few days) if clinically appropriate based on your symptoms and history. The doctor makes the final decision on what dates are appropriate. We cannot backdate certificates for extended periods.",
      },
      {
        q: "What if my request is declined?",
        a: "If the doctor determines a certificate isn&apos;t clinically appropriate, you'll receive a full refund within 3-5 business days. They may also explain why and suggest alternatives, like seeing a GP in person for a more thorough assessment.",
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
        q: "What medications can you prescribe?",
        a: "We can prescribe repeat medications for stable, ongoing conditions where you have an established treatment history. This includes common medications like blood pressure tablets, cholesterol medication, contraceptives, and more. We cannot prescribe: Schedule 8 controlled substances (opioids, ADHD meds, benzodiazepines), certain antibiotics, or medications requiring physical examination.",
      },
      {
        q: "What if my prescription request is declined?",
        a: "If the doctor determines a prescription isn&apos;t clinically appropriate, you'll receive a full refund. They may recommend alternatives or suggest an in-person consultation. Common reasons include: medication requires physical monitoring, it&apos;s a new medication, or there are potential interactions with your other medications.",
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
    emoji: "🔒",
    faqs: [
      {
        q: "Is my information secure?",
        a: "Bank-level secure. We use 256-bit SSL encryption for all data transmission and storage. Your medical information is stored in Australia and complies with the Privacy Act 1988 and Australian Privacy Principles.",
      },
      {
        q: "Do you share my data with anyone?",
        a: "Never. We don&apos;t sell or share your data with third parties. Ever. The only exceptions are: sending prescriptions to your nominated pharmacy (because you asked us to), and complying with legal requirements (like mandatory disease reporting).",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, you can request full deletion of your account and data at any time. Note that we&apos;re legally required to retain medical records for 7 years as per Australian healthcare regulations.",
      },
    ],
  },
  {
    title: "Payments & Refunds",
    emoji: "💳",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "Visa, Mastercard, American Express, and digital wallets including Apple Pay and Google Pay. All payments are processed securely via Stripe. We don&apos;t store your card details.",
      },
      {
        q: "What's your refund policy?",
        a: "If we&apos;re unable to help you (e.g., your request is declined for clinical reasons), you'll receive a full refund within 3-5 business days. No questions asked, no hoops to jump through.",
      },
      {
        q: "Is there a Medicare rebate for the consultation?",
        a: "Our consultation fees aren't covered by Medicare as they&apos;re a private telehealth service. However, any prescriptions you receive are Medicare-eligible.",
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
                Got questions? <span className="text-gradient-mint">We&apos;ve got answers.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Everything you need to know about InstantMed. Can&apos;t find your answer?{" "}
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
                  Our support team is here to help. We typically respond within 2 hours (and yes, we&apos;re actually
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
