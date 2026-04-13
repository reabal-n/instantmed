import type { FAQGroup } from '@/types/faq'

/**
 * Single source of truth for the general FAQ page (/faq).
 * 7 categories covering the full platform.
 */
export const GENERAL_FAQ: FAQGroup[] = [
  {
    category: 'General',
    items: [
      {
        question: 'What is InstantMed?',
        answer:
          "We\u2019re an Australian telehealth service that connects you with AHPRA-registered GPs for medical certificates, prescription renewals, and consultations. You fill in a quick form online, a real doctor reviews it, and you get your result. Medical certificates are typically issued in under 30 minutes, available 24/7.",
      },
      {
        question: 'Is this actually legitimate?',
        answer:
          "Completely. Every doctor on InstantMed is AHPRA-registered and follows the same clinical standards as in-person consultations. You can verify any doctor\u2019s registration on the public AHPRA register. Same rules, same standards \u2014 just more convenient.",
      },
      {
        question: 'How long does it take?',
        answer:
          "Medical certificates are reviewed within 30 minutes, 24/7. Prescriptions and consultations are reviewed within 1\u20132 hours during operating hours (8am\u201310pm AEST, 7 days). If we can\u2019t help you, you get a full refund \u2014 no questions asked.",
      },
      {
        question: 'How do I know if I need an in-person visit instead?',
        answer:
          "We\u2019re best for straightforward things \u2014 sick certificates for common illness, repeat medication for stable conditions, and routine consultations. If something needs hands-on care, our doctors will let you know and recommend seeing a GP in person. That\u2019s the responsible thing to do.",
      },
      {
        question: 'How does the doctor decide on my request?',
        answer:
          "The same way they would in a clinic. A real doctor reviews your symptoms, history, and request. If it\u2019s safe and clinically appropriate, they approve it. If not, they\u2019ll ask for more info, suggest alternatives, or point you toward in-person care.",
      },
      {
        question: 'Why was my request declined?',
        answer:
          "It usually means the doctor felt an in-person assessment would be safer \u2014 for example, if symptoms suggest something that needs a physical exam. It\u2019s not personal, it\u2019s good medicine. You\u2019ll always get a full refund if we can\u2019t help.",
      },
      {
        question: 'Will a doctor call me?',
        answer:
          "Most requests are handled online without a call. But if the doctor needs to clarify something or has a clinical concern, they may reach out by phone or message. Think of it as your doctor being thorough \u2014 it\u2019s a good sign.",
      },
    ],
  },
  {
    category: 'Telehealth & How It Works',
    items: [
      {
        question: 'How does telehealth compare to seeing a GP in person?',
        answer:
          "For many routine matters \u2014 sick certificates, repeat prescriptions, follow-up consultations \u2014 the clinical outcome is the same. The difference is you skip the waiting room and the drive. That said, some things genuinely need hands-on care, and our doctors will always tell you if that\u2019s the case.",
      },
      {
        question: 'Can a telehealth doctor do everything an in-person doctor can?',
        answer:
          "Not everything, and we\u2019re upfront about that. Telehealth is excellent for history-based assessments, medication management, and documentation. It can\u2019t replace a physical examination, blood tests, or procedures. If your situation needs any of those, we\u2019ll point you to the right place.",
      },
      {
        question: 'Is telehealth regulated in Australia?',
        answer:
          'Absolutely. Telehealth in Australia is regulated by AHPRA, the Medical Board of Australia, and the TGA \u2014 the same bodies that oversee in-person care. Our doctors are held to identical clinical and ethical standards whether they see you in a clinic or review your request online.',
      },
      {
        question: 'What technology do I need to use InstantMed?',
        answer:
          "A device with a web browser and an internet connection. That\u2019s it. No app to download, no special software, no video call setup. You fill in a form, a doctor reviews it, and you get your result. Deliberately simple.",
      },
      {
        question: "Can I use InstantMed if I\u2019m in a rural area?",
        answer:
          "Yes \u2014 and this is one of the things telehealth does best. If you\u2019re hours from the nearest GP or your local clinic is booked out for weeks, we can help with the same routine matters we handle for anyone else. All you need is an internet connection.",
      },
    ],
  },
  {
    category: 'Consultations',
    items: [
      {
        question: 'What types of consultations do you offer?',
        answer:
          "We offer general consultations, erectile dysfunction consults, hair loss consults, women\u2019s health consults, and weight management consults. Each is reviewed by an AHPRA-registered doctor who\u2019ll assess whether we can help or whether you\u2019d be better off with in-person care.",
      },
      {
        question: 'Can I get a referral to a specialist?',
        answer:
          'Our doctors can provide referrals to specialists where clinically appropriate. If your consultation reveals something that needs specialist input, the doctor will issue a referral as part of your consult \u2014 no extra charge.',
      },
      {
        question: 'What happens after my consultation?',
        answer:
          "Depends on the outcome. If the doctor approves a prescription, you\u2019ll receive an eScript via SMS. If they issue a certificate or referral, it\u2019ll appear in your patient dashboard. If they need more information or recommend in-person care, they\u2019ll let you know directly.",
      },
      {
        question: 'Can I use InstantMed for mental health concerns?',
        answer:
          "For some things, yes \u2014 like renewing a stable antidepressant prescription or getting a mental health care plan referral. But telehealth has limits here, and we respect them. If you\u2019re in crisis or need ongoing therapy, we\u2019ll direct you to appropriate services. If you need immediate support, contact Lifeline on 13 11 14 or Beyond Blue on 1300 22 4636.",
      },
    ],
  },
  {
    category: 'Medical Certificates',
    items: [
      {
        question: 'Will my employer actually accept this?',
        answer:
          "Yes \u2014 our certificates are issued by registered Australian doctors and are legally valid for all workplaces, universities, and Centrelink. They carry the same weight as a certificate from an in-person visit.",
      },
      {
        question: 'Can I get a backdated certificate?',
        answer:
          "We can cover recent illness (within the last few days) if it makes clinical sense based on your symptoms and history. The doctor has the final say on dates \u2014 they\u2019ll work with you to get it right.",
      },
      {
        question: 'What if my request is declined?',
        answer:
          "You\u2019ll get a full refund within 3\u20135 business days. The doctor may also explain why and suggest an alternative, like an in-person visit for a more thorough assessment.",
      },
      {
        question: 'What if I need more than 2 days off?',
        answer:
          "For longer absences, the doctor may need a bit more detail about your condition or recommend an in-person visit. They\u2019ll guide you on the best next step.",
      },
      {
        question: "Can I get a certificate for carer\u2019s leave?",
        answer:
          "Yes. If you\u2019re caring for an immediate family or household member who\u2019s sick or injured, our doctors can issue a carer\u2019s leave certificate. You\u2019ll need to provide some basic details about the person you\u2019re caring for and the nature of their illness or injury.",
      },
      {
        question: 'Do universities accept online medical certificates?',
        answer:
          "They do. Our certificates are issued by AHPRA-registered doctors and meet the same standard as any GP-issued certificate. Australian universities accept them for special consideration applications, deferred exams, and extension requests. We\u2019ve seen thousands used for exactly this.",
      },
    ],
  },
  {
    category: 'Repeat Medication',
    items: [
      {
        question: 'What medications can you prescribe?',
        answer:
          "We focus on repeat medications for stable, ongoing conditions \u2014 things like blood pressure tablets, cholesterol medication, contraceptives, and similar. Some medications need in-person care first (like controlled substances or brand-new prescriptions), and we think that\u2019s the right call.",
      },
      {
        question: 'What if my prescription request is declined?',
        answer:
          "You\u2019ll get a full refund. The doctor may suggest alternatives or recommend an in-person visit \u2014 common reasons include needing physical monitoring or potential interactions with other medications.",
      },
      {
        question: 'How do I receive my medication?',
        answer:
          "Via SMS \u2014 you\u2019ll get a token you can show at any pharmacy in Australia. No paper needed, just your phone.",
      },
      {
        question: 'Can you send it to my usual pharmacy?',
        answer:
          "Absolutely. Nominate your preferred pharmacy and we\u2019ll send it directly to them.",
      },
    ],
  },
  {
    category: 'Privacy & Security',
    items: [
      {
        question: 'Is my information secure?',
        answer:
          "Your medical info is encrypted, stored in Australia, and fully compliant with the Privacy Act and Australian Privacy Principles. We take data security seriously \u2014 it\u2019s not an afterthought.",
      },
      {
        question: 'Do you share my data with anyone?',
        answer:
          "Your data is yours. We don\u2019t sell or share it with third parties. The only exceptions are things you\u2019d expect \u2014 sending prescriptions to your nominated pharmacy, and complying with legal requirements like mandatory disease reporting.",
      },
      {
        question: 'Can I delete my account?',
        answer:
          "Yes, just get in touch and we\u2019ll handle it. The only caveat: we\u2019re legally required to retain medical records for 7 years under Australian healthcare regulations.",
      },
      {
        question: 'Where is my data stored?',
        answer:
          "All data is stored on Australian servers. Your medical information is encrypted at rest using AES-256 encryption \u2014 the same standard used by banks. We don\u2019t store data offshore, and we don\u2019t cut corners on infrastructure.",
      },
      {
        question: 'Do you comply with Australian Privacy Principles?',
        answer:
          'Fully. We comply with all 13 Australian Privacy Principles under the Privacy Act 1988. That covers everything from how we collect and store your information to how we handle access requests and complaints. If you want the details, our privacy policy spells it out.',
      },
    ],
  },
  {
    category: 'Payments & Refunds',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          "Visa, Mastercard, Amex, Apple Pay, and Google Pay. Payments are processed securely via Stripe \u2014 we never see or store your card details.",
      },
      {
        question: "What\u2019s your refund policy?",
        answer:
          "If we can\u2019t help you \u2014 for example, if your request is declined for clinical reasons \u2014 you get a full refund within 3\u20135 business days. No hoops, no hassle.",
      },
      {
        question: 'Is there a Medicare rebate?',
        answer:
          "Our consultation fees aren\u2019t covered by Medicare as we\u2019re a private telehealth service. That said, any prescriptions you receive can still attract PBS subsidies at the pharmacy.",
      },
    ],
  },
]
