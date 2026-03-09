import type { ServiceFunnelConfig } from '@/components/marketing/service-funnel-page'
import { PRICING_DISPLAY } from "@/lib/constants"

// ===========================================
// MEDICAL CERTIFICATES LANDING PAGE
// ===========================================
export const medCertFunnelConfig: ServiceFunnelConfig = {
  serviceId: 'med-cert',
  serviceName: 'Medical Certificates',
  serviceSlug: 'medical-certificates',
  
  hero: {
    badge: 'Reviewed by Australian GPs',
    headline: 'Medical certificates.',
    headlineRotatingWords: ['Reviewed by Australian GPs.', 'Accepted everywhere.', 'From your couch.'],
    subheadline: `Valid for work, uni, or carer's leave. Reviewed by AHPRA-registered doctors. Usually sorted in under an hour.`,
    reassurances: [
      'AHPRA-registered doctors · Accepted by all employers · Full refund if we can\'t help',
      'No account required · Full refund if we can\'t help',
    ],
    ctaText: `Get your certificate — ${PRICING_DISPLAY.MED_CERT}`,
    ctaHref: '/request?service=med-cert',
    images: {
      primary: '/images/medcert-1.jpeg',
    },
    highlightBadge: {
      text: '100% online process',
      glow: true,
    },
  },
  
  whoItsFor: {
    title: 'Is this right for you?',
    subtitle: 'Medical certificates are suitable for most common short-term illnesses. Here\'s what to know.',
    cards: [
      {
        icon: 'Check',
        title: 'Short-term illness',
        description: 'Cold, flu, gastro, migraine, or other acute conditions that prevent you from working or studying.',
        type: 'positive',
      },
      {
        icon: 'Check',
        title: 'Carer\'s leave',
        description: 'Need to care for a sick family member? We can provide certificates for carer\'s leave too.',
        type: 'positive',
      },
      {
        icon: 'Check',
        title: 'Backdating available',
        description: 'Already missed a day? Certificates can cover absences up to 48 hours ago if clinically appropriate.',
        type: 'positive',
      },
      {
        icon: 'AlertCircle',
        title: 'Not for WorkCover or legal',
        description: 'Workplace injury claims (WorkCover) or certificates for legal proceedings require an in-person assessment.',
        type: 'negative',
      },
    ],
  },
  
  howItWorks: {
    title: 'Three steps. Stay in bed. \uD83D\uDECB\uFE0F',
    subtitle: 'No appointments. No waiting rooms. Just your phone and a few minutes.',
    steps: [
      {
        number: '1',
        icon: 'ClipboardList',
        title: 'Answer a few questions',
        description: 'Tell us what kind of certificate you need (work, uni, or carer\'s leave) and answer some quick health questions.',
        time: '2 min',
      },
      {
        number: '2',
        icon: 'Stethoscope',
        title: 'A real doctor reviews it',
        description: 'An AHPRA-registered GP reviews your request. If they need more info, they\'ll message you directly.',
        time: 'Under 1 hour',
      },
      {
        number: '3',
        icon: 'FileCheck',
        title: 'Certificate in your inbox',
        description: 'Approved certificates are sent as a secure PDF straight to your email. Accepted by all Australian employers.',
        time: 'Instant delivery',
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
        description: 'Most requests are reviewed within 30-60 minutes during business hours (8am-10pm AEST). We\'ll email you when the doctor starts reviewing.',
      },
      {
        icon: 'MessageCircle',
        title: 'Doctor may message you',
        description: 'If the doctor needs more information, they\'ll message you through our secure platform. Most queries are resolved quickly via text.',
      },
      {
        icon: 'Phone',
        title: 'Brief call (rare)',
        description: 'In some cases, the doctor may need a quick phone call to clarify symptoms. This is rare and only happens when clinically necessary.',
      },
      {
        icon: 'RefreshCw',
        title: 'If we can\'t help',
        description: 'If your request isn\'t suitable for online assessment, we\'ll refund your payment (minus $4.95 admin fee) and explain why.',
      },
    ],
  },
  
  pricing: {
    title: 'One flat fee. Save $40–70 vs a GP.',
    subtitle: 'One flat fee — no hidden costs. Full refund if we can\'t help.',
    price: 19.95,
    originalPrice: 70,
    features: [
      'Accepted by all Australian employers',
      'Reviewed by an AHPRA-registered GP',
      'Secure PDF delivered to your inbox',
      'Doctor\'s name & provider number on every cert',
      'Message your doctor if you have questions',
      'Covers work, uni, or carer\'s leave',
    ],
    refundNote: 'Full refund if we can\'t help (minus $4.95 admin fee)',
    medicareNote: 'Medicare rebates do not apply to telehealth consultations',
  },
  
  trust: {
    title: 'A real certificate from a real doctor',
    badges: [
      {
        icon: 'BadgeCheck',
        title: 'AHPRA Registered',
        description: 'Every certificate is issued by a doctor registered with the Australian Health Practitioner Regulation Agency',
      },
      {
        icon: 'Building2',
        title: '100% Australian',
        description: 'Our doctors and our team are based in Australia. No offshore call centres.',
      },
      {
        icon: 'Lock',
        title: 'Secure & Private',
        description: 'Bank-level encryption. Your health information stays between you and your doctor.',
      },
      {
        icon: 'Shield',
        title: 'Employer Accepted',
        description: 'Legally valid certificates accepted by all Australian employers and universities',
      },
    ],
  },
  
  testimonials: {
    title: 'What patients say',
    subtitle: 'Real reviews from Australians who\'ve used our service',
    reviews: [
      {
        text: 'Got my med cert really quickly. The doctor was professional and the whole process was seamless. My employer accepted it no questions asked.',
        author: 'Sarah M.',
        location: 'Sydney',
        rating: 5,
      },
      {
        text: 'Was skeptical but the doctor was legit thorough. Asked proper questions about my symptoms. Certificate came through quickly.',
        author: 'James K.',
        location: 'Melbourne',
        rating: 5,
      },
      {
        text: 'Lying in bed with the flu and needed a cert for work. Done from my phone in 20 minutes. This is how healthcare should work.',
        author: 'Emma L.',
        location: 'Brisbane',
        rating: 5,
      },
    ],
  },
  
  faq: {
    title: 'Common questions',
    subtitle: 'Everything you need to know about getting your certificate.',
    items: [
      {
        question: 'Will my employer accept this?',
        answer: 'Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers. Same as what you\'d get from a clinic.',
      },
      {
        question: 'Can I use this for uni or TAFE?',
        answer: 'Absolutely. We issue certificates for university, TAFE, and other educational institutions. Just select "study" when you start your request.',
      },
      {
        question: 'What if I\'m actually quite sick?',
        answer: 'If the doctor thinks your symptoms need further investigation, they\'ll let you know and recommend seeing a GP in person. You\'ll get a full refund if we can\'t issue a certificate.',
      },
      {
        question: 'How do I receive my certificate?',
        answer: 'Once approved, your certificate is available as a secure PDF in your dashboard. You\'ll get an email notification the moment it\'s ready.',
      },
      {
        question: 'Can I get a certificate backdated?',
        answer: 'Certificates can cover absences up to 48 hours ago if clinically appropriate. Just indicate the dates you were unwell when completing the form.',
      },
    ],
  },

  finalCta: {
    headline: 'Still feeling rough? Let us handle the paperwork.',
    subheadline: 'Two minutes on your phone. A real doctor reviews it. Certificate in your inbox.',
    ctaText: 'Get your certificate',
  },

  accentColor: 'emerald',
}

