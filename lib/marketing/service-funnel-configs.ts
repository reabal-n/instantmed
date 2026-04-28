import { PRICING_DISPLAY } from "@/lib/constants"
import type { ServiceFunnelConfig } from '@/types/marketing'

// ===========================================
// REPEAT PRESCRIPTIONS LANDING PAGE
// ===========================================
export const repeatScriptFunnelConfig: ServiceFunnelConfig = {
  serviceId: 'repeat-script',
  serviceName: 'Repeat Prescriptions',
  serviceSlug: 'repeat-prescriptions',

  hero: {
    badge: 'Prescribed by Australian GPs',
    headline: 'Repeat medication. Any pharmacy, same day.',
    subheadline: `For medications you already take. A doctor reviews your request and sends an eScript straight to your phone.`,
    ctaText: `Renew your medication · ${PRICING_DISPLAY.REPEAT_SCRIPT}`,
    ctaHref: '/request?service=prescription',
    images: {
      primary: '/images/rx-1.webp',
    },
  },
  
  whoItsFor: {
    title: 'Is this right for you?',
    subtitle: 'This service is for continuing medications you already take. Here\'s what to know.',
    cards: [
      {
        icon: 'Check',
        title: 'Existing medications',
        description: 'For medications you\'ve been prescribed before and have been taking regularly. The doctor will review it\'s safe to continue.',
        type: 'positive',
      },
      {
        icon: 'Check',
        title: 'Common medications',
        description: 'Blood pressure, cholesterol, contraceptives, asthma inhalers, reflux medications, and other routine medications.',
        type: 'positive',
      },
      {
        icon: 'AlertCircle',
        title: 'Doctor assessment required',
        description: 'Even for repeat medications, the doctor needs to confirm it\'s appropriate. They may ask about recent tests or checkups.',
        type: 'info',
      },
      {
        icon: 'AlertCircle',
        title: 'Not for controlled drugs',
        description: 'We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines. These require in-person care.',
        type: 'negative',
      },
    ],
  },
  
  howItWorks: {
    title: 'Three steps. Medication on your phone.',
    subtitle: 'Tell us what you need. A doctor checks it\'s safe. Sent via SMS.',
    steps: [
      {
        number: '1',
        icon: 'ClipboardList',
        title: 'Enter your medication',
        description: 'Tell us what medication you need and answer a few safety questions about your health.',
        time: '2 min',
      },
      {
        number: '2',
        icon: 'Stethoscope',
        title: 'Doctor reviews',
        description: 'An AHPRA-registered doctor reviews your request. They\'ll check it\'s safe and appropriate to continue.',
        time: 'Under 1 hour',
      },
      {
        number: '3',
        icon: 'FileCheck',
        title: 'Sent to your phone',
        description: 'Your medication token is sent via SMS. Take your phone to any pharmacy to collect.',
        time: 'Same day',
      },
    ],
  },
  
  afterSubmit: {
    title: 'What happens after you submit?',
    subtitle: 'Here\'s exactly what to expect after completing the questionnaire.',
    items: [
      {
        icon: 'Clock',
        title: 'Review within an hour',
        description: 'Most requests are reviewed within 30-60 minutes during business hours. We\'ll notify you when the doctor starts reviewing.',
      },
      {
        icon: 'MessageCircle',
        title: 'Doctor may ask questions',
        description: 'The doctor might ask about your last blood tests, when you last saw your doctor, or other relevant health information.',
      },
      {
        icon: 'Phone',
        title: 'Brief call (sometimes needed)',
        description: 'For some medications, the doctor may need a quick call to confirm details. This ensures your safety.',
      },
      {
        icon: 'RefreshCw',
        title: 'If we can\'t help',
        description: 'If your medication isn\'t suitable for online prescribing, we\'ll refund your payment and explain why.',
      },
    ],
  },

  imageSection: {
    title: 'Your medication, sent to any pharmacy',
    highlightWords: ['any pharmacy'],
    description: 'Once approved, your medication token is sent straight to your phone. Present it at any pharmacy in Australia. No paper needed, no waiting. PBS subsidies apply at the counter.',
    imageSrc: '/images/rx-2.webp',
    imageAlt: 'Prescription medication ready for pharmacy collection',
    imagePosition: 'right' as const,
    badges: [
      { icon: 'CheckCircle2', text: 'Sent via SMS', color: 'success' as const },
      { icon: 'Building2', text: 'Any Australian pharmacy', color: 'primary' as const },
      { icon: 'Clock', text: 'Same-day turnaround', color: 'primary' as const },
    ],
  },

  pricing: {
    title: 'One flat fee. Save $30–60 vs a GP.',
    subtitle: `${PRICING_DISPLAY.REPEAT_SCRIPT} flat fee. Full refund if we can't help. Medication cost is separate at your pharmacy.`,
    price: 29.95,
    originalPrice: 80,
    features: [
      'Reviewed by an AHPRA-registered GP',
      'Sent straight to your phone',
      'Works at any pharmacy in Australia',
      'Repeats included where appropriate',
      'Message your doctor with questions',
      'PBS subsidies may apply at pharmacy',
    ],
    refundNote: 'Full refund if we can\'t help',
    medicareNote: 'Medicare rebates do not apply. PBS subsidies apply at pharmacy.',
  },
  
  trust: {
    title: 'Safe, legitimate medication',
    badges: [
      {
        icon: 'BadgeCheck',
        title: 'AHPRA Registered',
        description: 'All doctors are registered with the Australian Health Practitioner Regulation Agency',
      },
      {
        icon: 'Building2',
        title: 'Australian-based',
        description: 'Our doctors and team are 100% based in Australia',
      },
      {
        icon: 'Lock',
        title: 'Secure & Private',
        description: 'Bank-level encryption. Your health information stays confidential.',
      },
      {
        icon: 'Shield',
        title: 'TGA Compliant',
        description: 'We follow all Therapeutic Goods Administration regulations',
      },
    ],
  },
  
  faq: {
    title: 'Common questions',
    subtitle: 'Everything you need to know about renewing your medication.',
    items: [
      {
        question: 'What medications can you prescribe?',
        answer: 'We can prescribe most common repeat medications: blood pressure, cholesterol, contraceptives, asthma inhalers, reflux, thyroid, and more. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines.',
      },
      {
        question: 'Is the eScript accepted at any pharmacy?',
        answer: 'Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they\'ll scan it directly. No paper needed.',
      },
      {
        question: 'Do I need a previous prescription?',
        answer: 'This service is for medications you\'ve already been prescribed. If you need a new medication, our general consult service is more appropriate.',
      },
      {
        question: 'Will my PBS subsidies still apply?',
        answer: 'Yes. If your medication is listed on the PBS, you\'ll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost.',
      },
      {
        question: 'What if the doctor can\'t prescribe my medication?',
        answer: 'If your medication isn\'t suitable for online prescribing (e.g. you need blood tests first), we\'ll explain why and refund your payment in full.',
      },
    ],
  },

  finalCta: {
    headline: 'Your regular medication, renewed from home.',
    subheadline: 'Answer a few questions. A doctor reviews it. Sent to your phone, same day.',
    ctaText: 'Renew your medication',
  },

  accentColor: 'blue',
}

