/**
 * Telehealth guides -- SEO guide page data
 * Part of the guides data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { GuideData } from "../guides"

export const telehealthGuides: Record<string, GuideData> = {
  "telehealth-guide-australia": {
    title: "Complete Guide to Telehealth in Australia",
    slug: "telehealth-guide-australia",
    description: "Everything you need to know about telehealth in Australia - what it is, how it works, what can be treated, and how to choose a telehealth service.",
    lastUpdated: "April 2026",
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
      "Telehealth is not appropriate for emergencies - call 000",
      "E-prescriptions from telehealth work at any Australian pharmacy",
      "Your telehealth records are part of your medical history and subject to the same privacy protections",
      "If a telehealth doctor thinks you need in-person care, they'll tell you"
    ],
    faqs: [
      {
        q: "Is telehealth as good as seeing a doctor in person?",
        a: "For appropriate conditions, telehealth can be just as effective. Many health issues don't require physical examination. However, telehealth isn't suitable for everything - a good telehealth service will refer you for in-person care when needed."
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
      subtext: `Australian doctors · Fast response · ${PRICING_DISPLAY.FROM_MED_CERT}`
    }
  },
  "when-to-use-telehealth": {
    title: "When to Use Telehealth vs See a Doctor In Person",
    slug: "when-to-use-telehealth",
    description: "Not sure if telehealth is right for your situation? Learn when online consultations work well and when you need to see a doctor in person.",
    lastUpdated: "April 2026",
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
      "Never use telehealth for emergencies - call 000",
      "Telehealth doctors will tell you if you need in-person care",
      "You can use both - telehealth for convenience, GP for ongoing care",
      "When unsure, start with telehealth - they'll guide you"
    ],
    faqs: [
      { q: "Can a telehealth doctor refuse to help?", a: "Yes. If they think you need in-person care, they'll explain why and may decline to treat. This is good clinical practice - they're protecting your safety." },
      { q: "What if I start with telehealth and need more?", a: "The doctor will advise. You might need a referral, to see your GP, or to go to emergency. Telehealth is often a useful first step that can save you an unnecessary trip." },
      { q: "Is telehealth good for children?", a: "Some conditions yes, some no. Children under 12 often need in-person assessment. Check with the telehealth service - many have age restrictions for safety." }
    ],
    cta: { text: "Try telehealth", href: "/request", subtext: "Australian doctors · See if we can help" }
  },
  "telehealth-first-time-guide": {
    title: "Telehealth First Time: A Complete Guide for Australians",
    slug: "telehealth-first-time-guide",
    description: "Never used telehealth before? This guide walks you through your first online doctor consultation step by step.",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    intro: "Telehealth - seeing a doctor online - has become common in Australia. If you haven't tried it yet, this guide explains what to expect, how to prepare, and what you can get from your first consultation.",
    steps: [
      {
        title: "Choose a telehealth service",
        content: "Look for services with AHPRA-registered doctors, clear pricing, and good reviews. Check what they offer - medical certificates, prescriptions, or general consultations. Some specialise; others offer a range of services.",
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
      "Not all conditions can be assessed online - the doctor will advise",
      "Telehealth is legally equivalent to in-person for appropriate conditions",
      "Your privacy is protected by the same laws as in-person care"
    ],
    faqs: [
      { q: "Do I need a video call?", a: "Not always. Many services use questionnaires with optional phone follow-up. Check the service's process." },
      { q: "What if the doctor can't help online?", a: "They'll advise you to see a GP in person. You typically won't be charged the full fee if they can't assist." },
      { q: "Is my information secure?", a: "Reputable services use encrypted systems and comply with Australian privacy law. Your information isn't shared with employers or insurers." }
    ],
    cta: { text: "Try your first telehealth consultation", href: "/request", subtext: `Australian doctors · ${PRICING_DISPLAY.FROM_MED_CERT}` }
  },
  "how-to-claim-medicare-rebate-telehealth": {
    title: "How to Claim a Medicare Rebate for Telehealth",
    slug: "how-to-claim-medicare-rebate-telehealth",
    description: "Can you claim Medicare for telehealth? Learn how rebates work for online doctor consultations in Australia.",
    lastUpdated: "April 2026",
    readTime: "4 min read",
    intro: "Medicare rebates for telehealth depend on the service and your situation. Bulk-billed telehealth is free; private services may allow you to claim a rebate. This guide explains how it works.",
    steps: [
      {
        title: "Understand bulk billing vs private",
        content: "Bulk-billed telehealth means the provider claims Medicare directly - you pay nothing. Private telehealth services charge a fee; some allow you to claim a rebate (you pay upfront, then get a partial refund from Medicare).",
        tips: ["Bulk billing = no out-of-pocket", "Private = pay then claim", "Rebate amount depends on the consultation type"]
      },
      {
        title: "Check if you can claim",
        content: "To claim a Medicare rebate, you need a valid Medicare card and the consultation must meet Medicare's requirements. Some telehealth services don't offer rebates - they're private only. Check before you book.",
        tips: ["You need a Medicare card", "Not all services offer rebates", "The service will advise if you can claim"]
      },
      {
        title: "Submit your claim",
        content: "If the service doesn't process claims directly, you'll receive an invoice. Use the Medicare app or visit a Medicare office to claim. You'll need the invoice with the provider number and item numbers.",
        tips: ["Medicare app is the easiest way to claim", "Keep your invoice", "Rebates typically arrive within a few days"]
      }
    ],
    importantNotes: [
      "Bulk billing availability has decreased - many services are private",
      "Private doesn't mean you can't claim - check with the service",
      "Rebate amounts are set by Medicare, not the provider"
    ],
    faqs: [
      { q: "How much can I claim back?", a: "It depends on the consultation type. Standard GP consultations have a set rebate (around $40-50). The service can advise the item number and expected rebate." },
      { q: "Can I claim for medical certificates?", a: "If the service bulk bills or allows claims, yes. The consultation is the same whether you get a certificate or not." },
      { q: "What if I don't have Medicare?", a: "You'll pay the full private fee. Some visitors and new residents may not yet have Medicare - check your eligibility." }
    ],
    cta: { text: "See our pricing", href: "/pricing", subtext: "Transparent fees · No surprises" }
  },
}
