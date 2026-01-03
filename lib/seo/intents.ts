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

  {
    slug: 'repeat-prescription-online',
    type: 'intent',
    title: 'Repeat Prescription Online Australia | Renew Script Fast | InstantMed',
    description: 'Need a repeat prescription? Get your script renewed online from Australian doctors. Same medication, no appointment needed. From $29.95.',
    h1: 'Repeat Prescription Online — Quick & Easy Renewal',
    content: {
      intro: 'Running low on your regular medication? Get your repeat prescription online without visiting a clinic. Our Australian doctors can renew scripts for ongoing medications you\'re already taking.',
      uniqueBlocks: [
        {
          id: 'what-we-can-renew',
          type: 'list',
          content: [
            'Blood pressure medications (if stable)',
            'Cholesterol medications (statins)',
            'Contraceptive pill (same brand)',
            'Thyroid medications (if stable)',
            'Chronic condition medications',
            'Regular medications you\'ve been taking for months',
          ],
        },
        {
          id: 'what-we-need',
          type: 'text',
          content: 'To renew your prescription, we need to know: what medication you\'re taking (name and dose), how long you\'ve been on it, when you last saw a doctor about it, and if you\'ve had any problems or side effects. If your condition is stable and you\'re due for a routine repeat, we can usually help.',
        },
        {
          id: 'when-see-gp',
          type: 'callout',
          content: 'See your regular GP if: you need a dose change, you\'re experiencing side effects, your condition has changed, you\'re due for blood tests or reviews, or you haven\'t seen a doctor about this condition in over 12 months.',
        },
      ],
    },
    metadata: {
      keywords: [
        'repeat prescription online',
        'renew prescription online',
        'online script renewal',
        'prescription refill online australia',
        'repeat script online',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Can you renew any prescription online?',
          answer: 'We can renew most regular medications for stable conditions. We cannot prescribe new medications, Schedule 8 controlled substances, or medications that require physical examination or blood tests.',
        },
        {
          question: 'Do I need to provide previous scripts?',
          answer: 'Not necessarily, but it helps if you know the exact medication name, strength, and your current dosing schedule. Having a photo of your current medication is useful.',
        },
        {
          question: 'How long does a repeat prescription take?',
          answer: 'Most repeat prescriptions are reviewed within 1-3 hours. Priority review is available for urgent needs. Your e-script is sent via SMS.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'high-blood-pressure', title: 'Blood Pressure Medication Repeats' },
        { type: 'condition', slug: 'high-cholesterol', title: 'Cholesterol Medication Repeats' },
        { type: 'category', slug: 'prescriptions', title: 'Prescription Services' },
      ],
    },
    intent: {
      searchQuery: 'repeat prescription online',
      alternateQueries: [
        'renew prescription online',
        'online script renewal',
        'prescription refill online',
        'repeat script online',
        'renew script online',
      ],
      userNeed: 'Renew existing medication without GP visit',
      urgency: 'same-day',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Renew Prescription',
      ctaUrl: '/prescriptions?type=repeat',
    },
  },

  {
    slug: 'work-certificate-online',
    type: 'intent',
    title: 'Work Certificate Online Australia | Sick Leave Certificate | InstantMed',
    description: 'Need a work certificate for sick leave? Get one online within hours from Australian doctors. Employer-accepted. From $19.95.',
    h1: 'Work Certificate Online — Valid for Sick Leave',
    content: {
      intro: 'Feeling too unwell to work? Get a medical certificate for sick leave without visiting a clinic. Our certificates are issued by AHPRA-registered doctors and meet Fair Work requirements.',
      uniqueBlocks: [
        {
          id: 'fair-work-compliant',
          type: 'text',
          content: 'Under Fair Work regulations, medical certificates from telehealth doctors are just as valid as certificates from physical clinics. Our certificates include all required information: your name, dates of absence, doctor\'s details with AHPRA registration number, and medical practice information. Employers must accept them.',
        },
        {
          id: 'common-reasons',
          type: 'list',
          content: [
            'Cold, flu, or respiratory infection',
            'Gastroenteritis (stomach bug)',
            'Migraine or severe headache',
            'Back pain or injury',
            'Mental health day',
            'Medical appointment',
          ],
        },
        {
          id: 'what-employers-need',
          type: 'text',
          content: 'Most employers require a medical certificate if you\'re absent for more than 2-3 days, or if you\'ve used all casual sick leave. Our certificates clearly state: dates you were unfit for work, that you were assessed by a registered doctor, and doctor\'s registration details. You can forward the PDF directly to your employer.',
        },
      ],
    },
    metadata: {
      keywords: [
        'work certificate online',
        'sick leave certificate',
        'medical certificate for work',
        'work sick certificate online',
        'employer medical certificate',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Will my employer accept an online medical certificate?',
          answer: 'Yes — our certificates are issued by AHPRA-registered Australian doctors and meet all Fair Work requirements. They are legally valid for sick leave.',
        },
        {
          question: 'Can I get a certificate for today?',
          answer: 'Yes — we can issue certificates for the current day if you\'re currently unwell. Standard review is 1-3 hours, or choose priority for 30-60 minute turnaround.',
        },
        {
          question: 'Can I backdate a work certificate?',
          answer: 'Certificates can be backdated up to 3 days at no extra charge. Beyond 3 days may require a phone consultation to verify details.',
        },
      ],
    },
    links: {
      related: [
        { type: 'intent', slug: 'same-day-medical-certificate', title: 'Same Day Medical Certificates' },
        { type: 'audience', slug: 'shift-workers', title: 'Certificates for Shift Workers' },
        { type: 'condition', slug: 'cold-and-flu', title: 'Cold & Flu Certificates' },
      ],
    },
    intent: {
      searchQuery: 'work certificate online',
      alternateQueries: [
        'sick leave certificate',
        'work sick certificate',
        'medical certificate for work',
        'employer medical certificate online',
      ],
      userNeed: 'Get valid sick leave certificate for employer',
      urgency: 'same-day',
      serviceType: 'medical-certificate',
    },
    conversion: {
      primaryCTA: 'Get Work Certificate',
      ctaUrl: '/medical-certificate/new',
    },
  },

  {
    slug: 'emergency-contraception-online',
    type: 'intent',
    title: 'Emergency Contraception Online Australia | Plan B | InstantMed',
    description: 'Need emergency contraception (morning after pill)? Get it prescribed online fast. Australian doctors. E-script within hours.',
    h1: 'Emergency Contraception — Fast Online Access',
    content: {
      intro: 'Emergency contraception (the "morning after pill") can prevent pregnancy after unprotected sex or contraceptive failure. Time is critical — it\'s most effective when taken as soon as possible.',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Emergency contraceptive pills work by delaying or preventing ovulation. Levonorgestrel (Plan B) works best within 72 hours but can be used up to 120 hours (5 days) after unprotected sex. Ulipristal (EllaOne) is more effective and works up to 120 hours. The sooner you take it, the more effective it is.',
        },
        {
          id: 'what-we-need-to-know',
          type: 'list',
          content: [
            'When did unprotected sex occur? (time is critical)',
            'Are you currently using any contraception?',
            'When was your last period?',
            'Any chance you might already be pregnant?',
            'Any medications or health conditions?',
          ],
        },
        {
          id: 'important',
          type: 'callout',
          content: 'Emergency contraception is NOT an abortion pill — it won\'t work if you\'re already pregnant. It\'s also not suitable for regular use. If you need ongoing contraception, ask about regular contraceptive options.',
        },
      ],
    },
    metadata: {
      keywords: [
        'emergency contraception online',
        'morning after pill online',
        'plan b online australia',
        'emergency contraceptive pill',
        'levonorgestrel online',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How quickly can I get emergency contraception?',
          answer: 'Priority review is available for emergency contraception requests. E-script is typically sent within 30-60 minutes. You can then pick up from most pharmacies immediately.',
        },
        {
          question: 'Is it too late if it\'s been 3 days?',
          answer: 'No — levonorgestrel works up to 72 hours (best) and ulipristal works up to 120 hours (5 days). However, effectiveness decreases with time, so take it as soon as possible.',
        },
        {
          question: 'Will emergency contraception affect my period?',
          answer: 'Your next period may be earlier, later, or heavier than usual. If your period is more than 7 days late, take a pregnancy test.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'contraception', title: 'Regular Contraception Options' },
        { type: 'category', slug: 'womens-health', title: "Women's Health Services" },
      ],
    },
    intent: {
      searchQuery: 'emergency contraception online',
      alternateQueries: [
        'morning after pill online',
        'plan b online',
        'emergency contraceptive pill',
        'levonorgestrel online',
        'ella one online',
      ],
      userNeed: 'Get emergency contraception fast to prevent pregnancy',
      urgency: 'immediate',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Get Emergency Contraception',
      ctaUrl: '/prescriptions?condition=emergency-contraception&priority=true',
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
