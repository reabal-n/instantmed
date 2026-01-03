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

  {
    slug: 'chest-pain',
    type: 'symptom',
    title: 'Chest Pain | When to Seek Emergency Care | InstantMed',
    description: 'Experiencing chest pain? Learn about causes (heart attack, anxiety, reflux), emergency warning signs, and when to call 000 vs see a GP.',
    h1: 'Chest Pain — What It Means & When to Get Help',
    content: {
      intro: 'Chest pain is one of the most concerning symptoms because it can indicate a heart attack or other serious conditions. However, many cases of chest pain are not life-threatening. Knowing the warning signs helps you decide when to seek emergency care versus when to see a GP.',
      uniqueBlocks: [
        {
          id: 'heart-attack-vs-other',
          type: 'text',
          content: 'Heart attack chest pain is typically described as heavy pressure, tightness, or squeezing in the center of your chest that lasts more than a few minutes. It may spread to your arm, jaw, or back. You might also feel sweaty, nauseous, short of breath, or lightheaded. Other causes include anxiety (sharp, stabbing pain that comes and goes), reflux (burning pain after eating), muscle strain (tender to touch), or lung problems.',
        },
        {
          id: 'red-flags',
          type: 'list',
          content: [
            'Pressure or squeezing in chest lasting >5 minutes',
            'Pain spreading to arm, jaw, neck, or back',
            'Sweating, nausea, or vomiting with chest pain',
            'Shortness of breath or difficulty breathing',
            'Feeling like you might pass out',
            'Chest pain with fast or irregular heartbeat',
          ],
        },
        {
          id: 'important',
          type: 'callout',
          content: 'If you think you might be having a heart attack, call 000 immediately. Do NOT drive yourself to hospital. Chew an aspirin (if not allergic) while waiting for ambulance. Time is critical — "time is heart muscle." Better to be checked and sent home than to delay and have permanent heart damage.',
        },
      ],
    },
    metadata: {
      keywords: [
        'chest pain',
        'chest pain causes',
        'heart attack symptoms',
        'chest pain emergency',
        'when to worry about chest pain',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How do I know if chest pain is serious?',
          answer: 'Serious chest pain is typically: heavy/pressure-like, lasts >5 minutes, comes with sweating/nausea/breathlessness, or spreads to arm/jaw. When in doubt, call 000 — it\'s better to be safe.',
        },
        {
          question: 'Can anxiety cause chest pain?',
          answer: 'Yes — anxiety and panic attacks commonly cause chest pain. It\'s usually sharp, stabbing, comes and goes quickly, and gets worse when you\'re stressed. However, if you\'re not sure, get it checked.',
        },
        {
          question: 'What about heartburn vs heart attack?',
          answer: 'Heartburn typically causes burning pain behind the breastbone, gets worse lying down or after eating, and responds to antacids. Heart attack pain is more pressure-like and doesn\'t improve with antacids. If unsure, seek emergency care.',
        },
        {
          question: 'When can I see a GP instead of going to emergency?',
          answer: 'See a GP for: mild pain that comes and goes, pain that\'s clearly muscular (tender to touch), pain only when breathing deeply (possible costochondritis), or recurring reflux symptoms. Always err on the side of caution.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'acid-reflux', title: 'Acid Reflux Treatment' },
        { type: 'condition', slug: 'anxiety', title: 'Anxiety Management' },
      ],
    },
    symptom: {
      commonName: 'chest pain',
      medicalTerm: 'chest pain',
      severity: 'emergency',
      bodySystem: 'general',
    },
    causes: {
      common: [
        'Anxiety or panic attack — sharp, stabbing pain',
        'Acid reflux (GERD) — burning pain after eating',
        'Muscle strain — tender to touch, worse with movement',
        'Costochondritis — inflammation of rib cartilage',
      ],
      lessCommon: [
        'Lung infection (pneumonia, pleurisy)',
        'Pulmonary embolism (blood clot in lung)',
        'Pericarditis (heart lining inflammation)',
        'Aortic dissection (tear in major blood vessel)',
      ],
      emergency: [
        'Heart attack (myocardial infarction)',
        'Unstable angina',
        'Aortic dissection',
        'Pulmonary embolism',
        'Tension pneumothorax',
      ],
    },
    selfCare: [
      'DO NOT self-treat if you think it might be cardiac',
      'For anxiety-related pain: Deep breathing, relaxation techniques',
      'For reflux: Antacids, avoid lying down after eating',
      'For muscle strain: Rest, ice, anti-inflammatories',
      'Keep aspirin on hand if you have heart disease risk factors',
    ],
    whenToSeekHelp: {
      seeGPIf: [
        'Recurring chest pain episodes',
        'Chest pain with reflux symptoms',
        'Chest wall tenderness (possible costochondritis)',
        'Persistent cough with chest discomfort',
        'History of anxiety with typical panic symptoms',
      ],
      emergency: [
        'Pressure, tightness, or squeezing in chest',
        'Pain lasting >5 minutes or getting worse',
        'Pain spreading to arm, jaw, neck, or back',
        'Sweating, nausea, or shortness of breath',
        'Feeling like you might faint',
        'Any chest pain if you have heart disease risk factors',
      ],
    },
    onlineTreatment: {
      canHelpWith: [
        'Follow-up for diagnosed reflux',
        'Anxiety management strategies',
        'Recurrent costochondritis',
        'General health checks for prevention',
      ],
      whatWeOffer: [
        'NOT suitable for acute chest pain assessment',
        'Follow-up after emergency department visit',
        'Anxiety treatment and management',
        'Reflux medication prescriptions',
        'Preventive cardiovascular health advice',
      ],
      ctaText: 'Get Follow-Up Care',
      ctaUrl: '/prescriptions',
    },
  },

  {
    slug: 'frequent-urination',
    type: 'symptom',
    title: 'Frequent Urination | Causes & When to Seek Help | InstantMed',
    description: 'Peeing frequently? Learn about causes (UTI, diabetes, prostate, anxiety), when to see a doctor, and how to get online treatment.',
    h1: 'Frequent Urination — Why It Happens & What To Do',
    content: {
      intro: 'Needing to urinate more often than usual (frequency) or feeling an urgent need to go even when you just went can be frustrating and disruptive. While often caused by simple issues like drinking too much fluid or a bladder infection, it can sometimes indicate underlying conditions that need treatment.',
      uniqueBlocks: [
        {
          id: 'common-patterns',
          type: 'text',
          content: 'Normal is about 6-8 times per day. Frequent urination means going more often than this, including waking at night (nocturia). The pattern matters: If you\'re also experiencing burning, pain, or urgency, it\'s likely a UTI. If you\'re drinking a lot and urinating large volumes, consider diabetes. Men over 50 with weak stream and difficulty starting may have prostate issues. Anxiety can also cause frequent urination without infection.',
        },
        {
          id: 'gender-differences',
          type: 'list',
          content: [
            'Women: UTIs are most common cause. Pregnancy increases frequency. Overactive bladder is common.',
            'Men: Prostate enlargement (BPH) is common over age 50. Prostatitis can cause frequency + pain.',
            'Anyone: Diabetes, excessive caffeine, anxiety, certain medications, or overactive bladder.',
          ],
        },
        {
          id: 'self-assessment',
          type: 'callout',
          content: 'Keep a bladder diary for 2-3 days: note how much you drink, how often you pee, and how much each time. Also note any pain, urgency, or leakage. This helps your doctor identify patterns and diagnose the cause.',
        },
      ],
    },
    metadata: {
      keywords: [
        'frequent urination',
        'peeing a lot',
        'frequent urination causes',
        'frequent urination women',
        'frequent urination men',
        'overactive bladder',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Is frequent urination a sign of diabetes?',
          answer: 'It can be. If you\'re peeing frequently AND drinking a lot, feeling thirsty all the time, losing weight, or feeling tired, get your blood sugar checked. Type 2 diabetes often starts with these symptoms.',
        },
        {
          question: 'How often is too often to urinate?',
          answer: 'More than 8 times during the day or waking 2+ times at night is considered frequent. However, "normal" varies — some people naturally go more than others.',
        },
        {
          question: 'Can anxiety cause frequent urination?',
          answer: 'Yes — anxiety activates your fight-or-flight response, which can increase urination. You may feel like you need to go even with an empty bladder. Treating the anxiety often helps.',
        },
        {
          question: 'When should I see a doctor about frequent urination?',
          answer: 'See a doctor if: it\'s sudden and persistent, you have pain/burning, there\'s blood in urine, you\'re very thirsty, or it\'s disrupting your life. Also if you\'re male and having difficulty starting or weak stream.',
        },
      ],
    },
    links: {
      related: [
        { type: 'symptom', slug: 'burning-when-urinating', title: 'Burning When Urinating' },
        { type: 'condition', slug: 'uti', title: 'UTI Treatment' },
      ],
    },
    symptom: {
      commonName: 'frequent urination',
      medicalTerm: 'urinary frequency',
      severity: 'moderate',
      bodySystem: 'urinary',
    },
    causes: {
      common: [
        'Urinary tract infection (UTI) — especially if pain/burning too',
        'Drinking too much fluid (especially coffee, tea, alcohol)',
        'Pregnancy — uterus presses on bladder',
        'Anxiety or stress',
        'Overactive bladder syndrome',
      ],
      lessCommon: [
        'Type 2 diabetes — high blood sugar',
        'Prostate enlargement (BPH) in men over 50',
        'Medications (diuretics, blood pressure meds)',
        'Interstitial cystitis (chronic bladder pain)',
        'Neurological conditions',
      ],
      emergency: [
        'Unable to urinate at all (acute retention)',
        'Fever + back pain + frequency (possible kidney infection)',
        'Blood in urine + severe pain',
      ],
    },
    selfCare: [
      'Keep a bladder diary for 2-3 days',
      'Reduce caffeine and alcohol intake',
      'Avoid drinking large amounts before bed',
      'Practice bladder training (gradually increase time between bathroom visits)',
      'Pelvic floor exercises (Kegels) can help',
      'Manage stress and anxiety',
    ],
    whenToSeekHelp: {
      seeGPIf: [
        'Frequency is new and persistent',
        'Waking 2+ times per night to urinate',
        'Excessive thirst and urination together',
        'Weak urine stream or difficulty starting (men)',
        'Leaking urine',
        'Pain or discomfort',
      ],
      emergency: [
        'Complete inability to urinate',
        'Severe pain with frequency',
        'Fever and back pain (possible kidney infection)',
        'Blood in urine with severe symptoms',
      ],
    },
    onlineTreatment: {
      canHelpWith: [
        'Straightforward UTI causing frequency',
        'Recurrent UTIs',
        'Need for diabetes screening',
        'Overactive bladder management',
      ],
      whatWeOffer: [
        'UTI assessment and antibiotics if appropriate',
        'Bladder diary review and advice',
        'Referral for further testing if needed',
        'Lifestyle modification guidance',
      ],
      ctaText: 'Get Assessed Online',
      ctaUrl: '/prescriptions?condition=uti',
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

// NEW SYMPTOM PAGES

symptomPages.push(
  {
    slug: 'persistent-cough',
    title: 'Persistent Cough | Causes, When to See Doctor & Online Treatment',
    description: 'Understanding persistent cough - common causes including post-viral, asthma, reflux. When to see a doctor and online treatment options.',
    keywords: ['persistent cough', 'chronic cough', 'cough won\'t go away', 'lingering cough'],
    type: 'symptom',
    symptom: {
      name: 'Persistent Cough',
      commonName: 'cough that won\'t go away',
      bodySystem: 'respiratory',
      severity: 'moderate',
      description: 'A cough lasting more than 3 weeks (post-viral) or 8 weeks (chronic)',
    },
    content: {
      intro: 'A persistent cough is one that lasts more than 3 weeks. While most coughs from colds and flu resolve within 2-3 weeks, a cough that lingers may indicate post-viral inflammation, asthma, reflux, or other conditions.',
      commonCauses: [
        'Post-viral cough (inflammation after cold/flu)',
        'Asthma or reactive airways',
        'Gastroesophageal reflux (GERD)',
        'Post-nasal drip',
        'Chronic bronchitis (smokers)',
        'Medications (ACE inhibitors for blood pressure)',
      ],
      lessCommonCauses: [
        'Whooping cough (pertussis)',
        'Lung infection or pneumonia',
        'Chronic sinus infection',
        'Allergies',
      ],
      emergencyCauses: [
        'Lung cancer (smokers, weight loss, blood in sputum)',
        'Tuberculosis (travel history, night sweats)',
        'Heart failure (shortness of breath, ankle swelling)',
        'Pulmonary embolism (sudden onset, chest pain)',
      ],
      sections: [
        {
          heading: 'When is a cough considered persistent?',
          content: 'A cough is considered persistent when it lasts more than 3 weeks after a cold or flu. A chronic cough is defined as lasting more than 8 weeks. Most viral coughs resolve within 2-3 weeks.',
        },
        {
          heading: 'What causes post-viral cough?',
          content: 'After a respiratory infection, airways can remain inflamed and sensitive for weeks, triggering coughing. This usually resolves on its own within 6-8 weeks.',
        },
        {
          heading: 'Self-care for persistent cough',
          content: 'Stay hydrated, use honey (adults), try cough lozenges, avoid irritants (smoke, perfume), elevate head when sleeping (if reflux-related), use a humidifier.',
        },
        {
          heading: 'When to see a GP',
          content: 'See a GP if: cough lasts >3 weeks, coughing up blood, shortness of breath, chest pain, unexplained weight loss, night sweats, or you are a smoker over 50.',
        },
        {
          heading: 'Can InstantMed help?',
          content: 'InstantMed doctors can assess persistent cough, prescribe treatments for post-viral cough or reflux-related cough, and refer for investigations if needed. Complex cases require in-person GP assessment.',
        },
      ],
    },
    faqs: [
      {
        question: 'How long should a cough last after a cold?',
        answer: 'Most coughs resolve within 2-3 weeks. A cough lasting 3-8 weeks is usually post-viral inflammation and not concerning. Coughs lasting >8 weeks need investigation.',
      },
      {
        question: 'Could my cough be asthma?',
        answer: 'Yes. Asthma can present as a persistent dry cough, especially at night or with exercise. If you have never been diagnosed with asthma, see a GP for spirometry (breathing test).',
      },
      {
        question: 'Can reflux cause a cough?',
        answer: 'Yes. Acid reflux can irritate the throat and trigger chronic cough, especially when lying down. This is called laryngopharyngeal reflux (LPR).',
      },
      {
        question: 'Should I get a chest X-ray?',
        answer: 'A chest X-ray is recommended if you are a smoker over 50, have blood in your sputum, unexplained weight loss, or symptoms lasting >8 weeks despite treatment.',
      },
    ],
  },
  {
    slug: 'night-sweats',
    title: 'Night Sweats | Causes, When to Worry & Treatment Options',
    description: 'Understanding night sweats - causes including menopause, infections, medications. When night sweats are serious and online GP consultation.',
    keywords: ['night sweats', 'sweating at night', 'menopause sweats', 'drenching sweats'],
    type: 'symptom',
    symptom: {
      name: 'Night Sweats',
      commonName: 'sweating heavily at night',
      bodySystem: 'general',
      severity: 'moderate',
      description: 'Excessive sweating during sleep that soaks sheets and clothing',
    },
    content: {
      intro: 'Night sweats are episodes of excessive sweating during sleep, often soaking sheets and pajamas. While often benign (menopause, medications), they can occasionally indicate serious conditions.',
      commonCauses: [
        'Menopause or perimenopause (women 45-55)',
        'Medications (antidepressants, hormone therapy)',
        'Room too hot or too many blankets',
        'Anxiety or stress',
        'Low blood sugar (diabetes medications)',
        'Alcohol or spicy foods before bed',
      ],
      lessCommonCauses: [
        'Infections (flu, COVID-19, mononucleosis)',
        'Hyperthyroidism (overactive thyroid)',
        'Sleep apnea',
        'Gastroesophageal reflux (GERD)',
      ],
      emergencyCauses: [
        'Tuberculosis (with cough, weight loss)',
        'Lymphoma (with swollen lymph nodes, weight loss)',
        'HIV/AIDS',
        'Carcinoid syndrome (rare hormone-secreting tumor)',
      ],
      sections: [
        {
          heading: 'When are night sweats normal?',
          content: 'Night sweats are common in menopause, with certain medications, or if your room is too warm. They are usually not concerning if you feel well otherwise.',
        },
        {
          heading: 'Menopause night sweats',
          content: 'Hot flashes and night sweats affect 75% of menopausal women. They can last for years. Treatment options include lifestyle changes, hormone replacement therapy (HRT), or non-hormonal medications.',
        },
        {
          heading: 'Self-care for night sweats',
          content: 'Keep bedroom cool (18°C), use breathable cotton sheets, wear light pajamas, avoid alcohol and spicy foods before bed, stay hydrated, manage stress.',
        },
        {
          heading: 'When to see a doctor',
          content: 'See a GP if you have: night sweats with unexplained weight loss, fever, swollen lymph nodes, persistent cough, or night sweats that started suddenly without clear cause.',
        },
        {
          heading: 'Can InstantMed help?',
          content: 'InstantMed doctors can assess night sweats, prescribe treatment for menopause symptoms, review medications, and order investigations if concerning features are present.',
        },
      ],
    },
    faqs: [
      {
        question: 'Are night sweats a sign of cancer?',
        answer: 'Rarely. While some cancers (lymphoma) can cause night sweats, most night sweats are due to benign causes like menopause or medications. See a GP if you have weight loss or other concerning symptoms.',
      },
      {
        question: 'Can anxiety cause night sweats?',
        answer: 'Yes. Anxiety and stress can trigger night sweats. If you have daytime anxiety symptoms, this may be the cause.',
      },
      {
        question: 'What medications cause night sweats?',
        answer: 'Common culprits: antidepressants (SSRIs), tamoxifen, steroids, diabetes medications (if blood sugar drops), and some blood pressure medications.',
      },
      {
        question: 'How are menopausal night sweats treated?',
        answer: 'Treatment options include hormone replacement therapy (HRT), non-hormonal medications (SSRIs, gabapentin), lifestyle changes, and cognitive behavioral therapy.',
      },
    ],
  },
  {
    slug: 'headache',
    title: 'Headache | Types, Causes, When to Seek Emergency Care',
    description: 'Understanding headaches - tension headaches, migraines, cluster headaches. Warning signs of serious causes and online doctor consultation.',
    keywords: ['headache', 'migraine', 'tension headache', 'severe headache'],
    type: 'symptom',
    symptom: {
      name: 'Headache',
      commonName: 'head pain',
      bodySystem: 'neurological',
      severity: 'moderate',
      description: 'Pain in the head, scalp, or neck',
    },
    content: {
      intro: 'Headaches are extremely common and usually benign. The three main types are tension headaches, migraines, and cluster headaches. However, certain headache characteristics require emergency evaluation.',
      commonCauses: [
        'Tension headache (stress, muscle tension)',
        'Migraine (throbbing, one-sided, with nausea)',
        'Dehydration',
        'Caffeine withdrawal',
        'Eye strain or poor posture',
        'Lack of sleep',
      ],
      lessCommonCauses: [
        'Sinus infection (with facial pain, nasal congestion)',
        'Medication overuse headache (frequent painkiller use)',
        'High blood pressure',
        'Temporal arteritis (over age 50)',
      ],
      emergencyCauses: [
        'Subarachnoid hemorrhage (worst headache of your life)',
        'Meningitis (with fever, stiff neck, rash)',
        'Stroke (sudden onset with weakness/confusion)',
        'Brain tumor (progressive, worse in morning)',
        'Carbon monoxide poisoning',
      ],
      sections: [
        {
          heading: 'Types of headaches',
          content: 'Tension headaches: band-like pressure around head. Migraines: throbbing, one-sided, with nausea/light sensitivity, lasting 4-72 hours. Cluster headaches: severe one-sided pain around eye, with tearing/nasal congestion.',
        },
        {
          heading: 'Red flag headache symptoms (call 000)',
          content: 'Sudden severe headache (worst ever), headache with fever and stiff neck, headache with confusion or loss of consciousness, headache after head injury, sudden headache with vision loss or double vision.',
        },
        {
          heading: 'Self-care for common headaches',
          content: 'Rest in dark quiet room, hydrate, over-the-counter painkillers (paracetamol, ibuprofen), cold or warm compress, caffeine (for some people), avoid triggers.',
        },
        {
          heading: 'When to see a GP',
          content: 'See a GP if: headaches are increasing in frequency or severity, new type of headache after age 50, headaches wake you from sleep, headache with vision changes, headaches not responding to over-the-counter medication.',
        },
        {
          heading: 'Can InstantMed help?',
          content: 'InstantMed doctors can assess tension headaches and migraines, prescribe preventive or acute treatment, and refer for investigation if red flags are present. Severe or emergency headaches need immediate in-person care.',
        },
      ],
    },
    faqs: [
      {
        question: 'When is a headache an emergency?',
        answer: 'Call 000 if: sudden severe headache (thunderclap), headache with fever and stiff neck, headache with confusion or seizure, sudden headache with vision loss, or worst headache of your life.',
      },
      {
        question: 'How do I know if it is a migraine?',
        answer: 'Migraines are typically throbbing, one-sided, last 4-72 hours, worsen with movement, and are accompanied by nausea, vomiting, or sensitivity to light/sound. Some people have visual aura before headache.',
      },
      {
        question: 'Can I take painkillers every day for headaches?',
        answer: 'No. Taking painkillers more than 10-15 days per month can cause medication overuse headache (rebound headache). See a GP for preventive treatment instead.',
      },
      {
        question: 'What triggers migraines?',
        answer: 'Common triggers: stress, lack of sleep, dehydration, skipping meals, alcohol (especially red wine), aged cheese, chocolate, weather changes, bright lights, strong smells, hormonal changes (menstruation).',
      },
    ],
  },
  {
    slug: 'skin-rash',
    title: 'Skin Rash | Causes, Types, Treatment & When to See Doctor',
    description: 'Understanding skin rashes - common causes including allergies, infections, eczema. When rashes are serious and online dermatology consultation.',
    keywords: ['skin rash', 'rash causes', 'itchy rash', 'body rash', 'allergic rash'],
    type: 'symptom',
    symptom: {
      name: 'Skin Rash',
      commonName: 'rash or skin irritation',
      bodySystem: 'dermatological',
      severity: 'mild',
      description: 'Changes in skin color, texture, or appearance',
    },
    content: {
      intro: 'Skin rashes are extremely common and have many causes including allergies, infections, inflammatory conditions, and medication reactions. Most rashes are benign but some require medical attention.',
      commonCauses: [
        'Contact dermatitis (allergic reaction to substance)',
        'Eczema (atopic dermatitis)',
        'Heat rash',
        'Insect bites',
        'Viral rash (roseola, viral exanthem)',
        'Fungal infection (tinea, candida)',
      ],
      lessCommonCauses: [
        'Psoriasis',
        'Shingles (herpes zoster)',
        'Urticaria (hives)',
        'Drug reaction',
        'Scabies',
      ],
      emergencyCauses: [
        'Meningococcal rash (non-blanching, with fever)',
        'Stevens-Johnson syndrome (drug reaction with blistering)',
        'Anaphylaxis (rash with swelling, breathing difficulty)',
        'Cellulitis (spreading, painful, with fever)',
      ],
      sections: [
        {
          heading: 'Types of rashes',
          content: 'Macular (flat red spots), papular (raised bumps), vesicular (fluid-filled blisters), pustular (pus-filled), scaling, petechial (tiny purple spots that don\'t blanch).',
        },
        {
          heading: 'Red flag rash symptoms (call 000)',
          content: 'Rash with difficulty breathing or swelling of lips/tongue, rash with high fever and confusion, purple or dark red spots that don\'t blanch when pressed (glass test), rapidly spreading painful rash.',
        },
        {
          heading: 'Self-care for mild rashes',
          content: 'Avoid scratching, moisturize with fragrance-free cream, cool compress, oatmeal bath, antihistamine for itching, avoid triggers/irritants, wear loose cotton clothing.',
        },
        {
          heading: 'When to see a doctor',
          content: 'See a GP if: rash is painful or rapidly spreading, rash with fever, blistering or oozing, rash lasting >2 weeks, rash not responding to over-the-counter treatment, concern about infection.',
        },
        {
          heading: 'Can InstantMed help?',
          content: 'InstantMed doctors can assess photos of rashes, diagnose common conditions (eczema, contact dermatitis, fungal infections), prescribe treatment, and refer to dermatologist if needed. Severe or concerning rashes need in-person assessment.',
        },
      ],
    },
    faqs: [
      {
        question: 'How do I know if a rash is serious?',
        answer: 'Serious signs: rash with difficulty breathing, rash with high fever, purple spots that don\'t blanch when pressed, rapidly spreading painful rash, blistering, or rash with joint pain.',
      },
      {
        question: 'What is the glass test for meningococcal rash?',
        answer: 'Press a clear glass firmly against the rash. If the spots do not fade or blanch, this may be a meningococcal rash (medical emergency). Call 000 immediately.',
      },
      {
        question: 'Can stress cause a rash?',
        answer: 'Yes. Stress can trigger or worsen eczema, psoriasis, hives, and other inflammatory skin conditions. Stress management can help.',
      },
      {
        question: 'How long does a viral rash last?',
        answer: 'Most viral rashes last 3-7 days and resolve on their own. Examples include roseola, hand-foot-mouth disease, and non-specific viral exanthems.',
      },
    ],
  },
)
