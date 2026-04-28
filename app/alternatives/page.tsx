import type { Metadata } from "next"
import Link from "next/link"

import { BreadcrumbSchema, FAQSchema, HealthArticleSchema } from "@/components/seo"
import { PRICING } from "@/lib/constants"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Alternatives for Getting a Medical Certificate in Australia | InstantMed" },
  description:
    "Your options when you need a medical certificate in Australia. In-person GP, walk-in clinic, online telehealth, statutory declaration, and employer self-certification compared.",
  keywords: [
    "medical certificate alternatives australia",
    "options for medical certificate",
    "online vs in-person medical certificate",
    "telehealth medical certificate australia",
    "statutory declaration sick leave",
  ],
  openGraph: {
    title: "Alternatives for Getting a Medical Certificate in Australia",
    description:
      "Compare your options for getting a medical certificate. In-person GP, walk-in clinic, online telehealth, statutory declaration.",
    url: "https://instantmed.com.au/alternatives",
    type: "article",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  alternates: {
    canonical: "https://instantmed.com.au/alternatives",
  },
}

const FAQ_ITEMS = [
  {
    question: "Is an online medical certificate as valid as one from my regular GP?",
    answer:
      "Yes. Under the Fair Work Act 2009 (Cth) s 107, a medical certificate from any AHPRA-registered medical practitioner is acceptable evidence for paid personal or carer's leave. Australian employers are required to accept it on the same basis as an in-person certificate.",
  },
  {
    question: "When should I see an in-person GP instead of using telehealth?",
    answer:
      "If you need a physical examination (chest auscultation, abdominal palpation, ear/throat exam), if you require diagnostic tests like blood work or imaging, or if your condition is severe or worsening, an in-person consultation is the appropriate option. Telehealth is best suited to short-duration certificates for self-limiting illnesses.",
  },
  {
    question: "Can I just write my own statement instead of getting a certificate?",
    answer:
      "Some employers accept a statutory declaration for short absences. The Fair Work Act allows employers to set their own evidence requirements within reason. Check your enterprise agreement or employee handbook. For absences longer than two consecutive days, most employers require a medical certificate.",
  },
  {
    question: "Are walk-in clinics faster than booking my regular GP?",
    answer:
      "Walk-in clinics typically have shorter wait times than appointment-based clinics, but you may still wait 30-90 minutes during busy periods. Costs depend on whether the clinic bulk-bills. Telehealth is generally faster again because there is no travel or waiting room.",
  },
  {
    question: "How much does each option typically cost?",
    answer: `Bulk-billing GP: $0 out of pocket. Privately-billed GP: around $50-$90 after the Medicare rebate. Walk-in clinics: similar to private GPs, $40-$80. Online telehealth medical certificate (InstantMed): from $${PRICING.MED_CERT.toFixed(2)}, no Medicare needed. Statutory declaration: free if you draft it yourself.`,
  },
  {
    question: "Will my employer accept any of these options?",
    answer:
      "Medical certificates from any AHPRA-registered practitioner (in-person or online) are accepted under Fair Work Act s 107. Statutory declarations are accepted at employer discretion and are typically used for shorter absences. Self-certification is governed by your specific employer's policy.",
  },
]

interface OptionCard {
  title: string
  whenItWorks: string
  whenItDoesnt: string
  typicalCost: string
  typicalTime: string
}

