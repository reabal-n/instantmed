import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Clock,
  Shield,
  CheckCircle2,
  FileText,
  Zap,
  AlertCircle,
  Info
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"

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
      href: "/request?service=med-cert",
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
      href: "/request?service=med-cert",
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
        content: "Most telehealth services work similarly: you create an account or provide your details, describe your health concern or symptoms, and either connect with a doctor immediately (video/phone) or have your case reviewed and responded to (asynchronous). You&apos;ll receive advice, prescriptions (eScript sent to your phone via SMS), or medical certificates as needed.",
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
      href: "/request",
      subtext: "Australian doctors · Fast response · From $19.95"
    }
  },
  "medical-certificate-centrelink": {
    title: "How to Get a Medical Certificate for Centrelink",
    slug: "medical-certificate-centrelink",
    description: "Need a medical certificate for Centrelink or a government agency? Learn what's required, how to get one, and what doctors can certify.",
    lastUpdated: "January 2025",
    readTime: "5 min read",
    intro: "Centrelink and other government agencies sometimes require medical certificates to support claims for payments, exemptions, or participation requirements. This guide explains what you need and how to get a certificate that meets government requirements.",
    steps: [
      {
        title: "Check what Centrelink requires",
        content: "Centrelink's requirements vary depending on your situation — JobSeeker participation requirements, Disability Support Pension, Carer Payment, or other claims. The certificate may need to specify your condition, how it affects your capacity, and the period it applies to. Check your Centrelink correspondence or the Services Australia website for specific requirements.",
        tips: ["Requirements differ by payment type", "Some forms need a specific format", "Centrelink may have their own certificate template"]
      },
      {
        title: "See a doctor who can assess your condition",
        content: "You need a registered Australian doctor who has assessed your condition. For some Centrelink requirements, a telehealth doctor can provide a certificate if they've reviewed your situation. For ongoing conditions or complex claims, Centrelink may prefer or require a doctor who knows your history.",
        tips: ["Telehealth may be suitable for straightforward certificates", "Complex claims may need your regular GP", "The doctor must have assessed you — they can't certify conditions they haven't reviewed"]
      },
      {
        title: "Provide the certificate to Centrelink",
        content: "Centrelink accepts certificates via their app, online services, or in person. Upload a clear copy or photo of the certificate. Keep the original for your records. Submit before any deadlines — late certificates can affect your payments.",
        tips: ["Use the Centrelink app for quick upload", "Keep a copy for your records", "Note any reference numbers Centrelink provides"]
      }
    ],
    importantNotes: [
      "Centrelink requirements can change — always check current requirements",
      "Certificates must be from a doctor who has assessed you",
      "Backdating has limits — doctors can only certify what they've assessed",
      "For DSP or complex claims, Centrelink may request additional evidence"
    ],
    faqs: [
      { q: "Can I get a Centrelink medical certificate online?", a: "Yes, for many situations. If a telehealth doctor can assess your condition and provide an appropriate certificate, it will be valid. Some complex claims may need in-person assessment." },
      { q: "What if Centrelink rejects my certificate?", a: "Centrelink may reject certificates that don't meet their requirements (e.g. wrong format, missing information). Check their feedback and get a new certificate if needed. Your doctor can help ensure it meets requirements." },
      { q: "How long is a Centrelink medical certificate valid?", a: "It depends on your situation. Some certificates cover a specific period (e.g. 2 weeks). For ongoing conditions, Centrelink may accept certificates covering longer periods. Check your specific requirements." }
    ],
    cta: { text: "Get a medical certificate", href: "/request?service=med-cert", subtext: "From $19.95 · Australian doctors" }
  },
  "when-to-use-telehealth": {
    title: "When to Use Telehealth vs See a Doctor In Person",
    slug: "when-to-use-telehealth",
    description: "Not sure if telehealth is right for your situation? Learn when online consultations work well and when you need to see a doctor in person.",
    lastUpdated: "January 2025",
    readTime: "6 min read",
    intro: "Telehealth has expanded healthcare access, but it's not right for every situation. Understanding when to use telehealth versus when to see a doctor in person helps you get the right care efficiently.",
    steps: [
      {
        title: "Telehealth works well for",
        content: "Medical certificates, repeat prescriptions for stable conditions, straightforward UTIs, cold and flu advice, mental health support, skin conditions (with photos), travel health advice, and simple referrals. These don't typically require physical examination.",
        tips: ["Convenience and speed are key benefits", "Good when you know what you need", "Saves time and travel"]
      },
      {
        title: "You need in-person care when",
        content: "You have symptoms that need physical examination (e.g. abdominal pain, ear pain, breathing difficulties), you need blood tests or procedures, you're starting a new medication that requires monitoring, you have an emergency, or you need a comprehensive health check. A telehealth doctor will tell you if you need to be seen in person.",
        tips: ["When in doubt, telehealth can triage", "Ear and abdominal issues often need examination", "Emergencies always need 000 or ED"]
      },
      {
        title: "The grey areas",
        content: "Some situations could go either way. A telehealth doctor can assess and decide. For example, a rash might be assessable via photos, or it might need in-person examination. Chest pain could be anxiety (telehealth OK for follow-up) or something serious (needs emergency care). When there's uncertainty, a good telehealth service will err on the side of caution.",
        tips: ["Telehealth can be a useful first step", "Doctors will refer when needed", "Don't use telehealth for clear emergencies"]
      }
    ],
    importantNotes: [
      "Never use telehealth for emergencies — call 000",
      "Telehealth doctors will tell you if you need in-person care",
      "You can use both — telehealth for convenience, GP for ongoing care",
      "When unsure, start with telehealth — they'll guide you"
    ],
    faqs: [
      { q: "Can a telehealth doctor refuse to help?", a: "Yes. If they think you need in-person care, they'll explain why and may decline to treat. This is good clinical practice — they're protecting your safety." },
      { q: "What if I start with telehealth and need more?", a: "The doctor will advise. You might need a referral, to see your GP, or to go to emergency. Telehealth is often a useful first step that can save you an unnecessary trip." },
      { q: "Is telehealth good for children?", a: "Some conditions yes, some no. Children under 12 often need in-person assessment. Check with the telehealth service — many have age restrictions for safety." }
    ],
    cta: { text: "Try telehealth", href: "/request", subtext: "Australian doctors · See if we can help" }
  },
  "how-to-get-repeat-prescription-online": {
    title: "How to Get a Repeat Prescription Online in Australia",
    slug: "how-to-get-repeat-prescription-online",
    description: "Need a repeat prescription but can't get to your GP? Learn how to get prescriptions renewed online in Australia.",
    lastUpdated: "March 2026",
    readTime: "5 min read",
    intro: "Repeat prescriptions for stable conditions can often be renewed via telehealth. If you're running low on medication and can't get a GP appointment, online services may be able to help — as long as your condition is suitable for remote assessment.",
    steps: [
      {
        title: "Check if your medication can be prescribed online",
        content: "Many common medications can be prescribed via telehealth: blood pressure meds, cholesterol drugs, contraceptives, asthma preventers, and some antibiotics. Schedule 8 drugs (opioids, stimulants) cannot be prescribed online. Some medications need recent blood tests or in-person review.",
        tips: ["Most S4 medications can be prescribed online", "Schedule 8 always requires in-person", "Check the telehealth service's medication list"]
      },
      {
        title: "Gather your information",
        content: "You'll need to provide your current medication name, dose, how long you've been taking it, and who prescribed it. For some medications, recent blood pressure readings or other monitoring may be required. Have your Medicare card ready if the service bulk bills.",
        tips: ["Know your exact medication and dose", "Have your last prescription or pharmacy record", "Some services need a brief health questionnaire"]
      },
      {
        title: "Request your prescription",
        content: "Complete the online form or consultation. The doctor will review your history and, if appropriate, issue an eScript. You'll receive a QR code or token via SMS to take to any pharmacy. The pharmacy dispenses your medication — same as a paper script.",
        tips: ["eScripts work at any Australian pharmacy", "No need to collect a paper script", "Keep the SMS until you've collected your medication"]
      }
    ],
    importantNotes: [
      "Not all medications can be prescribed online — check first",
      "You may need to see your regular GP for some repeats",
      "eScripts are legally equivalent to paper prescriptions",
      "Schedule 8 drugs require in-person assessment"
    ],
    faqs: [
      { q: "Can I get any repeat prescription online?", a: "No. Schedule 8 drugs, some psychiatric medications, and medications requiring monitoring typically need in-person review. Common S4 medications are often available." },
      { q: "How do eScripts work?", a: "You receive a QR code or token via SMS. Take it to any pharmacy — they scan it and dispense your medication. No paper needed." },
      { q: "Will my regular GP know?", a: "Only if you or the telehealth service shares the information. For continuity, consider asking for a summary to be sent to your GP." }
    ],
    cta: { text: "Request a repeat prescription", href: "/prescriptions", subtext: "From $29.95 · eScript to your phone" }
  },
  "medical-certificate-for-carers-leave": {
    title: "How to Get a Medical Certificate for Carer's Leave",
    slug: "medical-certificate-for-carers-leave",
    description: "Need to document carer's leave for work? Learn how to get a medical certificate when caring for a sick family member.",
    lastUpdated: "March 2026",
    readTime: "4 min read",
    intro: "Carer's leave allows you to take time off to care for a sick family member or dependant. Some employers require a medical certificate to approve it. This guide explains how to get one and what it should include.",
    steps: [
      {
        title: "Understand carer's leave entitlements",
        content: "Under the Fair Work Act, you're entitled to carer's leave (from your personal/carer's leave balance) when you need to care for an immediate family or household member who is ill. This is separate from your own sick leave.",
        tips: ["Usually 10 days per year for full-time employees", "Covers children, spouse, parents, household members", "Same leave balance as personal sick leave"]
      },
      {
        title: "Get a certificate if your employer requires one",
        content: "A carer's leave certificate documents that the person you were caring for needed care — not that you were sick. You describe the situation (e.g. your child had gastro) and the doctor issues a certificate. Telehealth can assess and issue without you leaving the person you're caring for.",
        tips: ["Certificate states the person needed care", "Doesn't disclose their diagnosis unless necessary", "Can often be done via telehealth"]
      },
      {
        title: "Submit to your employer",
        content: "Forward the certificate to HR or your manager. Carer's leave is a protected entitlement — your employer cannot unreasonably refuse it when properly documented.",
        tips: ["Submit promptly", "Keep a copy for your records", "Check your workplace policy for any specific requirements"]
      }
    ],
    importantNotes: [
      "Carer's leave is a legal entitlement",
      "The certificate documents the care recipient's need, not your illness",
      "Telehealth is useful when you can't leave the person you're caring for"
    ],
    faqs: [
      { q: "Can I get a carer's leave certificate online?", a: "Yes. You describe who needed care and their situation. The doctor assesses and can issue a certificate. Useful when you can't leave to see a GP." },
      { q: "What if my child is the one who's sick?", a: "Same process. You complete the form on their behalf. The certificate documents that they needed care, supporting your carer's leave." },
      { q: "Do I need to say what was wrong with them?", a: "The certificate typically states that the person needed care. Specific diagnosis may or may not be included — the doctor will include what's appropriate." }
    ],
    cta: { text: "Get a carer's leave certificate", href: "/medical-certificate/carer", subtext: "From $19.95 · No need to leave home" }
  },
  "telehealth-first-time-guide": {
    title: "Telehealth First Time: A Complete Guide for Australians",
    slug: "telehealth-first-time-guide",
    description: "Never used telehealth before? This guide walks you through your first online doctor consultation step by step.",
    lastUpdated: "March 2026",
    readTime: "5 min read",
    intro: "Telehealth — seeing a doctor online — has become common in Australia. If you haven't tried it yet, this guide explains what to expect, how to prepare, and what you can get from your first consultation.",
    steps: [
      {
        title: "Choose a telehealth service",
        content: "Look for services with AHPRA-registered doctors, clear pricing, and good reviews. Check what they offer — medical certificates, prescriptions, or general consultations. Some specialise; others offer a range of services.",
        tips: ["Verify doctors are AHPRA-registered", "Check operating hours", "Understand the fees before you start"]
      },
      {
        title: "Prepare for your consultation",
        content: "Have your Medicare card (if applicable), a list of your symptoms or what you need, current medications, and any relevant history. Find a quiet, private space. Ensure your device has charge and internet.",
        tips: ["Write down your symptoms beforehand", "Have your pharmacy details if you need a script", "Be in a place where you can speak or type freely"]
      },
      {
        title: "Complete the consultation",
        content: "Many services use a questionnaire rather than video. You describe your situation, and the doctor reviews it. They may ask follow-up questions or request a brief call. The process typically takes 15-60 minutes from submission to outcome.",
        tips: ["Be honest and thorough", "Answer follow-up questions promptly", "You may get a prescription, certificate, or advice to see someone in person"]
      }
    ],
    importantNotes: [
      "Not all conditions can be assessed online — the doctor will advise",
      "Telehealth is legally equivalent to in-person for appropriate conditions",
      "Your privacy is protected by the same laws as in-person care"
    ],
    faqs: [
      { q: "Do I need a video call?", a: "Not always. Many services use questionnaires with optional phone follow-up. Check the service's process." },
      { q: "What if the doctor can't help online?", a: "They'll advise you to see a GP in person. You typically won't be charged the full fee if they can't assist." },
      { q: "Is my information secure?", a: "Reputable services use encrypted systems and comply with Australian privacy law. Your information isn't shared with employers or insurers." }
    ],
    cta: { text: "Try your first telehealth consultation", href: "/request", subtext: "Australian doctors · From $19.95" }
  },
  "how-to-claim-medicare-rebate-telehealth": {
    title: "How to Claim a Medicare Rebate for Telehealth",
    slug: "how-to-claim-medicare-rebate-telehealth",
    description: "Can you claim Medicare for telehealth? Learn how rebates work for online doctor consultations in Australia.",
    lastUpdated: "March 2026",
    readTime: "4 min read",
    intro: "Medicare rebates for telehealth depend on the service and your situation. Bulk-billed telehealth is free; private services may allow you to claim a rebate. This guide explains how it works.",
    steps: [
      {
        title: "Understand bulk billing vs private",
        content: "Bulk-billed telehealth means the provider claims Medicare directly — you pay nothing. Private telehealth services charge a fee; some allow you to claim a rebate (you pay upfront, then get a partial refund from Medicare).",
        tips: ["Bulk billing = no out-of-pocket", "Private = pay then claim", "Rebate amount depends on the consultation type"]
      },
      {
        title: "Check if you can claim",
        content: "To claim a Medicare rebate, you need a valid Medicare card and the consultation must meet Medicare's requirements. Some telehealth services don't offer rebates — they're private only. Check before you book.",
        tips: ["You need a Medicare card", "Not all services offer rebates", "The service will advise if you can claim"]
      },
      {
        title: "Submit your claim",
        content: "If the service doesn't process claims directly, you'll receive an invoice. Use the Medicare app or visit a Medicare office to claim. You'll need the invoice with the provider number and item numbers.",
        tips: ["Medicare app is the easiest way to claim", "Keep your invoice", "Rebates typically arrive within a few days"]
      }
    ],
    importantNotes: [
      "Bulk billing availability has decreased — many services are private",
      "Private doesn't mean you can't claim — check with the service",
      "Rebate amounts are set by Medicare, not the provider"
    ],
    faqs: [
      { q: "How much can I claim back?", a: "It depends on the consultation type. Standard GP consultations have a set rebate (around $40-50). The service can advise the item number and expected rebate." },
      { q: "Can I claim for medical certificates?", a: "If the service bulk bills or allows claims, yes. The consultation is the same whether you get a certificate or not." },
      { q: "What if I don't have Medicare?", a: "You'll pay the full private fee. Some visitors and new residents may not yet have Medicare — check your eligibility." }
    ],
    cta: { text: "See our pricing", href: "/pricing", subtext: "Transparent fees · No surprises" }
  },
  "medical-certificate-employer-requirements": {
    title: "What Employers Can and Can't Ask For in a Medical Certificate",
    slug: "medical-certificate-employer-requirements",
    description: "Understanding your rights: what employers can request in a medical certificate and what they cannot demand.",
    lastUpdated: "March 2026",
    readTime: "5 min read",
    intro: "Employers can request evidence when you take sick leave, but there are limits. This guide explains what they can ask for, what you're required to provide, and your privacy rights.",
    steps: [
      {
        title: "What employers can request",
        content: "Under the Fair Work Act, employers can request evidence that you were unfit for work. A medical certificate from a registered practitioner is sufficient. It typically needs to state the dates you were unfit — it does NOT need to disclose your diagnosis.",
        tips: ["Certificate confirms unfitness", "Dates are usually required", "Diagnosis is private"]
      },
      {
        title: "What employers cannot demand",
        content: "Employers cannot demand to know your specific diagnosis, require you to see a particular doctor, or ask for more than reasonable evidence. They cannot require a certificate for every single day of absence if you have one covering the period.",
        tips: ["Your diagnosis is private", "You choose your doctor", "One certificate can cover multiple days"]
      },
      {
        title: "If you feel your rights are being violated",
        content: "If you believe your employer is unreasonably demanding private medical information or refusing your valid certificate, you can contact the Fair Work Ombudsman for advice. Your union (if you have one) can also help.",
        tips: ["Fair Work provides free advice", "Document any unreasonable requests", "Keep copies of your certificates"]
      }
    ],
    importantNotes: [
      "A medical certificate confirms unfitness — it doesn't need diagnosis details",
      "Employers must accept valid certificates from registered doctors",
      "You have a right to medical privacy"
    ],
    faqs: [
      { q: "Can my employer reject my medical certificate?", a: "Generally no, if it's from a registered doctor and covers the relevant dates. They can't reject it because it's from telehealth." },
      { q: "Do I have to tell my employer why I'm sick?", a: "No. You only need to provide a certificate stating you were unfit. The certificate doesn't need to specify your condition." },
      { q: "Can they ask for a certificate from day one?", a: "Employers can have policies requiring certificates from the first day. Check your employment contract or workplace policy." }
    ],
    cta: { text: "Get a medical certificate", href: "/request?service=med-cert", subtext: "From $19.95 · Valid for all employers" }
  },
  "escript-vs-paper-prescription": {
    title: "eScript vs Paper Prescription: What's the Difference?",
    slug: "escript-vs-paper-prescription",
    description: "eScripts are replacing paper prescriptions in Australia. Learn how they work and why they're often more convenient.",
    lastUpdated: "March 2026",
    readTime: "4 min read",
    intro: "Electronic prescriptions (eScripts) have become the standard in Australia. Instead of a paper script, you receive a QR code or token on your phone. Here's how they compare to the old paper system.",
    steps: [
      {
        title: "How eScripts work",
        content: "When a doctor prescribes medication, they can send an eScript to your phone via SMS or through an app. You get a QR code or token. Take it to any pharmacy — they scan it and dispense your medication. No paper to lose or forget.",
        tips: ["Works at any pharmacy in Australia", "Can be resent if you lose it", "Repeats can be in the same token"]
      },
      {
        title: "Advantages over paper",
        content: "eScripts can't be lost or damaged. You can have them resent. They work with telehealth — no need to collect a paper script. Repeats can be included in one token. They're accepted everywhere.",
        tips: ["No lost prescriptions", "Perfect for telehealth", "Same legal standing as paper"]
      },
      {
        title: "When you might still get paper",
        content: "Some older systems or specific situations may still use paper. But for most Australians, eScripts are the norm. If you prefer paper, ask your doctor — but eScripts are usually more convenient.",
        tips: ["Most scripts are now electronic", "Paper is still valid if issued", "Pharmacies accept both"]
      }
    ],
    importantNotes: [
      "eScripts are legally equivalent to paper prescriptions",
      "All Australian pharmacies can dispense from eScripts",
      "You don't need a smartphone — the token can be printed"
    ],
    faqs: [
      { q: "Do all pharmacies accept eScripts?", a: "Yes. eScripts are the standard. Any pharmacy can scan the QR code or enter the token." },
      { q: "What if I lose my eScript?", a: "Contact your doctor or the service that issued it. They can resend it. One advantage of eScripts — they're digital and resendable." },
      { q: "Can I use an eScript at a different pharmacy than usual?", a: "Yes. eScripts work at any pharmacy in Australia. You're not locked in." }
    ],
    cta: { text: "Get an eScript", href: "/prescriptions", subtext: "Prescriptions sent to your phone" }
  },
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

      <div className="flex min-h-screen flex-col bg-background dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-3xl">
              <PageBreadcrumbs
                links={[
                  { label: "Guides", href: "/guides" },
                  { label: guide.title }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero */}
          <section className="px-4 py-8 sm:py-12 border-b border-border dark:border-border">
            <div className="mx-auto max-w-3xl">
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
                          <div className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4 text-primary" />
                              Tips
                            </p>
                            <ul className="space-y-2">
                              {step.tips.map((tip, j) => (
                                <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
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
          <section className="px-4 py-12 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {guide.faqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-card rounded-xl p-6 border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none">
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
              <Button asChild size="lg" className="h-14 px-10 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
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
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
