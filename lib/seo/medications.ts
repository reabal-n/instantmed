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

  {
    slug: 'tadalafil',
    type: 'medication',
    title: 'Tadalafil Online Australia | Cialis Alternative | InstantMed',
    description: 'Get tadalafil (generic Cialis) prescribed online. Longer-lasting ED treatment. Australian doctors assess suitability. From $34.95.',
    h1: 'Tadalafil (Cialis) — Longer-Lasting ED Treatment',
    content: {
      intro: 'Tadalafil is the generic version of Cialis, used to treat erectile dysfunction. Unlike other ED medications, tadalafil can work for up to 36 hours, giving you more spontaneity and flexibility.',
      uniqueBlocks: [
        {
          id: 'how-different',
          type: 'text',
          content: 'The main difference between tadalafil and sildenafil (Viagra) is duration. Tadalafil works for up to 36 hours, while sildenafil lasts about 4-5 hours. This means you don\'t need to time intimacy as precisely. Many men prefer tadalafil for weekend use or for more natural spontaneity.',
        },
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Like sildenafil, tadalafil is a PDE5 inhibitor that increases blood flow to the penis when sexually aroused. It typically starts working within 30-60 minutes and reaches peak effectiveness around 2 hours. The effects can last up to 36 hours, but this doesn\'t mean a 36-hour erection — you still need sexual stimulation.',
        },
        {
          id: 'dosing-options',
          type: 'list',
          content: [
            '10mg or 20mg: Standard "as-needed" dose, taken before sexual activity',
            '2.5mg or 5mg: Daily low-dose option for men who are sexually active regularly',
            'Daily dosing provides continuous readiness without planning',
            'As-needed dosing is more economical if you\'re less frequently active',
          ],
        },
        {
          id: 'important-safety',
          type: 'callout',
          content: 'Never take tadalafil with nitrate medications (GTN, isosorbide) or riociguat. The combination can cause dangerous blood pressure drops. Always tell your doctor about all medications you take.',
        },
      ],
    },
    metadata: {
      keywords: ['tadalafil online', 'cialis australia', 'tadalafil prescription', 'cialis generic online', 'long-lasting ED treatment'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'What\'s the difference between tadalafil and Viagra?',
          answer: 'The main difference is duration. Tadalafil lasts up to 36 hours, while Viagra (sildenafil) lasts 4-5 hours. Tadalafil also offers a daily low-dose option for continuous readiness.',
        },
        {
          question: 'Should I take 10mg or 20mg?',
          answer: 'Most men start with 10mg taken as needed. If this doesn\'t work well enough, your doctor may increase to 20mg. Some men prefer a daily 5mg dose instead.',
        },
        {
          question: 'Can I take tadalafil with alcohol?',
          answer: 'Small amounts of alcohol (1-2 drinks) are usually fine. Heavy drinking can make it harder to get an erection and may increase side effects like dizziness.',
        },
        {
          question: 'Is generic tadalafil as good as Cialis?',
          answer: 'Yes — generic tadalafil contains the same active ingredient at the same strength. It works identically to branded Cialis but costs much less.',
        },
      ],
    },
    links: {
      related: [
        { type: 'medication', slug: 'sildenafil', title: 'Sildenafil (Viagra)', description: 'Shorter-acting alternative' },
        { type: 'condition', slug: 'erectile-dysfunction', title: 'Erectile Dysfunction' },
        { type: 'category', slug: 'mens-health', title: "Men's Health Services" },
      ],
    },
    medication: {
      genericName: 'tadalafil',
      brandNames: ['Cialis'],
      category: 'sexual-health',
      schedule: 'S4',
      dosageForms: ['Tablet'],
      commonDosages: ['2.5mg daily', '5mg daily', '10mg as needed', '20mg as needed'],
    },
    clinicalInfo: {
      uses: ['Erectile dysfunction (ED)', 'Benign prostatic hyperplasia (BPH)'],
      howItWorks: 'PDE5 inhibitor — increases blood flow to penis during sexual arousal. Long half-life provides up to 36-hour window.',
      eligibility: [
        'Men aged 18+ with erectile dysfunction',
        'Stable cardiovascular health',
        'Blood pressure controlled',
        'No recent heart attack or stroke',
        'Not taking nitrates or riociguat',
      ],
      contraindications: [
        'Nitrate medications (GTN, isosorbide)',
        'Riociguat',
        'Severe heart disease',
        'Recent cardiovascular events (<3 months)',
        'Uncontrolled blood pressure',
        'Severe liver disease',
      ],
      commonSideEffects: [
        'Headache',
        'Indigestion',
        'Back pain',
        'Muscle aches',
        'Flushing',
        'Nasal congestion',
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
        'Riociguat — dangerous interaction',
        'Alpha-blockers — may cause low blood pressure',
        'Other PDE5 inhibitors — do not combine',
        'Some antifungals and antibiotics — may increase levels',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'Confidential questionnaire about ED and health history',
        'Cardiovascular health questions',
        'Doctor reviews and recommends dosing',
        'E-script sent if approved',
        'Discreet pharmacy collection or delivery',
      ],
      turnaroundTime: '1 hour (priority) or 24 hours (standard)',
      pricing: '$34.95 consultation + prescription',
      requiresBloodTest: false,
      requiresFollowUp: false,
    },
  },

  // ============================================
  // UTI / WOMEN'S HEALTH
  // ============================================
  
  {
    slug: 'trimethoprim',
    type: 'medication',
    title: 'Trimethoprim Online Australia | UTI Antibiotic | InstantMed',
    description: 'Get trimethoprim prescribed online for urinary tract infections. Australian doctors assess symptoms. E-script within hours. From $29.95.',
    h1: 'Trimethoprim for UTI — Fast Online Prescription',
    content: {
      intro: 'Trimethoprim is a common first-line antibiotic for treating uncomplicated urinary tract infections (UTIs) in women. It\'s effective against the bacteria that typically cause UTIs and is usually well-tolerated.',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Trimethoprim works by stopping bacteria from making folic acid, which they need to multiply and survive. This allows your immune system to clear the infection. Most UTIs are caused by E. coli bacteria, which trimethoprim effectively targets.',
        },
        {
          id: 'when-its-used',
          type: 'text',
          content: 'Trimethoprim is typically used for straightforward UTIs in women with typical symptoms (burning when urinating, frequency, urgency). It\'s usually taken twice daily for 3 days. Most women feel relief within 24-48 hours, but it\'s crucial to complete the full course even if symptoms improve.',
        },
        {
          id: 'typical-course',
          type: 'list',
          content: [
            'Standard dose: 300mg twice daily for 3 days',
            'Start feeling better within 24-48 hours',
            'Complete the full 3-day course',
            'Drink plenty of water to help flush bacteria',
            'Avoid sexual activity until symptoms resolve',
          ],
        },
        {
          id: 'when-to-see-doctor',
          type: 'callout',
          content: 'See a doctor in person if you have: fever, blood in urine, severe back pain, vomiting, are pregnant, or have recurrent UTIs (3+ per year). These require further investigation.',
        },
      ],
    },
    metadata: {
      keywords: ['trimethoprim online', 'UTI antibiotic online', 'trimethoprim prescription', 'UTI treatment australia', 'bladder infection antibiotic'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How quickly does trimethoprim work for UTI?',
          answer: 'Most women start feeling relief within 24-48 hours of starting trimethoprim. However, you must complete the full 3-day course to fully clear the infection.',
        },
        {
          question: 'Can I drink alcohol while taking trimethoprim?',
          answer: 'It\'s best to avoid alcohol while taking antibiotics. Alcohol can reduce effectiveness and may increase side effects like nausea.',
        },
        {
          question: 'What if my UTI comes back?',
          answer: 'If you get recurrent UTIs (3+ per year), see a GP in person for investigation. You may need a urine culture, kidney ultrasound, or prevention strategies.',
        },
        {
          question: 'Are there any food interactions?',
          answer: 'No major food interactions, but take with food if it upsets your stomach. Avoid excessive folic acid supplements while on trimethoprim.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'uti', title: 'UTI Treatment & Information' },
        { type: 'intent', slug: 'uti-treatment-online', title: 'Get UTI Treatment Online' },
        { type: 'category', slug: 'womens-health', title: "Women's Health Services" },
      ],
    },
    medication: {
      genericName: 'trimethoprim',
      brandNames: ['Triprim', 'Alprim'],
      category: 'womens-health',
      schedule: 'S4',
      dosageForms: ['Tablet'],
      commonDosages: ['300mg twice daily for 3 days'],
    },
    clinicalInfo: {
      uses: [
        'Uncomplicated urinary tract infections (UTIs)',
        'Bladder infections (cystitis)',
        'Some respiratory infections',
      ],
      howItWorks: 'Inhibits bacterial folic acid synthesis, stopping bacterial growth and allowing immune system to clear infection.',
      eligibility: [
        'Women with typical UTI symptoms',
        'No kidney problems',
        'Not pregnant or breastfeeding',
        'No blood disorders',
        'No severe allergies to sulfonamides',
      ],
      contraindications: [
        'Pregnancy',
        'Breastfeeding',
        'Severe kidney disease',
        'Blood disorders (e.g., megaloblastic anemia)',
        'Known hypersensitivity to trimethoprim',
      ],
      commonSideEffects: [
        'Nausea or upset stomach',
        'Skin rash (mild)',
        'Headache',
        'Loss of appetite',
      ],
      seriousSideEffects: [
        'Severe skin reactions (rare)',
        'Blood disorders (very rare)',
        'Severe allergic reaction',
        'Liver problems (rare)',
      ],
      interactions: [
        'Warfarin — may increase bleeding risk',
        'Methotrexate — increased toxicity risk',
        'Phenytoin — may increase levels',
        'Digoxin — may increase levels',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'Describe your UTI symptoms',
        'Questions about pregnancy, allergies, kidney health',
        'Doctor assesses if trimethoprim is appropriate',
        'E-script sent if symptoms match uncomplicated UTI',
        'Pick up from any pharmacy',
      ],
      turnaroundTime: '1-3 hours (same day)',
      pricing: '$29.95 consultation + prescription',
      requiresBloodTest: false,
      requiresFollowUp: false,
    },
  },

  // ============================================
  // WOMEN'S HEALTH - EMERGENCY CONTRACEPTION
  // ============================================
  
  {
    slug: 'levonorgestrel',
    type: 'medication',
    title: 'Levonorgestrel Online Australia | Plan B | Emergency Contraception | InstantMed',
    description: 'Get levonorgestrel (Plan B, morning after pill) prescribed online fast. Prevent pregnancy after unprotected sex. E-script within 30 minutes. From $29.95.',
    h1: 'Levonorgestrel (Plan B) — Emergency Contraception',
    content: {
      intro: 'Levonorgestrel is the most commonly used emergency contraceptive pill in Australia (also known as Plan B or the "morning after pill"). It can prevent pregnancy if taken within 72 hours of unprotected sex or contraceptive failure.',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Levonorgestrel works primarily by delaying or preventing ovulation. If you haven\'t ovulated yet, it stops the egg being released. It may also make it harder for sperm to reach an egg or for a fertilized egg to implant. It is NOT an abortion pill — it won\'t work if you\'re already pregnant. The sooner you take it after unprotected sex, the more effective it is.',
        },
        {
          id: 'effectiveness',
          type: 'text',
          content: 'When taken within 24 hours, levonorgestrel is about 95% effective at preventing pregnancy. Between 24-48 hours, effectiveness drops to 85%. Between 48-72 hours, it\'s about 58% effective. While it can be used up to 72 hours (3 days), don\'t wait — earlier is better. If you\'re over 72 hours, ask about ulipristal (EllaOne) which works up to 120 hours (5 days).',
        },
        {
          id: 'what-to-expect',
          type: 'list',
          content: [
            'Take one 1.5mg tablet as soon as possible',
            'Can be taken with or without food',
            'May cause temporary nausea (take with food if concerned)',
            'Your next period may be earlier, later, or heavier than usual',
            'If you vomit within 2 hours of taking it, you need another dose',
            'Take a pregnancy test if your period is more than 7 days late',
          ],
        },
        {
          id: 'important-info',
          type: 'callout',
          content: 'Levonorgestrel is for emergency use only — it\'s not suitable as regular contraception. If you have unprotected sex repeatedly, speak to a doctor about ongoing contraceptive options like the pill, IUD, or implant. Emergency contraception is less effective if you weigh over 70kg — ulipristal may be better.',
        },
      ],
    },
    metadata: {
      keywords: ['levonorgestrel online', 'plan b australia', 'morning after pill online', 'emergency contraception online', 'levonorgestrel prescription'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How quickly can I get emergency contraception online?',
          answer: 'We prioritize emergency contraception requests. E-scripts are typically sent within 30-60 minutes. You can then pick up from most pharmacies immediately (also available over-the-counter at pharmacies without prescription).',
        },
        {
          question: 'Can I take Plan B multiple times?',
          answer: 'Yes, you can take levonorgestrel more than once if needed, even in the same cycle. However, it\'s not designed for regular use and is less effective than ongoing contraception. If you need emergency contraception often, consider regular birth control.',
        },
        {
          question: 'Will emergency contraception affect my fertility?',
          answer: 'No — levonorgestrel has no long-term effects on your fertility. You can get pregnant again immediately after taking it, so use regular contraception if you have sex again.',
        },
        {
          question: 'What are the side effects?',
          answer: 'Common: nausea, fatigue, headache, dizziness, breast tenderness, irregular bleeding. Most side effects are mild and short-lived. Your next period may be different than usual (earlier, later, or heavier).',
        },
        {
          question: 'Is it too late after 3 days?',
          answer: 'Levonorgestrel works best within 72 hours. After that, ask about ulipristal (EllaOne) which is more effective and works up to 120 hours (5 days) after unprotected sex.',
        },
      ],
    },
    links: {
      related: [
        { type: 'intent', slug: 'emergency-contraception-online', title: 'Get Emergency Contraception Fast' },
        { type: 'condition', slug: 'contraception', title: 'Regular Contraception Options' },
        { type: 'category', slug: 'womens-health', title: "Women's Health Services" },
      ],
    },
    medication: {
      genericName: 'levonorgestrel',
      brandNames: ['Postinor', 'Levonelle', 'Plan B'],
      category: 'womens-health',
      schedule: 'S3',
      dosageForms: ['Tablet'],
      commonDosages: ['1.5mg single dose'],
    },
    clinicalInfo: {
      uses: [
        'Emergency contraception after unprotected sex',
        'Emergency contraception after contraceptive failure (e.g., condom broke)',
      ],
      howItWorks: 'Delays or prevents ovulation. May also prevent fertilization or implantation. Does NOT cause abortion.',
      eligibility: [
        'Women and people who can become pregnant',
        'Had unprotected sex within 72 hours',
        'Not already pregnant',
        'Age 18+ (available OTC at pharmacies without age restriction)',
      ],
      contraindications: [
        'Known pregnancy (it won\'t work and won\'t harm pregnancy)',
        'Allergy to levonorgestrel',
      ],
      commonSideEffects: [
        'Nausea (10-20% of users)',
        'Fatigue',
        'Headache',
        'Dizziness',
        'Breast tenderness',
        'Irregular bleeding or spotting',
        'Changes to next period timing',
      ],
      seriousSideEffects: [
        'Severe abdominal pain (possible ectopic pregnancy)',
        'Severe allergic reaction (very rare)',
      ],
      interactions: [
        'Enzyme-inducing medications (e.g., some epilepsy meds) may reduce effectiveness',
        'May be less effective if BMI >26 or weight >70kg',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'Quick questionnaire about timing of unprotected sex',
        'Pregnancy possibility check',
        'Weight and medication questions',
        'E-script sent within 30-60 minutes if appropriate',
        'Available OTC at pharmacies (no prescription needed in Australia)',
      ],
      turnaroundTime: '30-60 minutes (priority)',
      pricing: '$29.95 consultation + prescription (also available OTC ~$20-35)',
      requiresBloodTest: false,
      requiresFollowUp: false,
    },
  },

  // ============================================
  // HAIR LOSS
  // ============================================
  
  {
    slug: 'minoxidil',
    type: 'medication',
    title: 'Minoxidil Online Australia | Hair Loss Treatment | InstantMed',
    description: 'Get minoxidil for hair loss. Works for men and women. Topical treatment stimulates hair growth. Available over-the-counter. From $29.95 for guidance.',
    h1: 'Minoxidil for Hair Loss — Men & Women',
    content: {
      intro: 'Minoxidil is a topical treatment (foam or solution) that can slow hair loss and stimulate regrowth in both men and women with pattern hair loss. It\'s one of only two treatments approved for hair loss in Australia (the other being finasteride for men only).',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Minoxidil widens blood vessels in the scalp, improving blood flow to hair follicles. This extended growth phase means hairs grow longer before falling out, and miniaturized follicles can become thicker. The exact mechanism isn\'t fully understood, but it\'s proven to work. It must be applied directly to the scalp twice daily for best results.',
        },
        {
          id: 'men-vs-women',
          type: 'text',
          content: 'Men typically use the 5% strength, while women usually start with 2% (though 5% can be more effective, it may cause more side effects like unwanted facial hair). Both genders should apply it to dry scalp twice daily. Results take time — most people see less shedding within 2-3 months, with visible regrowth appearing after 4-6 months of consistent use.',
        },
        {
          id: 'realistic-expectations',
          type: 'list',
          content: [
            'First 2-4 weeks: Possible increased shedding (temporary, normal)',
            'Months 2-3: Reduced hair loss, existing hair may look thicker',
            'Months 4-6: Visible new hair growth in most users',
            'Peak effect: 12-18 months of continuous use',
            'Maintenance: Must continue indefinitely — benefits reverse if stopped',
          ],
        },
        {
          id: 'important-info',
          type: 'callout',
          content: 'Minoxidil is available over-the-counter in Australia (no prescription needed). It must be used consistently — twice daily, every day. If you stop using it, you\'ll lose any regrown hair within 6-12 months. It works best when started early, before significant hair loss has occurred.',
        },
      ],
    },
    metadata: {
      keywords: ['minoxidil online', 'minoxidil australia', 'rogaine', 'hair loss treatment', 'minoxidil for women', 'minoxidil men'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Does minoxidil really work for hair loss?',
          answer: 'Yes — clinical studies show minoxidil works for about 60% of users. It\'s more effective at slowing hair loss than regrowing hair, and works best when started early. Results vary, but most users see some benefit.',
        },
        {
          question: 'Can women use minoxidil?',
          answer: 'Yes — minoxidil is safe and effective for women with pattern hair loss. Women usually start with 2% strength. Unlike finasteride (men only), minoxidil is the main treatment option for female hair loss.',
        },
        {
          question: 'What happens if I stop using minoxidil?',
          answer: 'If you stop, you\'ll gradually lose any hair that was maintained or regrown by minoxidil, typically within 6-12 months. You\'ll return to the hair loss pattern you would have had without treatment.',
        },
        {
          question: 'Do I need a prescription for minoxidil in Australia?',
          answer: 'No — minoxidil is available over-the-counter at pharmacies and online. However, a consultation can help determine if it\'s right for you and how to use it effectively.',
        },
        {
          question: 'Can I use minoxidil with finasteride?',
          answer: 'Yes — many men use both together. Finasteride works internally (blocks DHT), while minoxidil works externally (improves blood flow). They have different mechanisms and can complement each other.',
        },
      ],
    },
    links: {
      related: [
        { type: 'medication', slug: 'finasteride', title: 'Finasteride for Hair Loss (Men)', description: 'Oral treatment, blocks DHT' },
        { type: 'condition', slug: 'hair-loss', title: 'Hair Loss Treatment Options' },
        { type: 'symptom', slug: 'hair-thinning', title: 'Hair Thinning Information' },
      ],
    },
    medication: {
      genericName: 'minoxidil',
      brandNames: ['Rogaine', 'Regaine'],
      category: 'general',
      schedule: 'OTC',
      dosageForms: ['Topical solution', 'Topical foam'],
      commonDosages: ['2% twice daily (women)', '5% twice daily (men or women)'],
    },
    clinicalInfo: {
      uses: [
        'Male pattern hair loss (androgenetic alopecia)',
        'Female pattern hair loss',
      ],
      howItWorks: 'Widens blood vessels in scalp, improves blood flow to follicles, extends hair growth phase.',
      eligibility: [
        'Adults with pattern hair loss',
        'Healthy scalp (no inflammation or infection)',
        'Willing to commit to twice-daily application',
        'Realistic expectations about results and timeline',
      ],
      contraindications: [
        'Scalp infection or inflammation',
        'Other causes of hair loss (alopecia areata, scarring alopecia)',
        'Pregnancy or breastfeeding (not studied)',
        'Children under 18',
      ],
      commonSideEffects: [
        'Scalp irritation or itching (solution more than foam)',
        'Increased facial or body hair (especially in women using 5%)',
        'Temporary increased shedding (first 2-4 weeks)',
        'Dryness or flaking',
      ],
      seriousSideEffects: [
        'Severe scalp irritation or allergic reaction',
        'Unwanted hair growth on face/body',
        'Rapid heartbeat (if absorbed systemically)',
        'Chest pain (very rare)',
      ],
      interactions: [
        'No significant drug interactions',
        'Absorption may increase with damaged or inflamed scalp',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'Assessment of hair loss pattern',
        'Discussion of 2% vs 5% strength',
        'Application technique guidance',
        'Timeline and expectations explained',
        'Follow-up photos recommended at 6 and 12 months',
      ],
      turnaroundTime: 'OTC — no prescription needed. Consultation available for guidance.',
      pricing: '$29.95 for consultation (product purchased separately OTC)',
      requiresBloodTest: false,
      requiresFollowUp: true,
    },
  },

  {
    slug: 'nitrofurantoin',
    type: 'medication',
    title: 'Nitrofurantoin Online Australia | UTI Antibiotic | InstantMed',
    description: 'Get nitrofurantoin prescribed online for urinary tract infections. Australian doctors assess symptoms. Alternative to trimethoprim. From $29.95.',
    h1: 'Nitrofurantoin for UTI — Antibiotic Alternative',
    content: {
      intro: 'Nitrofurantoin is another effective antibiotic for treating uncomplicated urinary tract infections (UTIs). It\'s often used as an alternative to trimethoprim, especially if you have trimethoprim-resistant bacteria or allergies.',
      uniqueBlocks: [
        {
          id: 'how-different',
          type: 'text',
          content: 'Unlike trimethoprim which works throughout your body, nitrofurantoin concentrates specifically in the urine, making it very effective for bladder infections but not suitable for kidney infections. This targeted action also means it has fewer effects on your gut bacteria compared to other antibiotics, reducing the risk of thrush or diarrhea.',
        },
        {
          id: 'how-to-use',
          type: 'text',
          content: 'Nitrofurantoin is usually taken as 100mg twice daily for 3 days for straightforward UTIs, or 5-7 days for more persistent infections. Always take it with food to improve absorption and reduce nausea. Some people notice their urine turns a dark yellow or brown color — this is harmless and normal.',
        },
        {
          id: 'when-its-used',
          type: 'list',
          content: [
            'First-line treatment if trimethoprim-resistant bacteria suspected',
            'Alternative if allergic to or can\'t tolerate trimethoprim',
            'Recurrent UTIs (can be used for prevention)',
            'Pregnancy (safer than some other antibiotics)',
            'NOT for kidney infections (doesn\'t reach high enough levels)',
          ],
        },
        {
          id: 'important-info',
          type: 'callout',
          content: 'Take nitrofurantoin with food or milk to reduce nausea. Don\'t worry if your urine turns dark yellow or brown — this is normal and harmless. Contact your doctor if you develop a cough or breathing difficulties (rare lung reaction).',
        },
      ],
    },
    metadata: {
      keywords: ['nitrofurantoin online', 'UTI antibiotic online', 'nitrofurantoin prescription', 'UTI treatment australia', 'macrobid australia'],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Is nitrofurantoin better than trimethoprim for UTI?',
          answer: 'They\'re both effective. Nitrofurantoin may be preferred if you have trimethoprim-resistant bacteria, allergies, or recurrent UTIs. Your doctor can advise which is best for your situation.',
        },
        {
          question: 'Why did my urine turn brown?',
          answer: 'This is a harmless side effect of nitrofurantoin. Your urine may turn dark yellow, brown, or rust-colored. It will return to normal once you finish the medication.',
        },
        {
          question: 'Can I take nitrofurantoin during pregnancy?',
          answer: 'Nitrofurantoin is generally safe in pregnancy except near term (last few weeks). It\'s often preferred over other antibiotics for pregnant women with UTIs.',
        },
        {
          question: 'What if I have kidney problems?',
          answer: 'Nitrofurantoin is not suitable if you have moderate to severe kidney disease (eGFR <60). It concentrates in urine and won\'t work properly if your kidneys aren\'t functioning well.',
        },
      ],
    },
    links: {
      related: [
        { type: 'medication', slug: 'trimethoprim', title: 'Trimethoprim for UTI', description: 'Alternative first-line treatment' },
        { type: 'condition', slug: 'uti', title: 'UTI Treatment Information' },
        { type: 'symptom', slug: 'burning-when-urinating', title: 'UTI Symptoms' },
      ],
    },
    medication: {
      genericName: 'nitrofurantoin',
      brandNames: ['Macrobid', 'Macrodantin'],
      category: 'general',
      schedule: 'S4',
      dosageForms: ['Capsule', 'Tablet'],
      commonDosages: ['100mg twice daily for 3-7 days'],
    },
    clinicalInfo: {
      uses: [
        'Uncomplicated urinary tract infections (UTIs)',
        'Bladder infections (cystitis)',
        'UTI prevention (lower dose)',
      ],
      howItWorks: 'Damages bacterial DNA and other processes. Concentrates in urine, providing high local concentration in the bladder.',
      eligibility: [
        'Adults with UTI symptoms',
        'Normal kidney function (eGFR >60)',
        'Not allergic to nitrofurantoin',
        'No lung disease',
      ],
      contraindications: [
        'Significant kidney impairment (eGFR <60)',
        'End of pregnancy (after 38 weeks)',
        'G6PD deficiency',
        'Infants under 1 month',
        'Known hypersensitivity',
      ],
      commonSideEffects: [
        'Nausea or upset stomach (take with food)',
        'Headache',
        'Dark yellow or brown urine (harmless)',
        'Loss of appetite',
      ],
      seriousSideEffects: [
        'Lung problems (cough, shortness of breath) — rare',
        'Liver problems (jaundice) — rare',
        'Nerve problems with long-term use — rare',
        'Severe allergic reaction',
      ],
      interactions: [
        'Antacids containing magnesium — may reduce absorption',
        'Probenecid — increases levels',
        'Some quinolone antibiotics — avoid combination',
      ],
    },
    consultInfo: {
      whatToExpect: [
        'UTI symptom questionnaire',
        'Kidney function and allergy questions',
        'Doctor assesses suitability vs trimethoprim',
        'E-script sent if appropriate',
        'Instructions to take with food',
      ],
      turnaroundTime: '1-3 hours (same day)',
      pricing: '$29.95 consultation + prescription',
      requiresBloodTest: false,
      requiresFollowUp: false,
    },
  },
  
  // Continue with more medications...
  // TODO: Add OCPs, propranolol, etc.
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMedicationBySlug(slug: string): MedicationPage | undefined {
  return medications.find(m => m.slug === slug)
}

export function getAllMedicationSlugs(): string[] {
  return medications.map(m => m.slug)
}
