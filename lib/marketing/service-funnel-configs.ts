import type { ServiceFunnelConfig } from '@/components/marketing/service-funnel-page'

// ===========================================
// MEDICAL CERTIFICATES LANDING PAGE
// ===========================================
export const medCertFunnelConfig: ServiceFunnelConfig = {
  serviceId: 'med-cert',
  serviceName: 'Medical Certificates',
  serviceSlug: 'medical-certificates',
  
  hero: {
    badge: 'Doctors online now',
    headline: 'Medical certificate.',
    headlineRotatingWords: ['Sorted.', 'Delivered.', 'Done.'],
    subheadline: 'Get a valid certificate for work or uni, reviewed by an Australian-registered doctor. Most requests sorted in under an hour.',
    reassurances: [
      'No signup to get started',
      'Most requests reviewed via text',
      'Refund if we can\'t help',
      'AHPRA registered doctors',
    ],
    ctaText: 'Get started',
    ctaHref: '/start?service=med-cert',
    images: {
      primary: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=500&fit=crop&crop=face',
      secondary: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face',
    },
    highlightBadge: {
      text: 'Most requests don\'t need a call',
      glow: false,
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
        icon: 'AlertCircle',
        title: 'Same-day or recent absence',
        description: 'Certificates can cover absences up to 48 hours ago if clinically appropriate. Beyond that, see your GP.',
        type: 'info',
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
    title: 'Three steps. Done in minutes.',
    subtitle: 'No appointments, no waiting rooms. Just answer a few questions from your phone.',
    steps: [
      {
        number: '1',
        icon: 'ClipboardList',
        title: 'Tell us about your absence',
        description: 'Select the type of certificate (work, study, carer\'s) and answer a few health questions.',
        time: '2 min',
      },
      {
        number: '2',
        icon: 'Stethoscope',
        title: 'Doctor reviews your request',
        description: 'An AHPRA-registered GP reviews your submission. They may message you if they need clarification.',
        time: 'Under 1 hour',
      },
      {
        number: '3',
        icon: 'FileCheck',
        title: 'Certificate delivered',
        description: 'If approved, your certificate is sent as a secure PDF to your email. Valid for all employers.',
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
    title: 'Simple, transparent pricing',
    subtitle: 'One flat fee. No hidden costs.',
    price: 19.95,
    features: [
      'Valid for all employers & institutions',
      'Reviewed by AHPRA-registered doctor',
      'Secure PDF delivery to email',
      'Doctor\'s name & provider number included',
      'Message your doctor if needed',
      'Covers work, study, or carer\'s leave',
    ],
    refundNote: 'Full refund if we can\'t help (minus $4.95 admin fee)',
    medicareNote: 'Medicare rebates do not apply to telehealth consultations',
  },
  
  trust: {
    title: 'Your certificate is legitimate',
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
        description: 'Bank-level encryption. Your information stays confidential.',
      },
      {
        icon: 'Shield',
        title: 'Employer Accepted',
        description: 'Our certificates are legally valid and accepted by all Australian employers',
      },
    ],
  },
  
  testimonials: {
    title: 'What patients say',
    subtitle: 'Real reviews from Australians who\'ve used our service',
    reviews: [
      {
        text: 'Got my med cert in under 30 minutes. The doctor was professional and the whole process was seamless. My employer accepted it no questions asked.',
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
  
  finalCta: {
    headline: 'Ready to get your certificate?',
    subheadline: 'Complete the questionnaire in about 2 minutes. A doctor reviews your request within an hour.',
    ctaText: 'Request your certificate',
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
    badge: 'Prescription Renewals',
    headline: 'Renew your regular medication from home',
    subheadline: 'For medications you already take. A doctor reviews your request and sends an eScript to your phone via SMS.',
    reassurances: [
      'No signup to get started',
      'Most requests reviewed via text',
      'Refund if we can\'t help',
      'Any pharmacy Australia-wide',
    ],
    ctaText: 'Request your script',
    ctaHref: '/start?service=repeat-script',
    highlightBadge: {
      text: 'Most requests don\'t need a call',
      glow: false,
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
    title: 'Three steps. Done in minutes.',
    subtitle: 'Tell us what you need, a doctor reviews, and your eScript is sent to your phone.',
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
        description: 'An AHPRA-registered GP reviews your request. They\'ll check it\'s safe and appropriate to continue.',
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
        description: 'The doctor might ask about your last blood tests, when you last saw your GP, or other relevant health information.',
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
    title: 'Simple, transparent pricing',
    subtitle: 'Consultation fee only. Medication cost is separate at your pharmacy.',
    price: 29.95,
    features: [
      'Doctor review of your request',
      'eScript sent to your phone',
      'Works at any pharmacy',
      'Repeats included where appropriate',
      'Message your doctor if needed',
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
        text: 'Needed my blood pressure meds renewed. Usually takes a week to see my GP. This took 20 minutes. Got the eScript on my phone and picked it up same day.',
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
        text: 'Living remote, nearest GP is 2 hours away. This service is a game changer for my regular medications.',
        author: 'Ryan P.',
        location: 'Darwin',
        rating: 5,
      },
    ],
  },
  
  finalCta: {
    headline: 'Ready to renew your prescription?',
    subheadline: 'Complete the questionnaire in about 2 minutes. A doctor reviews your request within an hour.',
    ctaText: 'Renew your prescription',
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
    badge: 'Online GP Consultation',
    headline: 'A proper GP consult, without the clinic visit',
    subheadline: 'For new health concerns or treatment advice. Speak with an Australian doctor who\'ll assess your situation and recommend next steps.',
    reassurances: [
      'No signup to get started',
      'Refund if we can\'t help',
      'AHPRA-registered doctors',
      'Prescriptions if appropriate',
    ],
    ctaText: 'Book a consult',
    ctaHref: '/start?service=consult',
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
    title: 'How it works',
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
        description: 'A GP reviews your information and will often call you to discuss further. This ensures a proper clinical assessment.',
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
    title: 'Consultation pricing',
    subtitle: 'A fraction of typical GP costs, with the same quality of care.',
    price: 49.95,
    features: [
      'Full clinical assessment',
      'Phone or video consultation',
      'Prescriptions if clinically appropriate',
      'Referral letters if needed',
      'Follow-up messaging with your doctor',
      'Written summary of consultation',
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
        description: 'Same standard of care as in-person GP visits',
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
  
  finalCta: {
    headline: 'Ready to speak with a doctor?',
    subheadline: 'Start with a quick questionnaire. A doctor will review and typically call within 2 hours.',
    ctaText: 'Book your consultation',
  },
  
  accentColor: 'violet',
}
