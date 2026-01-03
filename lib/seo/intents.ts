/**
 * Intent Pages Data
 * High-intent search queries mapped to conversion pages
 * 
 * Examples:
 * - "same day medical certificate"
 * - "doctor's certificate online"
 * - "UTI script online"
 * - "after hours telehealth"
 */

import type { SEOPage, FAQ } from './registry'

export interface IntentPage extends Omit<SEOPage, 'type'> {
  type: 'intent'
  intent: {
    searchQuery: string // Primary search term
    alternateQueries: string[] // Variations
    userNeed: string // What the user actually wants
    urgency: 'immediate' | 'same-day' | 'flexible'
    serviceType: 'medical-certificate' | 'prescription' | 'consult' | 'multiple'
  }
  conversion: {
    primaryCTA: string
    ctaUrl: string
    secondaryCTA?: string
    secondaryCTAUrl?: string
  }
}

export const intentPages: IntentPage[] = [
  {
    slug: 'same-day-medical-certificate',
    type: 'intent',
    title: 'Same Day Medical Certificate Online | Get It Within Hours | InstantMed',
    description: 'Need a medical certificate today? Get one within 1-24 hours from Australian doctors. Valid for employers and universities. From $19.95.',
    h1: 'Same Day Medical Certificate — Fast & Valid',
    content: {
      intro: 'Feeling unwell and need a medical certificate for work or uni today? Our Australian doctors can issue valid medical certificates within hours, delivered straight to your email. No appointments, no waiting rooms.',
      uniqueBlocks: [
        {
          id: 'how-fast',
          type: 'text',
          content: 'Most medical certificates are reviewed and issued within 1-3 hours during business hours (7am-10pm AEST, 7 days a week). Choose priority review for 30-60 minute turnaround. Your certificate is emailed as a PDF and is immediately valid.',
        },
        {
          id: 'what-employers-accept',
          type: 'text',
          content: 'Our medical certificates are issued by AHPRA-registered GPs and are legally valid for Australian workplaces and educational institutions. They meet Fair Work requirements and include all necessary details: your name, dates of absence, doctor details with AHPRA number, and clinic information.',
        },
        {
          id: 'process',
          type: 'list',
          content: [
            'Answer a few questions about your symptoms (takes 2-3 minutes)',
            'Pay $19.95 via secure payment',
            'Australian doctor reviews your case',
            'Certificate emailed to you within 1-3 hours (or 30-60 min with priority)',
            'Forward to your employer or upload to your HR system',
          ],
        },
        {
          id: 'when-to-use',
          type: 'callout',
          content: 'Perfect for: cold/flu, gastro, migraine, injury, mental health day, medical appointments. NOT for emergencies — if you\'re experiencing chest pain, difficulty breathing, or other serious symptoms, call 000.',
        },
      ],
    },
    metadata: {
      keywords: [
        'same day medical certificate',
        'medical certificate today',
        'urgent medical certificate',
        'fast medical certificate online',
        'medical certificate within hours',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How quickly can I get a medical certificate?',
          answer: 'Most certificates are issued within 1-3 hours during business hours (7am-10pm AEST). For urgent needs, choose priority review for 30-60 minute turnaround. Overnight requests are reviewed first thing in the morning.',
        },
        {
          question: 'Will my employer accept an online medical certificate?',
          answer: 'Yes — our certificates are issued by AHPRA-registered Australian GPs and meet all Fair Work requirements. They\'re legally equivalent to certificates from a physical clinic.',
        },
        {
          question: 'Can I backdate a medical certificate?',
          answer: 'Yes, certificates can be backdated up to 3 days at no extra charge. Backdating beyond 3 days may require a phone consultation with the doctor to verify details.',
        },
        {
          question: 'What if I need a certificate for multiple days?',
          answer: 'You can request certificates for up to 5 consecutive days through our standard process. Longer durations may require additional information or follow-up.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'cold-and-flu', title: 'Cold & Flu Medical Certificates' },
        { type: 'audience', slug: 'students', title: 'Medical Certificates for Students' },
        { type: 'audience', slug: 'shift-workers', title: 'Certificates for Shift Workers' },
      ],
    },
    intent: {
      searchQuery: 'same day medical certificate',
      alternateQueries: [
        'medical certificate today',
        'urgent medical certificate',
        'fast medical certificate',
        'medical certificate within hours',
        'last minute medical certificate',
      ],
      userNeed: 'Get a valid medical certificate quickly for work/uni',
      urgency: 'immediate',
      serviceType: 'medical-certificate',
    },
    conversion: {
      primaryCTA: 'Get Medical Certificate Now',
      ctaUrl: '/medical-certificate/new',
      secondaryCTA: 'Learn More About Our Service',
      secondaryCTAUrl: '/medical-certificate',
    },
  },

  {
    slug: 'uti-treatment-online',
    type: 'intent',
    title: 'UTI Treatment Online Australia | Same Day Antibiotics | InstantMed',
    description: 'Burning when you pee? Get UTI treatment online from Australian doctors. Same-day antibiotic prescription if appropriate. From $29.95.',
    h1: 'UTI Treatment Online — Fast Relief When You Need It',
    content: {
      intro: 'Urinary tract infections are uncomfortable, urgent, and need quick treatment. Our Australian doctors can assess your symptoms online and prescribe antibiotics if appropriate, with your e-script sent to your phone within hours.',
      uniqueBlocks: [
        {
          id: 'symptoms-we-treat',
          type: 'list',
          content: [
            'Burning or stinging when urinating',
            'Urgent need to pee frequently',
            'Cloudy, dark, or strong-smelling urine',
            'Lower abdominal pain or discomfort',
            'Mild fever (not high fever)',
          ],
        },
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Complete a quick symptom questionnaire, answer questions about your health history, and our doctor will review your case. If your symptoms are consistent with a straightforward UTI and there are no red flags, we can prescribe appropriate antibiotics. Your e-script is sent via SMS and can be filled at any Australian pharmacy.',
        },
        {
          id: 'when-to-see-gp',
          type: 'callout',
          content: 'See a GP in person if you have: blood in urine, high fever/chills, severe back pain, vomiting, are pregnant, or have recurrent UTIs (3+ per year). These require physical examination or further testing.',
        },
      ],
    },
    metadata: {
      keywords: [
        'UTI treatment online',
        'UTI antibiotics online',
        'urinary tract infection online doctor',
        'uti prescription online',
        'uti treatment australia',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Can you prescribe antibiotics for a UTI online?',
          answer: 'Yes — if your symptoms are consistent with a straightforward UTI and you don\'t have any red flags (like fever, blood in urine, pregnancy), our doctors can prescribe appropriate antibiotics.',
        },
        {
          question: 'Do I need a urine test?',
          answer: 'For typical UTI symptoms in otherwise healthy women, treatment can often begin based on symptoms alone. If your case is unclear, recurrent, or complicated, we may recommend a urine culture before prescribing.',
        },
        {
          question: 'How quickly will the antibiotics work?',
          answer: 'Most people start feeling relief within 24-48 hours of starting antibiotics. Always complete the full course even if you feel better.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'uti', title: 'UTI Information & Treatment' },
        { type: 'medication', slug: 'trimethoprim', title: 'Trimethoprim for UTI' },
        { type: 'category', slug: 'womens-health', title: "Women's Health Services" },
      ],
    },
    intent: {
      searchQuery: 'uti treatment online',
      alternateQueries: [
        'uti antibiotics online',
        'online doctor for uti',
        'uti prescription online',
        'treat uti online',
        'uti telehealth',
      ],
      userNeed: 'Get antibiotics for UTI symptoms quickly',
      urgency: 'same-day',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Get UTI Treatment',
      ctaUrl: '/prescriptions?condition=uti',
      secondaryCTA: 'Learn About UTI Treatment',
      secondaryCTAUrl: '/conditions/uti',
    },
  },

  {
    slug: 'after-hours-doctor',
    type: 'intent',
    title: 'After Hours Doctor Online | Evenings & Weekends | InstantMed',
    description: 'Need a doctor after hours? Get medical certificates and prescriptions evenings and weekends. Australian doctors available 7 days, 7am-10pm.',
    h1: 'After Hours Doctor — Available When You Need Us',
    content: {
      intro: 'Sick on the weekend or after work? Our Australian doctors are available 7 days a week, 7am-10pm AEST. Get medical certificates, repeat prescriptions, and consultations outside traditional clinic hours.',
      uniqueBlocks: [
        {
          id: 'availability',
          type: 'text',
          content: 'We know illness doesn\'t follow a 9-5 schedule. That\'s why our doctors review requests 7 days a week, from 7am to 10pm AEST. Submit your request anytime — even at 2am — and it will be reviewed when our doctors are next available.',
        },
        {
          id: 'what-we-can-help',
          type: 'list',
          content: [
            'Medical certificates for Monday morning (submitted Sunday night)',
            'Repeat prescriptions when your regular GP is closed',
            'UTI treatment on weekends',
            'Cold/flu certificates for shift workers',
            'Urgent prescription refills',
          ],
        },
        {
          id: 'turnaround',
          type: 'text',
          content: 'Standard requests are reviewed within 24 hours, usually much faster during business hours and weekends. Priority requests are reviewed within 30-60 minutes during service hours. Requests submitted overnight are reviewed first thing in the morning.',
        },
      ],
    },
    metadata: {
      keywords: [
        'after hours doctor online',
        'weekend doctor online',
        'online doctor evenings',
        'telehealth after hours',
        'doctor available weekends',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Are doctors available 24/7?',
          answer: 'Doctors are available 7 days a week from 7am-10pm AEST. Requests submitted outside these hours are reviewed first thing in the morning.',
        },
        {
          question: 'Is it more expensive after hours?',
          answer: 'No — our pricing is the same regardless of when you submit your request. Medical certificates are $19.95, prescriptions are $29.95, and consultations are $49.95.',
        },
        {
          question: 'What if I have an emergency after hours?',
          answer: 'For medical emergencies (chest pain, difficulty breathing, severe injury), call 000 or go to your nearest emergency department. We\'re for non-urgent medical needs.',
        },
      ],
    },
    links: {
      related: [
        { type: 'audience', slug: 'shift-workers', title: 'Telehealth for Shift Workers' },
        { type: 'intent', slug: 'same-day-medical-certificate', title: 'Same Day Medical Certificates' },
      ],
    },
    intent: {
      searchQuery: 'after hours doctor online',
      alternateQueries: [
        'weekend doctor',
        'online doctor evenings',
        'doctor available weekends',
        'telehealth after hours',
        'online doctor sundays',
      ],
      userNeed: 'Access medical services outside business hours',
      urgency: 'flexible',
      serviceType: 'multiple',
    },
    conversion: {
      primaryCTA: 'Get Started',
      ctaUrl: '/start',
    },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getIntentPageBySlug(slug: string): IntentPage | undefined {
  return intentPages.find(p => p.slug === slug)
}

export function getAllIntentSlugs(): string[] {
  return intentPages.map(p => p.slug)
}

export function getIntentPagesByUrgency(urgency: 'immediate' | 'same-day' | 'flexible'): IntentPage[] {
  return intentPages.filter(p => p.intent.urgency === urgency)
}
