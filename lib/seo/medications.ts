/**
 * Medication Pages Data
 * High-intent programmatic SEO pages for common medications
 * 
 * Each medication page includes:
 * - What it is and what it treats
 * - Eligibility criteria
 * - Contraindications
 * - Common side effects
 * - What the online consult involves
 * - Turnaround time
 * - Pricing
 * - FAQs
 */

import type { SEOPage, FAQ } from './registry'

export interface MedicationPage extends Omit<SEOPage, 'type'> {
  type: 'medication'
  medication: {
    genericName: string
    brandNames: string[]
    category: 'mens-health' | 'womens-health' | 'sexual-health' | 'weight-loss' | 'general' | 'anxiety'
    schedule: 'S3' | 'S4' | 'OTC' // Australian schedule
    dosageForms: string[]
    commonDosages: string[]
  }
  clinicalInfo: {
    uses: string[]
    howItWorks: string
    eligibility: string[]
    contraindications: string[]
    commonSideEffects: string[]
    seriousSideEffects: string[]
    interactions: string[]
  }
  consultInfo: {
    whatToExpect: string[]
    turnaroundTime: string
    pricing: string
    requiresBloodTest: boolean
    requiresFollowUp: boolean
  }
}

export const medications: MedicationPage[] = [
  // ============================================
  // MEN'S HEALTH
  // ============================================
  {
    slug: 'finasteride',
    type: 'medication',
    title: 'Finasteride Online Australia | Hair Loss Treatment | InstantMed',
    description: 'Get finasteride prescribed online for male pattern hair loss. Australian doctors assess eligibility. Prescription sent to your phone. From $34.95.',
    h1: 'Finasteride for Hair Loss — Online Prescription',
    content: {
      intro: 'Finasteride (brand name Propecia) is a prescription medication that slows hair loss and can regrow hair in men with male pattern baldness. It works by blocking the hormone DHT, which causes hair follicles to shrink.',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Finasteride works by inhibiting the enzyme 5-alpha reductase, which converts testosterone to dihydrotestosterone (DHT). By lowering DHT levels, finasteride helps prevent further hair loss and allows miniaturized hair follicles to recover and produce thicker hair. Most men notice reduced shedding within 3 months, with visible regrowth typically appearing after 6-12 months of consistent use.',
        },
        {
          id: 'effectiveness',
          type: 'text',
          content: 'Clinical studies show finasteride stops further hair loss in about 90% of men and regrows hair in approximately 65% of users. Results are best when treatment starts early, before significant hair loss has occurred. The medication must be taken daily, and benefits are maintained only while continuing treatment.',
        },
        {
          id: 'what-to-expect',
          type: 'list',
          content: [
            'First 3 months: Possible increased shedding (temporary, normal response)',
            'Months 3-6: Reduced hair loss, thicker existing hair',
            'Months 6-12: Visible regrowth in many users',
            'After 1 year: Maximum benefit typically achieved',
            'Ongoing: Continued daily use maintains results',
          ],
        },
        {
          id: 'important-safety',
          type: 'callout',
          content: 'Finasteride is for men only. Women who are or may become pregnant must not handle crushed or broken tablets due to risk to male fetus. A small percentage of men experience sexual side effects, which typically resolve when stopping treatment.',
        },
      ],
    },
    metadata: {
      keywords: ['finasteride online', 'propecia australia', 'hair loss treatment men', 'finasteride prescription online', 'male pattern baldness treatment'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Does finasteride really work for hair loss?',
          answer: 'Yes — clinical trials show finasteride stops further loss in about 90% of men and regrows hair in 65%. Results are best when started early, before significant loss has occurred.',
        },
        {
          question: 'What about side effects?',
          answer: 'Most men experience no side effects. About 2-4% may experience sexual side effects (decreased libido, erectile difficulties). These typically resolve if treatment is stopped. Serious side effects are rare.',
        },
        {
          question: 'How long until I see results?',
          answer: 'Most men notice reduced shedding within 3 months. Visible regrowth typically appears after 6-12 months of daily use. Maximum benefit is usually seen after 2 years.',
        },
        {
          question: 'What happens if I stop taking it?',
          answer: 'If you stop finasteride, you will gradually lose any hair that was maintained or regrown by the medication, typically within 6-12 months. Hair loss will return to the pattern you would have had without treatment.',
        },
        {
          question: 'Can I get finasteride online in Australia?',
          answer: 'Yes — our Australian doctors can prescribe finasteride online after a medical assessment. We check your health history, explain how it works, discuss side effects, and issue an e-script if appropriate.',
        },
        {
          question: 'Is generic finasteride as good as Propecia?',
          answer: 'Yes — generic finasteride contains the same active ingredient at the same dose. It works identically to branded Propecia but costs significantly less.',
        },
      ],
    },
    links: {
      related: [
        { type: 'medication', slug: 'minoxidil', title: 'Minoxidil for Hair Loss', description: 'Topical treatment, works differently to finasteride' },
        { type: 'condition', slug: 'hair-loss', title: 'Male Pattern Hair Loss', description: 'Causes, stages, treatment options' },
        { type: 'category', slug: 'mens-health', title: "Men's Health Services", description: 'Other treatments we offer' },
      ],
    },
    medication: {
      genericName: 'finasteride',
      brandNames: ['Propecia'],
      category: 'mens-health',
      schedule: 'S4',
      dosageForms: ['Tablet'],
      commonDosages: ['1mg daily', '5mg daily (for prostate, not hair loss)'],
    },
    clinicalInfo: {
      uses: [
        'Male pattern hair loss (androgenetic alopecia)',
        'Benign prostatic hyperplasia (BPH) at higher dose',
      ],
      howItWorks: 'Inhibits 5-alpha reductase enzyme, reducing DHT levels by ~70%, which slows follicle miniaturization and allows recovery of affected follicles.',
      eligibility: [
        'Men aged 18-65 with male pattern hair loss',
        'No history of prostate cancer',
        'No severe liver disease',
        'Not taking dutasteride or other 5-alpha reductase inhibitors',
        'Understanding of potential side effects',
      ],
      contraindications: [
        'Women (especially pregnant or may become pregnant)',
        'Children',
        'Known hypersensitivity to finasteride',
        'Liver impairment',
      ],
      commonSideEffects: [
        'Decreased libido (1-2% of users)',
        'Erectile dysfunction (1-2% of users)',
        'Decreased ejaculate volume (1% of users)',
        'Breast tenderness or enlargement (rare)',
      ],
      seriousSideEffects: [
        'Allergic reaction (rash, swelling, difficulty breathing)',
        'Depression or mood changes',
        'Persistent sexual dysfunction (controversial, rare)',
        'Male breast cancer (extremely rare)',
      ],
      interactions: [
        'None significant for hair loss dose',
        'May affect PSA blood test results (inform doctor before testing)',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'Complete a medical questionnaire about your hair loss pattern and medical history',
        'Upload photos of your hair (top and crown)',
        'Our doctor reviews within 1 hour (priority) or 24 hours (standard)',
        'If approved, e-script sent to your phone via SMS',
        'Pick up from any pharmacy or use delivery',
        'Optional follow-up at 3 and 6 months to track progress',
      ],
      turnaroundTime: '30 minutes (priority) or 24 hours (standard)',
      pricing: '$34.95 consultation + prescription (if appropriate)',
      requiresBloodTest: false,
      requiresFollowUp: false,
    },
  },
  
  {
    slug: 'sildenafil',
    type: 'medication',
    title: 'Sildenafil Online Australia | Viagra Alternative | InstantMed',
    description: 'Get sildenafil (generic Viagra) prescribed online. Australian doctors assess suitability. Discreet service. From $34.95.',
    h1: 'Sildenafil (Viagra) — Online Prescription',
    content: {
      intro: 'Sildenafil is the generic version of Viagra, used to treat erectile dysfunction (ED). It helps men get and maintain an erection sufficient for sexual activity. It works by increasing blood flow to the penis when sexually aroused.',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Sildenafil is a PDE5 inhibitor. When you\'re sexually aroused, your body releases nitric oxide, which increases levels of cGMP — a chemical that relaxes smooth muscle and increases blood flow to the penis. Sildenafil blocks the enzyme (PDE5) that breaks down cGMP, allowing increased blood flow and making it easier to achieve an erection. It does NOT cause an erection on its own — sexual stimulation is still required.',
        },
        {
          id: 'timing-effectiveness',
          type: 'text',
          content: 'Sildenafil typically starts working within 30-60 minutes, with peak effect around 1 hour. Effects last about 4-5 hours. Taking it on an empty stomach works faster than after a heavy meal. The standard starting dose is 50mg, which can be adjusted to 25mg or 100mg based on effectiveness and side effects.',
        },
        {
          id: 'who-can-use',
          type: 'list',
          content: [
            'Men experiencing difficulty getting or maintaining erections',
            'No recent heart attack or stroke (within 6 months)',
            'No severe heart or liver disease',
            'Not taking nitrate medications (for chest pain)',
            'Blood pressure is stable and controlled',
          ],
        },
        {
          id: 'important-safety',
          type: 'callout',
          content: 'NEVER take sildenafil if you use nitrate medications (like GTN spray for angina) — the combination can cause a dangerous drop in blood pressure. Tell your doctor about all medications you take, especially alpha-blockers for prostate or blood pressure.',
        },
      ],
    },
    metadata: {
      keywords: ['sildenafil online', 'viagra australia', 'erectile dysfunction treatment', 'ED medication online', 'sildenafil prescription'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Is sildenafil the same as Viagra?',
          answer: 'Yes — sildenafil is the generic name for Viagra. It contains exactly the same active ingredient at the same doses, works identically, but costs significantly less than the branded version.',
        },
        {
          question: 'How well does sildenafil work?',
          answer: 'Clinical studies show sildenafil successfully treats ED in about 70-80% of men. Effectiveness may be lower in men with severe diabetes, after prostate surgery, or with certain medical conditions.',
        },
        {
          question: 'What are the side effects?',
          answer: 'Common: headache, flushing, indigestion, nasal congestion, temporary vision changes (blue tinge). Serious (rare): sudden vision or hearing loss, erection lasting >4 hours (priapism), chest pain. Most side effects are mild and temporary.',
        },
        {
          question: 'Can I take sildenafil with alcohol?',
          answer: 'Small amounts of alcohol (1-2 drinks) are usually fine. Heavy drinking can make it harder to get an erection and may increase side effects like dizziness or low blood pressure.',
        },
        {
          question: 'Is it safe to buy sildenafil online?',
          answer: 'Yes, when prescribed by a registered doctor after proper assessment. Avoid websites selling it without prescription — counterfeit ED medications are common and can be dangerous. Our service uses Australian-registered doctors and legitimate pharmacy dispensing.',
        },
      ],
    },
    links: {
      related: [
        { type: 'medication', slug: 'tadalafil', title: 'Tadalafil (Cialis)', description: 'Longer-lasting alternative to sildenafil' },
        { type: 'condition', slug: 'erectile-dysfunction', title: 'Erectile Dysfunction', description: 'Causes and treatment options' },
        { type: 'category', slug: 'mens-health', title: "Men's Health Services" },
      ],
    },
    medication: {
      genericName: 'sildenafil',
      brandNames: ['Viagra'],
      category: 'sexual-health',
      schedule: 'S4',
      dosageForms: ['Tablet'],
      commonDosages: ['25mg', '50mg', '100mg'],
    },
    clinicalInfo: {
      uses: ['Erectile dysfunction (ED)', 'Pulmonary hypertension (different dosing)'],
      howItWorks: 'PDE5 inhibitor — increases cGMP levels, relaxes smooth muscle, increases blood flow to penis during sexual arousal.',
      eligibility: [
        'Men aged 18+ with erectile dysfunction',
        'Stable cardiovascular health',
        'Blood pressure controlled',
        'No recent heart attack, stroke, or serious arrhythmia',
        'Not taking nitrates or riociguat',
      ],
      contraindications: [
        'Nitrate medications (GTN, isosorbide)',
        'Riociguat',
        'Severe heart disease',
        'Recent stroke or heart attack (<6 months)',
        'Hypersensitivity to sildenafil',
        'Certain inherited eye conditions',
      ],
      commonSideEffects: [
        'Headache',
        'Flushing',
        'Indigestion',
        'Nasal congestion',
        'Dizziness',
        'Visual disturbances (blue tinge, light sensitivity)',
      ],
      seriousSideEffects: [
        'Sudden vision loss (rare)',
        'Sudden hearing loss (rare)',
        'Priapism (erection >4 hours)',
        'Severe chest pain',
        'Severe allergic reaction',
      ],
      interactions: [
        'Nitrates — DANGEROUS interaction',
        'Alpha-blockers — may cause low blood pressure',
        'Other PDE5 inhibitors — do not combine',
        'Some HIV protease inhibitors — may increase sildenafil levels',
        'Grapefruit juice — may increase levels',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'Complete confidential questionnaire about ED symptoms and health history',
        'Questions about cardiovascular health and current medications',
        'Doctor reviews and assesses suitability',
        'If approved, e-script sent to your phone',
        'Discreet pharmacy collection or delivery',
      ],
      turnaroundTime: '1 hour (priority) or 24 hours (standard)',
      pricing: '$34.95 consultation + prescription',
      requiresBloodTest: false,
      requiresFollowUp: false,
    },
  },
  
  // Continue with more medications...
  // TODO: Add tadalafil, minoxidil, contraceptive pills, UTI antibiotics, etc.
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMedicationBySlug(slug: string): MedicationPage | undefined {
  return medications.find(m => m.slug === slug)
}

export function getMedicationsByCategory(category: string): MedicationPage[] {
  return medications.filter(m => m.medication.category === category)
}

export function getAllMedicationSlugs(): string[] {
  return medications.map(m => m.slug)
}
