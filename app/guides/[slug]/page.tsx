import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  Clock, 
  Shield, 
  CheckCircle2, 
  FileText,
  Star,
  Zap,
  AlertCircle,
  Info
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"

// How-to guides for high-intent SEO traffic
const guides: Record<string, {
  title: string
  slug: string
  description: string
  lastUpdated: string
  readTime: string
  heroImage?: string
  intro: string
  steps: Array<{
    title: string
    content: string
    tips?: string[]
  }>
  importantNotes: string[]
  faqs: Array<{ q: string; a: string }>
  cta: {
    text: string
    href: string
    subtext: string
  }
}> = {
  "how-to-get-medical-certificate-for-work": {
    title: "How to Get a Medical Certificate for Work in Australia",
    slug: "how-to-get-medical-certificate-for-work",
    description: "A complete guide to getting a valid medical certificate for work in Australia. Learn your options, what employers accept, and the fastest ways to get one.",
    lastUpdated: "January 2025",
    readTime: "6 min read",
    intro: "Need time off work due to illness? In Australia, employers can request a medical certificate for sick leave, especially for absences of more than 2 days. This guide explains all your options for getting one — from your regular GP to telehealth services that can have you sorted in under an hour.",
    steps: [
      {
        title: "Understand when you need a medical certificate",
        content: "Under Australian workplace law, your employer can request a medical certificate for any period of sick leave. Most commonly, they'll ask for one if you're away for more than 2 consecutive days, or if there's a pattern of absences (like always being sick on Mondays). Some workplaces require certificates from day one — check your employment contract or company policy.",
        tips: [
          "Check your workplace policy — some require certificates from day one",
          "Casual employees may still need certificates for consistent work patterns",
          "You don't need to disclose your specific diagnosis on most certificates"
        ]
      },
      {
        title: "Choose how to see a doctor",
        content: "You have several options for getting a medical certificate in Australia. Your regular GP is always an option, but appointments can take days to get. After-hours clinics work for evenings and weekends but often have long waits. Telehealth services like InstantMed let you get assessed online — typically in under an hour, without leaving home.",
        tips: [
          "GP clinics: Usually need an appointment, may have wait times of days",
          "Walk-in clinics: No appointment but often 1-2 hour waits",
          "Telehealth: Fastest option, done from home, usually under 1 hour"
        ]
      },
      {
        title: "Complete your consultation",
        content: "Whether in-person or online, the doctor will ask about your symptoms, how long you've been unwell, and how it's affecting your ability to work. Be honest — doctors can tell when symptoms don't match up, and it's not worth the risk to your professional reputation. For telehealth, you'll typically fill out a questionnaire and may exchange messages with the doctor.",
        tips: [
          "Describe your symptoms clearly and honestly",
          "Mention how your condition affects your ability to do your job",
          "If you need specific dates covered, let the doctor know"
        ]
      },
      {
        title: "Receive your certificate",
        content: "If the doctor agrees you're unfit for work, they'll issue a medical certificate. This will include the dates you're certified as unfit, the doctor's details, and usually a general statement about your fitness for work (without revealing your diagnosis). For telehealth services, the certificate is typically emailed as a PDF that you can forward directly to your employer.",
        tips: [
          "Medical certificates don't usually include your specific diagnosis",
          "PDF certificates are accepted by all Australian employers",
          "Keep a copy for your own records"
        ]
      },
      {
        title: "Submit to your employer",
        content: "Most employers accept certificates via email. Simply forward the PDF or attach it to your leave request in your HR system. Some employers may want the original for their files — you can print the PDF or ask if a digital copy is acceptable. The certificate is a legal medical document, so treat it accordingly."
      }
    ],
    importantNotes: [
      "Medical certificates from telehealth services are legally valid and accepted by all Australian employers",
      "Doctors cannot backdate certificates for days they didn't assess you (though they may certify recent days if clinically appropriate)",
      "Faking illness or providing false information to obtain a certificate is fraud and grounds for dismissal",
      "You have the right to privacy — your employer can request a certificate but cannot demand to know your diagnosis"
    ],
    faqs: [
      {
        q: "Will my employer accept an online medical certificate?",
        a: "Yes. Medical certificates from telehealth services are issued by AHPRA-registered doctors and are legally valid. They're accepted by all Australian employers, universities, and government bodies."
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Mental health is a legitimate medical reason for time off work. Doctors can issue certificates for anxiety, stress, or other mental health conditions affecting your ability to work."
      },
      {
        q: "How far can a medical certificate be backdated?",
        a: "Doctors can only certify conditions they've assessed. However, if you're still unwell when you see a doctor, they may certify that you've been unfit for work for a recent period if that's clinically appropriate."
      },
      {
        q: "What if I can't afford to see a doctor?",
        a: "Many GP clinics offer bulk billing (free with Medicare). Telehealth services have fixed fees starting from around $20. Some workplaces also have Employee Assistance Programs that cover medical consultations."
      },
      {
        q: "Can my employer refuse my medical certificate?",
        a: "Generally, no. A valid medical certificate from a registered doctor is evidence that you were unfit for work. However, employers can request additional information in some circumstances or ask you to see a company-appointed doctor for extended absences."
      }
    ],
    cta: {
      text: "Get a medical certificate now",
      href: "/start?service=med-cert",
      subtext: "From $19.95 · Usually ready in under 1 hour"
    }
  },
  "how-to-get-sick-note-for-uni": {
    title: "How to Get a Sick Note for University in Australia",
    slug: "how-to-get-sick-note-for-uni",
    description: "Need a medical certificate for a missed exam, assignment extension, or university absence? Here's how to get one quickly and what your university will accept.",
    lastUpdated: "January 2025",
    readTime: "5 min read",
    intro: "Whether you've missed an exam, need an assignment extension, or have been too unwell to attend classes, most Australian universities require a medical certificate as supporting documentation. This guide explains how to get one and what universities typically accept.",
    steps: [
      {
        title: "Check your university's requirements",
        content: "Each university has its own policies for medical documentation. Most require certificates for missed exams (special consideration), assignment extensions beyond a few days, and prolonged absences. Check your university's special consideration or academic support pages for specific requirements.",
        tips: [
          "Most unis have online portals for special consideration applications",
          "Deadlines for applications vary — some require submission within days",
          "Some universities have their own medical certificate forms"
        ]
      },
      {
        title: "Get your medical certificate",
        content: "You can get a certificate from any registered Australian doctor — your GP, a clinic, or a telehealth service. For time-sensitive situations like missed exams, telehealth is often the fastest option. The certificate needs to cover the relevant dates and indicate that you were unfit for study or to attend the exam.",
        tips: [
          "Make sure the certificate covers the specific dates you need",
          "If you missed an exam, the certificate should cover that specific date",
          "Get your certificate as soon as possible — don't wait until you've recovered"
        ]
      },
      {
        title: "Submit your application",
        content: "Most universities have online systems for submitting special consideration requests or extension applications. You'll typically need to upload your medical certificate, explain how your illness affected your studies, and submit within the specified timeframe. Keep copies of everything you submit.",
        tips: [
          "Submit as early as possible — deadlines are often strict",
          "Include a brief explanation of how your illness impacted your work",
          "Check if you need to notify your lecturer/tutor separately"
        ]
      },
      {
        title: "Follow up if needed",
        content: "After submitting, you should receive confirmation. If your application is approved, you'll be informed of the outcome — this might be a deferred exam, extension, or other arrangement. If there are any issues with your documentation, the university will usually contact you to request more information."
      }
    ],
    importantNotes: [
      "Universities accept medical certificates from telehealth services — they're issued by registered doctors",
      "Apply for special consideration as soon as possible, even if you're still unwell",
      "Keep records of all your submissions and communications",
      "If you're experiencing ongoing health issues affecting your studies, talk to your university's student support services"
    ],
    faqs: [
      {
        q: "Will my university accept an online medical certificate?",
        a: "Yes. Australian universities accept certificates from any AHPRA-registered doctor, including those practicing via telehealth. The certificate needs to be legitimate and include the doctor's registration details."
      },
      {
        q: "What if I was too sick to see a doctor on the day?",
        a: "See a doctor as soon as you can. If you're still unwell, the doctor can often certify that you've been unfit for recent days. Explain your situation to both the doctor and in your special consideration application."
      },
      {
        q: "Can I get a certificate for mental health reasons?",
        a: "Absolutely. Mental health conditions are legitimate medical reasons for special consideration. You don't need to disclose your specific diagnosis — the certificate just needs to confirm you were unfit for study."
      },
      {
        q: "How specific does the certificate need to be?",
        a: "It should include the dates you were unfit for study, the doctor's details and registration number, and a statement about your fitness for study. It doesn't need to include your specific diagnosis."
      }
    ],
    cta: {
      text: "Get your certificate now",
      href: "/start?service=med-cert",
      subtext: "From $19.95 · Perfect for special consideration applications"
    }
  },
  "telehealth-guide-australia": {
    title: "Complete Guide to Telehealth in Australia",
    slug: "telehealth-guide-australia",
    description: "Everything you need to know about telehealth in Australia — what it is, how it works, what can be treated, and how to choose a telehealth service.",
    lastUpdated: "January 2025",
    readTime: "8 min read",
    intro: "Telehealth has transformed healthcare access in Australia, especially since 2020. Whether you're in a remote area, have mobility issues, or simply prefer the convenience, telehealth offers a legitimate alternative to in-person GP visits for many health concerns. Here's everything you need to know.",
    steps: [
      {
        title: "What is telehealth?",
        content: "Telehealth refers to healthcare services delivered remotely using technology. This can include video consultations, phone calls, or asynchronous services (where you submit information and a doctor reviews it and responds). In Australia, telehealth services are provided by registered doctors and are subject to the same regulations as in-person care.",
        tips: [
          "Telehealth is regulated by AHPRA, just like in-person care",
          "Doctors providing telehealth must be registered in Australia",
          "Services can be synchronous (real-time) or asynchronous (review and respond)"
        ]
      },
      {
        title: "What can telehealth treat?",
        content: "Telehealth is suitable for many common health concerns that don't require physical examination. This includes cold and flu symptoms, mental health support, medication reviews, skin conditions (via photos), urinary tract infections, medical certificates, and repeat prescriptions. It's not suitable for emergencies, conditions requiring examination, or complex cases needing ongoing physical monitoring.",
        tips: [
          "Good for: Common illnesses, mental health, skin issues, scripts, certificates",
          "Not suitable for: Emergencies, conditions needing physical exam, complex cases",
          "When in doubt, a telehealth doctor can advise if you need in-person care"
        ]
      },
      {
        title: "How to use a telehealth service",
        content: "Most telehealth services work similarly: you create an account or provide your details, describe your health concern or symptoms, and either connect with a doctor immediately (video/phone) or have your case reviewed and responded to (asynchronous). You'll receive advice, prescriptions (sent electronically to your pharmacy), or medical certificates as needed.",
        tips: [
          "Have your Medicare card ready if you want to claim rebates",
          "Prepare a list of your current medications",
          "Be in a private space with good internet/phone reception",
          "Have a way to receive electronic prescriptions (phone for SMS)"
        ]
      },
      {
        title: "Costs and Medicare",
        content: "Telehealth consultation costs vary by provider. Some services bulk bill (free with Medicare), while others charge a fee. Private telehealth services typically charge $20-80 per consultation. If you pay upfront, you may be able to claim a Medicare rebate for eligible consultations. Always check what's covered before your appointment.",
        tips: [
          "Bulk-billed telehealth is available from some providers",
          "Private services often have shorter wait times",
          "Medicare rebates apply to many telehealth consultations",
          "Check if your private health insurance covers telehealth"
        ]
      },
      {
        title: "Choosing a telehealth provider",
        content: "When choosing a telehealth service, consider: Are the doctors AHPRA registered? What are the wait times? Is it suitable for your health concern? What are the costs? Is there support available if you have questions? Reputable services will clearly display their doctors' credentials and have transparent pricing."
      }
    ],
    importantNotes: [
      "Always use services staffed by AHPRA-registered Australian doctors",
      "Telehealth is not appropriate for emergencies — call 000",
      "E-prescriptions from telehealth work at any Australian pharmacy",
      "Your telehealth records are part of your medical history and subject to the same privacy protections",
      "If a telehealth doctor thinks you need in-person care, they'll tell you"
    ],
    faqs: [
      {
        q: "Is telehealth as good as seeing a doctor in person?",
        a: "For appropriate conditions, telehealth can be just as effective. Many health issues don't require physical examination. However, telehealth isn't suitable for everything — a good telehealth service will refer you for in-person care when needed."
      },
      {
        q: "Are telehealth prescriptions legitimate?",
        a: "Yes. Prescriptions from telehealth doctors are legally valid. They're typically sent as e-prescriptions (electronic tokens) that you can use at any pharmacy in Australia."
      },
      {
        q: "Can I get a medical certificate through telehealth?",
        a: "Yes. Medical certificates from telehealth consultations are legally valid and accepted by all Australian employers and universities."
      },
      {
        q: "What about Medicare and bulk billing?",
        a: "Some telehealth services bulk bill (free with Medicare). Others charge a fee, for which you may be able to claim a Medicare rebate. This varies by provider and consultation type."
      },
      {
        q: "Is my information private?",
        a: "Yes. Telehealth services are bound by the same privacy laws as in-person healthcare. Your information is protected and only shared as necessary for your care."
      }
    ],
    cta: {
      text: "Try InstantMed telehealth",
      href: "/start",
      subtext: "Australian doctors · Fast response · From $19.95"
    }
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = guides[slug]
  if (!guide) return {}

  return {
    title: `${guide.title} | InstantMed`,
    description: guide.description,
    keywords: [
      guide.slug.split('-').join(' '),
      'medical certificate australia',
      'telehealth australia',
      'online doctor',
    ],
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://instantmed.com.au/guides/${slug}`,
      type: 'article',
    },
    alternates: {
      canonical: `https://instantmed.com.au/guides/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(guides).map((slug) => ({ slug }))
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params
  const guide = guides[slug]

  if (!guide) {
    notFound()
  }

  const faqSchemaData = guide.faqs.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Guides", url: "https://instantmed.com.au/guides" },
          { name: guide.title, url: `https://instantmed.com.au/guides/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16 border-b border-slate-200 dark:border-slate-800">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link href="/" className="hover:text-primary">Home</Link>
                <span>/</span>
                <Link href="/guides" className="hover:text-primary">Guides</Link>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                {guide.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {guide.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{guide.readTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Updated {guide.lastUpdated}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Intro */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <p className="text-lg text-foreground leading-relaxed">
                {guide.intro}
              </p>
            </div>
          </section>

          {/* Steps */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-12">
                {guide.steps.map((step, i) => (
                  <div key={i} className="relative">
                    {/* Step number */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-background flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <h2 className="text-xl font-bold text-foreground mb-4">
                          {step.title}
                        </h2>
                        <p className="text-foreground leading-relaxed mb-4">
                          {step.content}
                        </p>
                        {step.tips && (
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4 text-primary" />
                              Tips
                            </p>
                            <ul className="space-y-2">
                              {step.tips.map((tip, j) => (
                                <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Important Notes */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                <h2 className="font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Important Things to Know
                </h2>
                <ul className="space-y-3">
                  {guide.importantNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                      <CheckCircle2 className="w-4 h-4 mt-1 shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-4 py-12 bg-slate-50 dark:bg-slate-900">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {guide.faqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-8">
                {guide.cta.subtext}
              </p>
              <Button asChild size="lg" className="h-14 px-10 rounded-full">
                <Link href={guide.cta.href}>
                  {guide.cta.text}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Fast response</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
