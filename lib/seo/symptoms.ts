/**
 * Symptom Pages Data
 * SEO pages targeting symptom-based searches
 * 
 * Examples:
 * - "burning when urinating"
 * - "hair thinning"  
 * - "performance anxiety"
 * - "reflux at night"
 */

import type { SEOPage, FAQ } from './registry'

export interface SymptomPage extends Omit<SEOPage, 'type'> {
  type: 'symptom'
  symptom: {
    commonName: string
    medicalTerm?: string
    severity: 'mild' | 'moderate' | 'urgent' | 'emergency'
    bodySystem: 'digestive' | 'urinary' | 'respiratory' | 'skin' | 'mental' | 'sexual' | 'general'
  }
  causes: {
    common: string[]
    lessCommon: string[]
    emergency: string[]
  }
  selfCare: string[]
  whenToSeekHelp: {
    seeGPIf: string[]
    emergency: string[]
  }
  onlineTreatment: {
    canHelpWith: string[]
    whatWeOffer: string[]
    ctaText: string
    ctaUrl: string
  }
}

export const symptomPages: SymptomPage[] = [
  {
    slug: 'burning-when-urinating',
    type: 'symptom',
    title: 'Burning When Urinating | Causes & Treatment | InstantMed',
    description: 'Experiencing burning or stinging when you pee? Learn about causes (UTI, STI, etc.), when to seek help, and how to get online treatment from Australian doctors.',
    h1: 'Burning When Urinating — What It Means & What To Do',
    content: {
      intro: 'Burning, stinging, or pain when you urinate (dysuria) is one of the most common urinary symptoms. While often caused by a straightforward urinary tract infection, it can have other causes that need different treatments.',
      uniqueBlocks: [
        {
          id: 'what-causes-it',
          type: 'text',
          content: 'The burning sensation usually comes from inflammation or irritation of the urethra (the tube that carries urine out). In women, the most common cause is a bacterial infection of the bladder or urethra (UTI). In men, it may indicate prostatitis or an STI. Other causes include dehydration, certain soaps or products, or kidney stones.',
        },
        {
          id: 'uti-vs-sti',
          type: 'text',
          content: 'How can you tell the difference? UTIs usually come with frequent urination, urgency, and cloudy or smelly urine. STIs may have discharge, pain during sex, or no other symptoms. If you\'ve had unprotected sex recently or your symptoms don\'t match a typical UTI pattern, testing for STIs is important.',
        },
        {
          id: 'gender-differences',
          type: 'list',
          content: [
            'Women: UTIs are very common due to shorter urethra. Usually treated with short antibiotic course.',
            'Men: Burning in men is less common and may indicate prostatitis or STI. Needs careful assessment.',
            'Pregnancy: UTIs during pregnancy need prompt treatment to prevent complications.',
            'Recurrent: If it happens 3+ times per year, investigation is needed for underlying causes.',
          ],
        },
      ],
    },
    metadata: {
      keywords: [
        'burning when urinating',
        'pain when peeing',
        'stinging urination',
        'dysuria',
        'burning pee',
        'painful urination',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Is burning when urinating always a UTI?',
          answer: 'No — while UTI is the most common cause in women, other causes include STIs, vaginal irritation, kidney stones, prostatitis in men, or certain products/medications. If symptoms don\'t improve with typical UTI treatment, further investigation is needed.',
        },
        {
          question: 'Can I treat a UTI without antibiotics?',
          answer: 'Simple UTIs typically need antibiotics to clear the infection fully. Drinking lots of water and urinary alkalinizers may help symptoms but won\'t eliminate the bacteria. Untreated UTIs can spread to kidneys.',
        },
        {
          question: 'When should I see a doctor in person?',
          answer: 'See a GP in person if you have: fever/chills, blood in urine, severe back pain, vomiting, are pregnant, are male, or have recurrent UTIs. These need physical examination or testing.',
        },
        {
          question: 'How quickly should burning improve with treatment?',
          answer: 'With appropriate antibiotics for a UTI, most people feel relief within 24-48 hours. If symptoms worsen or don\'t improve after 2 days of treatment, contact your doctor.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'uti', title: 'UTI Treatment Information' },
        { type: 'medication', slug: 'trimethoprim', title: 'Trimethoprim for UTI' },
        { type: 'intent', slug: 'uti-treatment-online', title: 'Get UTI Treatment Online' },
      ],
    },
    symptom: {
      commonName: 'burning when urinating',
      medicalTerm: 'dysuria',
      severity: 'moderate',
      bodySystem: 'urinary',
    },
    causes: {
      common: [
        'Urinary tract infection (UTI) — most common in women',
        'Bladder infection (cystitis)',
        'Vaginal infection or irritation',
        'Dehydration (concentrated urine)',
        'Irritation from soaps, perfumes, or products',
      ],
      lessCommon: [
        'Sexually transmitted infection (chlamydia, gonorrhea)',
        'Kidney stones',
        'Prostatitis (in men)',
        'Interstitial cystitis',
        'Certain medications',
      ],
      emergency: [
        'Kidney infection (with fever, back pain, vomiting)',
        'Acute urinary retention (can\'t pee at all)',
        'Severe allergic reaction to medication',
      ],
    },
    selfCare: [
      'Drink plenty of water (2-3 liters per day)',
      'Urinate frequently, don\'t hold it in',
      'Avoid irritating products (bubble bath, harsh soaps)',
      'Urinate after sexual activity',
      'Cranberry products may help prevent UTIs (weak evidence)',
      'Over-the-counter urinary alkalinizers may ease discomfort',
    ],
    whenToSeekHelp: {
      seeGPIf: [
        'Symptoms last more than 2 days',
        'You\'re male (less common, needs assessment)',
        'Pregnant or might be pregnant',
        'Blood in your urine',
        'Recurrent UTIs (3+ per year)',
        'Pain during sex or unusual discharge',
      ],
      emergency: [
        'High fever (>38.5°C) with chills',
        'Severe back pain or flank pain',
        'Vomiting and unable to keep fluids down',
        'Complete inability to urinate',
        'Confusion or feeling very unwell',
      ],
    },
    onlineTreatment: {
      canHelpWith: [
        'Straightforward UTI symptoms in women',
        'No fever or severe symptoms',
        'First occurrence or infrequent UTIs',
        'Need antibiotics quickly',
      ],
      whatWeOffer: [
        'Quick symptom assessment by Australian doctor',
        'Antibiotic prescription if appropriate (e.g., trimethoprim)',
        'E-script sent to your phone within hours',
        'Advice on when to seek in-person care',
      ],
      ctaText: 'Get UTI Treatment Online',
      ctaUrl: '/prescriptions?condition=uti',
    },
  },

  {
    slug: 'hair-thinning',
    type: 'symptom',
    title: 'Hair Thinning | Causes, Treatment Options | InstantMed',
    description: 'Noticing hair thinning or loss? Learn about male and female pattern hair loss, treatment options like finasteride and minoxidil, and when to see a specialist.',
    h1: 'Hair Thinning — Causes & Treatment Options',
    content: {
      intro: 'Hair thinning is incredibly common — affecting about 50% of men by age 50 and many women, especially after menopause. While it can be distressing, several treatments can slow or reverse hair loss if started early.',
      uniqueBlocks: [
        {
          id: 'pattern-recognition',
          type: 'text',
          content: 'Male pattern hair loss typically shows as a receding hairline and thinning at the crown. Female pattern hair loss usually shows as widening of the part line and overall thinning on top, while the hairline stays intact. The pattern of loss helps determine the cause and appropriate treatment.',
        },
        {
          id: 'why-it-happens',
          type: 'text',
          content: 'The most common cause is androgenetic alopecia — genetic sensitivity to dihydrotestosterone (DHT), a hormone that makes hair follicles shrink. Other causes include stress (telogen effluvium), thyroid problems, iron deficiency, medications, or autoimmune conditions like alopecia areata.',
        },
        {
          id: 'treatment-options',
          type: 'list',
          content: [
            'Finasteride (men): Oral medication that blocks DHT. Stops loss in 90%, regrows hair in 65%.',
            'Minoxidil (men & women): Topical solution. Improves blood flow to follicles. Works for both genders.',
            'Dutasteride (men): Stronger DHT blocker. For cases where finasteride isn\'t effective enough.',
            'Spironolactone (women): For women with hormonal hair loss (PCOS, etc.).',
            'PRP injections: Platelet-rich plasma. Growing evidence for effectiveness.',
          ],
        },
      ],
    },
    metadata: {
      keywords: [
        'hair thinning',
        'hair loss treatment',
        'male pattern baldness',
        'female hair loss',
        'thinning hair',
        'alopecia treatment',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'At what age does hair loss start?',
          answer: 'Male pattern baldness can start in the early 20s but is more common from 30s onward. Women typically notice thinning after menopause, though it can occur earlier with hormonal issues.',
        },
        {
          question: 'Is hair loss reversible?',
          answer: 'It depends on the cause and how long you\'ve had it. Androgenetic alopecia can be slowed or partially reversed with treatment, especially if caught early. Once follicles are dormant for years, regrowth is unlikely.',
        },
        {
          question: 'Do hair loss treatments work?',
          answer: 'Yes — finasteride stops further loss in about 90% of men and regrows hair in 65%. Minoxidil works for both men and women. Results take 6-12 months. Treatment must be continued to maintain benefits.',
        },
        {
          question: 'Can stress cause hair loss?',
          answer: 'Yes — severe stress can cause telogen effluvium, where lots of hair enters the shedding phase at once. This usually happens 2-3 months after the stressful event and regrows within 6-9 months.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'hair-loss', title: 'Hair Loss Treatment Options' },
        { type: 'medication', slug: 'finasteride', title: 'Finasteride for Hair Loss' },
        { type: 'category', slug: 'mens-health', title: "Men's Health Services" },
      ],
    },
    symptom: {
      commonName: 'hair thinning',
      medicalTerm: 'alopecia',
      severity: 'mild',
      bodySystem: 'skin',
    },
    causes: {
      common: [
        'Androgenetic alopecia (male/female pattern baldness)',
        'Aging — natural part of getting older',
        'Genetics — family history of hair loss',
        'Hormonal changes (menopause, PCOS)',
      ],
      lessCommon: [
        'Stress-related hair loss (telogen effluvium)',
        'Iron deficiency or low ferritin',
        'Thyroid problems (hypo or hyperthyroidism)',
        'Nutritional deficiencies (protein, biotin, zinc)',
        'Medications (some antidepressants, blood thinners)',
        'Autoimmune conditions (alopecia areata)',
      ],
      emergency: [
        'Sudden patchy hair loss (alopecia areata) — see specialist',
        'Hair loss with scalp inflammation or scarring',
        'Rapid total hair loss',
      ],
    },
    selfCare: [
      'Gentle hair care — avoid tight hairstyles and excessive heat',
      'Balanced diet with adequate protein and iron',
      'Manage stress through exercise, sleep, relaxation',
      'Avoid smoking — worsens hair loss',
      'Consider supplements (biotin, iron if deficient)',
      'Be patient — hair grows slowly (~1cm per month)',
    ],
    whenToSeekHelp: {
      seeGPIf: [
        'Sudden or patchy hair loss',
        'Hair loss with other symptoms (fatigue, weight changes)',
        'Scalp problems (itching, redness, scaling)',
        'You\'re a woman with rapid hair loss or facial hair growth',
        'Hair loss affecting your mental health',
      ],
      emergency: [
        'Rapid extensive hair loss',
        'Hair loss with severe scalp pain or discharge',
        'Hair loss with signs of infection',
      ],
    },
    onlineTreatment: {
      canHelpWith: [
        'Male pattern hair loss (androgenetic alopecia)',
        'Want to try finasteride or minoxidil',
        'Stable health, no major medical issues',
        'Looking for convenient prescription access',
      ],
      whatWeOffer: [
        'Assessment of hair loss pattern',
        'Prescription for finasteride (men) if appropriate',
        'Advice on minoxidil use (over-the-counter)',
        'Realistic expectations about results and timeline',
        'Follow-up available to track progress',
      ],
      ctaText: 'Get Hair Loss Treatment',
      ctaUrl: '/mens-health?condition=hairloss',
    },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getSymptomPageBySlug(slug: string): SymptomPage | undefined {
  return symptomPages.find(p => p.slug === slug)
}

export function getAllSymptomSlugs(): string[] {
  return symptomPages.map(p => p.slug)
}

export function getSymptomsByBodySystem(system: string): SymptomPage[] {
  return symptomPages.filter(p => p.symptom.bodySystem === system)
}

export function getSymptomsBySeverity(severity: 'mild' | 'moderate' | 'urgent' | 'emergency'): SymptomPage[] {
  return symptomPages.filter(p => p.symptom.severity === severity)
}