// ===========================================
// GENERAL CONSULT LANDING PAGE
// ===========================================
export const generalConsultFunnelConfig: ServiceFunnelConfig = {
  serviceId: 'consult',
  serviceName: 'General Consult',
  serviceSlug: 'consult',

  hero: {
    badge: 'Australian GP consultations',
    headline: 'See a doctor today. From your phone.',
    subheadline: `Talk to an AHPRA-registered GP about health concerns, treatment options, or anything you'd normally see a doctor for. Medication may be prescribed by your doctor if clinically appropriate.`,
    ctaText: `Start your consult · ${PRICING_DISPLAY.CONSULT}`,
    ctaHref: '/request?service=consult',
  },

  specializedServices: {
    title: 'Specialised consultations',
    subtitle: 'Looking for something specific? We offer dedicated pathways with doctors experienced in these areas.',
    services: [
      {
        icon: 'Shield',
        title: 'Erectile Dysfunction',
        description: 'Discreet assessment and treatment for ED. Clinically proven medications prescribed if appropriate.',
        price: PRICING_DISPLAY.MENS_HEALTH,
        href: '/erectile-dysfunction',
      },
      {
        icon: 'Sparkles',
        title: 'Hair Loss',
        description: 'Medical assessment for hair loss. Evidence-based treatments prescribed by an Australian GP.',
        price: PRICING_DISPLAY.HAIR_LOSS,
        href: '/hair-loss',
      },
      {
        icon: 'Stethoscope',
        title: 'Women\'s Health',
        description: 'Contraception, hormonal concerns, and general women\'s health. Compassionate, confidential care.',
        price: PRICING_DISPLAY.WOMENS_HEALTH,
        href: '/request?service=consult',
      },
      {
        icon: 'ClipboardList',
        title: 'Weight Management',
        description: 'Doctor-guided weight management plans. Medication options discussed if clinically appropriate.',
        price: PRICING_DISPLAY.WEIGHT_LOSS,
        href: '/request?service=consult',
      },
    ],
  },

  whoItsFor: {
    title: 'Is this right for you?',
    subtitle: 'General consults are suitable for many common health concerns. Here\'s what to know.',
    cards: [
      {
        icon: 'Check',
        title: 'New health concerns',
        description: 'Skin conditions, minor infections, cold/flu symptoms, allergies, or other non-urgent health issues you want assessed.',
        type: 'positive',
      },
      {
        icon: 'Check',
        title: 'Treatment advice',
        description: 'Not sure if you need medication? Want a second opinion? A doctor can assess and advise on appropriate treatment.',
        type: 'positive',
      },
      {
        icon: 'AlertCircle',
        title: 'Call may be required',
        description: 'Unlike med certs, general consults often require a brief phone or video call so the doctor can properly assess you.',
        type: 'info',
      },
      {
        icon: 'AlertCircle',
        title: 'Not for emergencies',
        description: 'Chest pain, difficulty breathing, severe symptoms? Call 000 or go to emergency. This service is not for urgent care.',
        type: 'negative',
      },
    ],
  },

  howItWorks: {
    title: 'Three steps. A real doctor.',
    subtitle: 'Start with a questionnaire, then a doctor assesses your situation, often with a brief call.',
    steps: [
      {
        number: '1',
        icon: 'ClipboardList',
        title: 'Describe your concern',
        description: 'Tell us what\'s going on and answer health questions. This helps the doctor prepare for your consult.',
        time: '3-5 min',
      },
      {
        number: '2',
        icon: 'Stethoscope',
        title: 'Doctor assessment',
        description: 'A doctor reviews your information and will often call you to discuss further. This ensures a proper clinical assessment.',
        time: 'Within 2 hours',
      },
      {
        number: '3',
        icon: 'FileCheck',
        title: 'Treatment plan',
        description: 'The doctor provides advice, prescriptions if appropriate, or referrals if you need further care.',
        time: 'Same day',
      },
    ],
  },

  afterSubmit: {
    title: 'What happens after you submit?',
    subtitle: 'General consults involve more assessment than our other services. Here\'s what to expect.',
    items: [
      {
        icon: 'Clock',
        title: 'Review within 2 hours',
        description: 'A doctor will review your submission and prepare for your consultation. Response times may be longer for complex cases.',
      },
      {
        icon: 'Phone',
        title: 'Expect a call',
        description: 'For most general consults, the doctor will call you to discuss your symptoms. Please keep your phone nearby.',
      },
      {
        icon: 'MessageCircle',
        title: 'Follow-up via messaging',
        description: 'After your consult, you can message the doctor with follow-up questions through our secure platform.',
      },
      {
        icon: 'RefreshCw',
        title: 'If we can\'t help',
        description: 'If your concern requires in-person examination, we\'ll advise you and provide a full refund.',
      },
    ],
  },

  pricing: {
    title: 'One flat fee. Save $30–70 vs a clinic.',
    subtitle: `${PRICING_DISPLAY.CONSULT} flat fee. No gap fees, no surprises. Same quality of care as in-person.`,
    price: 49.95,
    originalPrice: 120,
    features: [
      'Full clinical assessment by an AHPRA-registered GP',
      'Phone or video consultation',
      'Medication if clinically appropriate',
      'Referral letters if needed',
      'Follow-up messaging with your doctor',
      'Written summary of your consultation',
    ],
    refundNote: 'Full refund if we can\'t help with your concern',
    medicareNote: 'Medicare rebates do not apply to telehealth consultations',
  },

  trust: {
    title: 'Quality care you can trust',
    badges: [
      {
        icon: 'BadgeCheck',
        title: 'AHPRA Registered',
        description: 'All doctors are registered with the Australian Health Practitioner Regulation Agency',
      },
      {
        icon: 'Building2',
        title: 'Australian-based',
        description: 'Our doctors and team are 100% based in Australia',
      },
      {
        icon: 'Lock',
        title: 'Secure & Private',
        description: 'Bank-level encryption. Doctor-patient confidentiality maintained.',
      },
      {
        icon: 'Shield',
        title: 'Clinical Standards',
        description: 'Same standard of care as in-person doctor visits',
      },
    ],
  },

  faq: {
    title: 'Common questions',
    subtitle: 'Everything you need to know about online consultations.',
    items: [
      {
        question: 'Will the doctor call me?',
        answer: 'For most general consults, yes. The doctor will review your questionnaire first, then call to discuss your symptoms. Keep your phone nearby after submitting.',
      },
      {
        question: 'Can I get a prescription from a consult?',
        answer: 'Yes. If the doctor determines medication is clinically appropriate, they\'ll send an eScript to your phone. You can collect it at any pharmacy.',
      },
      {
        question: 'What about referrals and pathology?',
        answer: 'The doctor can provide referral letters and pathology requests if they believe further investigation is needed. These are included in your consultation fee.',
      },
      {
        question: 'How is this different from a GP visit?',
        answer: 'You get the same quality of care from an AHPRA-registered GP, just without the waiting room. The main limitation is the doctor can\'t physically examine you, so some conditions may still need an in-person visit.',
      },
      {
        question: 'What if my issue needs in-person care?',
        answer: 'If the doctor determines your concern requires a physical examination, they\'ll let you know and recommend seeing a GP in person. You\'ll receive a full refund.',
      },
    ],
  },

  finalCta: {
    headline: 'Talk to a doctor from home',
    subheadline: 'Start with a quick questionnaire. A doctor reviews and typically calls within 2 hours.',
    ctaText: 'Talk to a doctor today',
  },

  accentColor: 'sky',
}