const OPTIONS: OptionCard[] = [
  {
    title: "Visit your regular GP",
    whenItWorks:
      "When you have an established relationship with your doctor, need a thorough examination, or have a chronic condition that benefits from continuity of care.",
    whenItDoesnt:
      "When booking takes days, when you cannot leave home because you are unwell, or when you need a certificate the same day for a short absence.",
    typicalCost: "$0 (bulk-billed) to $50-$90 (privately billed, after Medicare rebate)",
    typicalTime: "Same day to several days for an appointment, plus travel and waiting time",
  },
  {
    title: "Walk-in clinic or urgent care centre",
    whenItWorks:
      "When you need to be seen in person and your regular GP is not available. Useful for minor injuries, acute illnesses, and after-hours visits.",
    whenItDoesnt:
      "When you do not feel well enough to leave home, or when wait times stretch into hours during peak demand.",
    typicalCost: "$40-$80 typically, varies by clinic and bulk-billing status",
    typicalTime: "30-90 minutes wait during busy periods, plus travel time",
  },
  {
    title: "Online telehealth medical certificate",
    whenItWorks:
      "When your condition is short-duration and self-limiting, you do not need a physical examination, and you want to avoid travel or waiting rooms. Common examples: cold, flu, gastroenteritis, migraine.",
    whenItDoesnt:
      "When your condition needs an in-person examination, diagnostic tests, or is severe or worsening. Telehealth providers will decline and refund in those cases.",
    typicalCost: `From $${PRICING.MED_CERT.toFixed(2)}, no Medicare required. Refund if a doctor cannot help.`,
    typicalTime: "Form takes around 2 minutes. Doctor review usually within 20 minutes. Certificate emailed as a PDF.",
  },
  {
    title: "Statutory declaration",
    whenItWorks:
      "Many employers accept a statutory declaration for absences of one or two days when a medical certificate is not strictly required. Check your employment agreement or HR policy.",
    whenItDoesnt:
      "When the absence is longer than two consecutive days, or when your enterprise agreement specifically requires medical evidence. Not all employers accept statutory declarations.",
    typicalCost: "Free if you draft and witness it yourself. Some workplaces provide a template.",
    typicalTime: "5-10 minutes to complete. Must be witnessed by an authorised person (e.g. JP, pharmacist).",
  },
  {
    title: "Self-certification with your employer",
    whenItWorks:
      "Some workplaces let employees self-certify for short absences without a medical certificate. Common in workplaces with paid personal leave entitlements where evidence is requested only for longer absences or patterns of absence.",
    whenItDoesnt:
      "When your enterprise agreement, HR policy, or specific manager requires medical evidence. When the absence is longer than the self-certification window.",
    typicalCost: "Free.",
    typicalTime: "Typically a single email or HRIS form entry.",
  },
]

export default function AlternativesPage() {
  return (
    <>
      <FAQSchema faqs={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Alternatives", url: "https://instantmed.com.au/alternatives" },
        ]}
      />
      <HealthArticleSchema
        title="Alternatives for Getting a Medical Certificate in Australia"
        description="Compare your options for obtaining a medical certificate in Australia: in-person GP, walk-in clinic, online telehealth, statutory declaration, and employer self-certification."
        url="/alternatives"
      />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="pt-12 pb-10 sm:pt-20 sm:pb-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80 mb-4">
              Your options
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-balance leading-[1.1] mb-5">
              When you need a medical certificate, what are your options?
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-balance max-w-2xl mx-auto">
              There is no single right way to get a medical certificate in Australia. Your circumstances decide the best fit. Here is a calm comparison of the five main paths, with no pressure to pick ours.
            </p>
          </div>
        </section>

        {/* Options grid */}
        <section className="pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-5">
            {OPTIONS.map((option, i) => (
              <article
                key={option.title}
                className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] p-6 sm:p-8"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[11px] font-mono text-muted-foreground/60">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                    {option.title}
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-success mb-1.5">
                      When it works
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {option.whenItWorks}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      When it does not
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {option.whenItDoesnt}
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 pt-4 border-t border-border/40 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                      Typical cost
                    </span>
                    <span className="text-foreground/80">{option.typicalCost}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                      Typical time
                    </span>
                    <span className="text-foreground/80">{option.typicalTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Legal validity note */}
        <section className="pb-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto rounded-2xl bg-success/[0.04] dark:bg-success/[0.08] border border-success/20 p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
              All medical certificates carry the same legal weight
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed mb-2">
              Under the Fair Work Act 2009 (Cth), s 107, a medical certificate from any AHPRA-registered medical practitioner is acceptable evidence for paid personal or carer&apos;s leave. The legal validity does not depend on whether the consultation was in person or via telehealth.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An online certificate from an AHPRA-registered GP is accepted on the same basis as one from your regular family GP. The format of the consultation does not change the legal weight of the document.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground text-center mb-8">
              Common questions
            </h2>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.04] open:shadow-md open:shadow-primary/[0.08] transition-shadow"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 p-5">
                    <h3 className="text-sm sm:text-base font-medium text-foreground">{item.question}</h3>
                    <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45 shrink-0" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA - calm, no urgency */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
          <div className="max-w-2xl mx-auto text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              If online telehealth fits your situation
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              An AHPRA-registered Australian GP reviews your request, usually within 20 minutes, and emails the certificate to you as a PDF. Full refund if our doctor cannot help.
            </p>
            <div className="pt-2">
              <Link
                href="/medical-certificate"
                className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-7 h-12 text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-[box-shadow,transform]"
              >
                See how an online certificate works
              </Link>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Or call your GP, drop into a walk-in clinic, or ask your employer about self-certification. All are valid paths.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