// ===========================================
// REPEAT PRESCRIPTIONS LANDING PAGE
// ===========================================
export const repeatScriptFunnelConfig: ServiceFunnelConfig = {
  serviceId: 'repeat-script',
  serviceName: 'Repeat Prescriptions',
  serviceSlug: 'repeat-prescriptions',

  hero: {
    badge: 'Prescribed by Australian GPs',
    headline: 'Repeat prescriptions.',
    headlineRotatingWords: ['Reviewed by Australian GPs.', 'eScript to your phone.', 'Any pharmacy, same day.'],
    subheadline: `For medications you already take. A doctor reviews your request and sends an eScript straight to your phone. No appointment needed.`,
    reassurances: [
      'AHPRA-registered doctors · Works at any pharmacy · Full refund if we can\'t help',
      'No account required · Full refund if we can\'t help',
    ],
    ctaText: `Renew your script — ${PRICING_DISPLAY.REPEAT_SCRIPT}`,
    ctaHref: '/request?service=prescription',
    images: {
      primary: '/images/rptrx-1.jpeg',
    },
    highlightBadge: {
      text: 'eScript sent via SMS',
      glow: true,
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
        description: 'Blood pressure, cholesterol, contraceptives, asthma inhalers, reflux medications, and other routine prescriptions.',
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
    title: 'Three steps. Script on your phone. \uD83D\uDCF1',
    subtitle: 'Tell us what you need. A doctor checks it\'s safe. eScript sent via SMS.',
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
        title: 'eScript sent to your phone',
        description: 'Your prescription is sent as an eScript via SMS. Take your phone to any pharmacy to collect.',
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
  
  pricing: {
    title: 'One flat fee. Save $30–60 vs a GP.',
    subtitle: `${PRICING_DISPLAY.REPEAT_SCRIPT} flat fee. Full refund if we can\'t help. Medication cost is separate at your pharmacy.`,
    price: 29.95,
    originalPrice: 80,
    features: [
      'Reviewed by an AHPRA-registered GP',
      'eScript sent straight to your phone',
      'Works at any pharmacy in Australia',
      'Repeats included where appropriate',
      'Message your doctor with questions',
      'PBS subsidies may apply at pharmacy',
    ],
    refundNote: 'Full refund if we can\'t help',
    medicareNote: 'Medicare rebates do not apply. PBS subsidies apply at pharmacy.',
  },
  
  trust: {
    title: 'Safe, legitimate prescriptions',
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
  
  testimonials: {
    title: 'What patients say',
    subtitle: 'Real reviews from Australians who\'ve used our service',
    reviews: [
      {
        text: 'Needed my blood pressure meds renewed. Usually takes a week to see my doctor. This took 20 minutes. Got the eScript on my phone and picked it up same day.',
        author: 'David R.',
        location: 'Gold Coast',
        rating: 5,
      },
      {
        text: 'So convenient for my regular contraceptive prescription. The doctor asked good questions and I felt confident in the process.',
        author: 'Jessica W.',
        location: 'Adelaide',
        rating: 5,
      },
      {
        text: 'Living remote, nearest doctor is 2 hours away. This service is a game changer for my regular medications.',
        author: 'Ryan P.',
        location: 'Darwin',
        rating: 5,
      },
    ],
  },
  
  faq: {
    title: 'Common questions',
    subtitle: 'Everything you need to know about renewing your prescription.',
    items: [
      {
        question: 'What medications can you prescribe?',
        answer: 'We can prescribe most common repeat medications — blood pressure, cholesterol, contraceptives, asthma inhalers, reflux, thyroid, and more. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines.',
      },
      {
        question: 'Is the eScript accepted at any pharmacy?',
        answer: 'Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they\'ll scan it directly — no paper needed.',
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
    headline: 'Don\'t wait a week for a 5-minute script.',
    subheadline: 'Answer a few questions. A doctor reviews it. eScript on your phone, same day.',
    ctaText: 'Renew your script',
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
    headline: 'See a doctor today.',
    headlineRotatingWords: ['No waiting rooms.', 'Prescriptions if needed.', 'From your phone.'],
    subheadline: `Talk to an AHPRA-registered GP about health concerns, treatment options, or anything you'd normally see a doctor for. Prescriptions and referrals included if appropriate.`,
    reassurances: [
      'AHPRA-registered doctors · Prescriptions & referrals if needed · Full refund if we can\'t help',
      'No account required · Full refund if we can\'t help',
    ],
    ctaText: `Start your consult — ${PRICING_DISPLAY.CONSULT}`,
    ctaHref: '/request?service=consult',
    highlightBadge: {
      text: 'Prescriptions included',
      glow: true,
    },
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
        href: '/request?service=consult',
      },
      {
        icon: 'Sparkles',
        title: 'Hair Loss',
        description: 'Medical assessment for hair loss. Evidence-based treatments prescribed by an Australian GP.',
        price: PRICING_DISPLAY.HAIR_LOSS,
        href: '/request?service=consult',
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
    title: 'Three steps. A real doctor. \uD83E\uDE7A',
    subtitle: 'Start with a questionnaire, then a doctor assesses your situation — often with a brief call.',
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
    subtitle: `${PRICING_DISPLAY.CONSULT} flat fee — no gap fees, no surprises. Same quality of care as in-person.`,
    price: 49.95,
    originalPrice: 120,
    features: [
      'Full clinical assessment by an AHPRA-registered GP',
      'Phone or video consultation',
      'Prescriptions if clinically appropriate',
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

  testimonials: {
    title: 'What patients say',
    subtitle: 'Real reviews from Australians who\'ve used our service',
    reviews: [
      {
        text: 'Had a weird rash I was worried about. The doctor called, asked me to send photos, and diagnosed it quickly. Got a prescription and it cleared up.',
        author: 'Michael T.',
        location: 'Perth',
        rating: 5,
      },
      {
        text: 'Needed advice about ongoing headaches. The doctor was thorough, asked good questions, and referred me for tests. Felt properly looked after.',
        author: 'Sophie H.',
        location: 'Canberra',
        rating: 5,
      },
      {
        text: 'Much better than I expected from online healthcare. The doctor actually called and spent time understanding my symptoms.',
        author: 'Chris B.',
        location: 'Newcastle',
        rating: 5,
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
        answer: 'You get the same quality of care from an AHPRA-registered GP — just without the waiting room. The main limitation is the doctor can\'t physically examine you, so some conditions may still need an in-person visit.',
      },
      {
        question: 'What if my issue needs in-person care?',
        answer: 'If the doctor determines your concern requires a physical examination, they\'ll let you know and recommend seeing a GP in person. You\'ll receive a full refund.',
      },
    ],
  },

  finalCta: {
    headline: 'Why wait days for a GP appointment?',
    subheadline: 'Start with a quick questionnaire. A doctor reviews and typically calls within 2 hours.',
    ctaText: 'Talk to a doctor today',
  },

  accentColor: 'sky',
}
