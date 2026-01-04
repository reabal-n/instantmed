/**
 * Comparison Pages Data
 * SEO pages comparing similar medications or treatments
 * 
 * These pages target "[treatment A] vs [treatment B]" search queries
 * Must be medically accurate, neutral, and avoid misleading claims
 */

import type { SEOPage, FAQ } from './registry'

export interface ComparisonPage extends Omit<SEOPage, 'type'> {
  type: 'comparison'
  comparison: {
    itemA: {
      name: string
      slug: string
      type: 'medication' | 'treatment' | 'service'
    }
    itemB: {
      name: string
      slug: string
      type: 'medication' | 'treatment' | 'service'
    }
    category: 'medication' | 'treatment' | 'service'
    comparisonDimensions: string[] // e.g., ['effectiveness', 'duration', 'side effects', 'cost']
  }
  content: {
    intro: string
    uniqueBlocks: any[] // Required by SEOPage but not used in comparisons
    keyDifferences: {
      heading: string
      itemA: string
      itemB: string
    }[]
    similarities: string[]
    sections: {
      heading: string
      content: string
    }[]
  }
}

export const comparisonPages: ComparisonPage[] = [
  {
    slug: 'tadalafil-vs-sildenafil',
    title: 'Tadalafil vs Sildenafil: Which ED Medication is Right for You?',
    description: 'Comparing tadalafil (Cialis) and sildenafil (Viagra) for erectile dysfunction. Differences in duration, onset, side effects, and cost.',
    keywords: ['tadalafil vs sildenafil', 'Cialis vs Viagra', 'ED medication comparison', 'tadalafil or sildenafil'],
    type: 'comparison',
    comparison: {
      itemA: {
        name: 'Tadalafil (Cialis)',
        slug: 'tadalafil',
        type: 'medication',
      },
      itemB: {
        name: 'Sildenafil (Viagra)',
        slug: 'sildenafil',
        type: 'medication',
      },
      category: 'medication',
      comparisonDimensions: ['duration', 'onset time', 'dosing', 'side effects', 'cost', 'food interactions'],
    },
    content: {
      intro: 'Tadalafil (Cialis) and sildenafil (Viagra) are both highly effective medications for erectile dysfunction (ED). The main difference is duration: tadalafil lasts up to 36 hours while sildenafil lasts 4-5 hours. Your choice depends on lifestyle, frequency of sexual activity, and personal preference.',
      uniqueBlocks: [],
      keyDifferences: [
        {
          heading: 'Duration of Action',
          itemA: '**Tadalafil:** Lasts up to 36 hours, allowing for more spontaneous sexual activity without precise timing.',
          itemB: '**Sildenafil:** Lasts 4-5 hours, requiring more precise timing but shorter window of potential side effects.',
        },
        {
          heading: 'Onset Time',
          itemA: '**Tadalafil:** Takes effect within 30-60 minutes. Peak effect at 2 hours.',
          itemB: '**Sildenafil:** Takes effect within 30-60 minutes. Peak effect at 1 hour.',
        },
        {
          heading: 'Dosing Flexibility',
          itemA: '**Tadalafil:** Available for on-demand use (10mg/20mg) OR daily low-dose (2.5mg/5mg) for spontaneous activity.',
          itemB: '**Sildenafil:** Typically on-demand use only (25mg/50mg/100mg). Take 1 hour before sexual activity.',
        },
        {
          heading: 'Food Interactions',
          itemA: '**Tadalafil:** Can be taken with or without food. Not significantly affected by high-fat meals.',
          itemB: '**Sildenafil:** Absorption slowed by high-fat meals. Works best on empty stomach or light meal.',
        },
        {
          heading: 'Cost',
          itemA: '**Tadalafil:** Generally similar cost to sildenafil. Daily low-dose option may be more cost-effective for frequent use.',
          itemB: '**Sildenafil:** Generic available, generally affordable. Per-use cost similar to tadalafil.',
        },
      ],
      similarities: [
        'Both are PDE5 inhibitors (same mechanism of action)',
        'Both require sexual stimulation to work (not automatic erection)',
        'Similar effectiveness rates (70-85% success)',
        'Similar side effects (headache, flushing, nasal congestion)',
        'Both contraindicated with nitrate medications',
        'Both require prescription from doctor',
        'Neither increases libido or desire',
      ],
      sections: [
        {
          heading: 'Which is more effective?',
          content: 'Both tadalafil and sildenafil have similar effectiveness rates (70-85% of men). Studies show no significant difference in efficacy between the two. Choice usually comes down to personal preference regarding duration and lifestyle fit.',
        },
        {
          heading: 'Which has fewer side effects?',
          content: 'Side effects are similar for both: headache, flushing, nasal congestion, indigestion. Some men find tadalafil causes less visual disturbances (blue tinge) than sildenafil. Individual response varies.',
        },
        {
          heading: 'Which is better for weekends?',
          content: 'Tadalafil is nicknamed "the weekend pill" because one dose covers an entire weekend (36 hours). Ideal if you want flexibility without taking a pill each time.',
        },
        {
          heading: 'Which is better for frequent sexual activity?',
          content: 'If you have sexual activity more than twice a week, daily low-dose tadalafil (2.5mg or 5mg) may be more convenient and cost-effective than on-demand dosing of either medication.',
        },
        {
          heading: 'Can I switch between them?',
          content: 'Yes, you can switch between tadalafil and sildenafil if one is not working well or if you want to try the other. Wait 24 hours before switching. Do not take both on the same day.',
        },
        {
          heading: 'Can InstantMed prescribe both?',
          content: 'Yes, InstantMed doctors can prescribe either tadalafil or sildenafil after an online consultation. We will discuss your lifestyle, preferences, and medical history to recommend the best option.',
        },
      ],
    },
    faqs: [
      {
        question: 'Can I take tadalafil and sildenafil together?',
        answer: 'No. Never take two ED medications at the same time. This increases risk of serious side effects including dangerous blood pressure drops.',
      },
      {
        question: 'Which works faster?',
        answer: 'Both work in about 30-60 minutes. Sildenafil may have a slightly faster onset for some men, but the difference is minimal.',
      },
      {
        question: 'Does tadalafil work better because it lasts longer?',
        answer: 'No. Longer duration does not mean stronger erection. Both provide similar quality of erection. Tadalafil just gives you a longer window of opportunity.',
      },
      {
        question: 'Which should I try first?',
        answer: 'Most men start with sildenafil due to familiarity (Viagra brand recognition). However, if you prefer spontaneity and flexibility, tadalafil may be a better first choice. Discuss with your doctor.',
      },
    ],
  },

  {
    slug: 'finasteride-vs-minoxidil',
    title: 'Finasteride vs Minoxidil: Best Hair Loss Treatment Comparison',
    description: 'Comparing finasteride and minoxidil for hair loss treatment. Differences in how they work, effectiveness, side effects, and who can use them.',
    keywords: ['finasteride vs minoxidil', 'hair loss treatment comparison', 'Propecia vs Rogaine', 'finasteride or minoxidil'],
    type: 'comparison',
    comparison: {
      itemA: {
        name: 'Finasteride',
        slug: 'finasteride',
        type: 'medication',
      },
      itemB: {
        name: 'Minoxidil',
        slug: 'minoxidil',
        type: 'medication',
      },
      category: 'medication',
      comparisonDimensions: ['mechanism', 'effectiveness', 'side effects', 'who can use', 'administration', 'cost'],
    },
    content: {
      intro: 'Finasteride and minoxidil are the two most effective treatments for male pattern hair loss. Finasteride is an oral medication that blocks DHT (the hormone causing hair loss), while minoxidil is a topical solution that stimulates hair growth. Many men use both together for maximum results.',
      uniqueBlocks: [],
      keyDifferences: [
        {
          heading: 'How They Work',
          itemA: '**Finasteride:** Oral pill that blocks DHT (dihydrotestosterone), the hormone that shrinks hair follicles. Prevents further hair loss and promotes regrowth.',
          itemB: '**Minoxidil:** Topical liquid or foam applied to scalp. Stimulates blood flow and prolongs growth phase of hair follicles. Promotes regrowth.',
        },
        {
          heading: 'Who Can Use It',
          itemA: '**Finasteride:** Men only. Not safe for women of childbearing age due to birth defect risk. Prescription required.',
          itemB: '**Minoxidil:** Both men and women can use it (women use 2%, men use 5%). Available over the counter.',
        },
        {
          heading: 'Administration',
          itemA: '**Finasteride:** One pill daily. Simple and convenient.',
          itemB: '**Minoxidil:** Applied to scalp twice daily. More time-consuming. Can be greasy or cause scalp irritation.',
        },
        {
          heading: 'Effectiveness',
          itemA: '**Finasteride:** Stops hair loss in 90% of men. Regrows hair in 65% of men. Targets root cause (DHT).',
          itemB: '**Minoxidil:** Slows hair loss and promotes regrowth in 40-60% of men. Does not address root cause (DHT).',
        },
        {
          heading: 'Time to Results',
          itemA: '**Finasteride:** 6-12 months to see results. Must continue indefinitely.',
          itemB: '**Minoxidil:** 4-6 months to see results. Must continue indefinitely.',
        },
        {
          heading: 'Side Effects',
          itemA: '**Finasteride:** 1-2% risk of sexual side effects (decreased libido, ED). Usually resolve after stopping.',
          itemB: '**Minoxidil:** Scalp irritation, dryness, itching. Rarely, unwanted facial hair growth.',
        },
      ],
      similarities: [
        'Both require long-term use (hair loss returns if stopped)',
        'Both take months to show results (6-12 months)',
        'Both can be used together for enhanced results',
        'Neither works for everyone',
        'Both are more effective at preventing loss than regrowing hair',
      ],
      sections: [
        {
          heading: 'Which is more effective?',
          content: 'Finasteride is generally considered more effective because it targets the root cause of male pattern hair loss (DHT). Studies show finasteride stops hair loss in 90% of men and regrows hair in 65%. Minoxidil is effective in 40-60% of users.',
        },
        {
          heading: 'Can I use both together?',
          content: 'Yes, and this is often recommended. Using finasteride and minoxidil together provides dual-action treatment: finasteride blocks DHT (preventing loss) and minoxidil stimulates growth. Studies show better results with combination therapy.',
        },
        {
          heading: 'Which should I start with?',
          content: 'If you are a man with male pattern hair loss, starting with finasteride is usually recommended as it targets the cause. Add minoxidil if you want to maximize results. Women should use minoxidil only (not finasteride).',
        },
        {
          heading: 'What happens if I stop treatment?',
          content: 'With either treatment, hair loss resumes within 6-12 months of stopping. Any hair regrown will be lost. This is not a cure but ongoing management.',
        },
        {
          heading: 'Which has fewer side effects?',
          content: 'Minoxidil has fewer systemic side effects (mainly local scalp irritation). Finasteride has a small risk of sexual side effects. Most men tolerate both well.',
        },
        {
          heading: 'Can InstantMed prescribe both?',
          content: 'Yes, InstantMed doctors can prescribe finasteride after an online consultation. Minoxidil is available over the counter. We can recommend combination therapy if appropriate.',
        },
      ],
    },
    faqs: [
      {
        question: 'Which works faster?',
        answer: 'Minoxidil may show initial results slightly faster (4-6 months vs 6-12 months for finasteride), but both require patience. Neither provides quick results.',
      },
      {
        question: 'Is one safer than the other?',
        answer: 'Both are safe when used correctly. Minoxidil has minimal side effects (local irritation). Finasteride has a small risk of sexual side effects (1-2%) which usually resolve after stopping.',
      },
      {
        question: 'Can women use finasteride?',
        answer: 'No. Finasteride is not safe for women of childbearing age due to risk of birth defects. Post-menopausal women may occasionally use it off-label under specialist guidance.',
      },
      {
        question: 'Do I need both or just one?',
        answer: 'You can use just one, but combination therapy gives better results. If you choose one, finasteride is generally more effective for male pattern hair loss.',
      },
    ],
  },

  {
    slug: 'trimethoprim-vs-nitrofurantoin',
    title: 'Trimethoprim vs Nitrofurantoin: UTI Antibiotic Comparison',
    description: 'Comparing trimethoprim and nitrofurantoin for urinary tract infection treatment. Differences in effectiveness, side effects, and pregnancy safety.',
    keywords: ['trimethoprim vs nitrofurantoin', 'UTI antibiotic comparison', 'best antibiotic for UTI'],
    type: 'comparison',
    comparison: {
      itemA: {
        name: 'Trimethoprim',
        slug: 'trimethoprim',
        type: 'medication',
      },
      itemB: {
        name: 'Nitrofurantoin',
        slug: 'nitrofurantoin',
        type: 'medication',
      },
      category: 'medication',
      comparisonDimensions: ['effectiveness', 'pregnancy safety', 'side effects', 'resistance', 'duration'],
    },
    content: {
      intro: 'Trimethoprim and nitrofurantoin are both first-line antibiotics for uncomplicated urinary tract infections (UTIs) in Australia. The main difference is pregnancy safety: nitrofurantoin is safe in pregnancy while trimethoprim is not recommended in first trimester.',
      uniqueBlocks: [],
      keyDifferences: [
        {
          heading: 'Pregnancy Safety',
          itemA: '**Trimethoprim:** Avoid in first trimester (interferes with folate). Can be used in second/third trimester if necessary.',
          itemB: '**Nitrofurantoin:** Safe throughout pregnancy. Preferred choice for pregnant women with UTIs.',
        },
        {
          heading: 'Treatment Duration',
          itemA: '**Trimethoprim:** 3-day course for uncomplicated UTI.',
          itemB: '**Nitrofurantoin:** 5-7 day course for uncomplicated UTI.',
        },
        {
          heading: 'Dosing Frequency',
          itemA: '**Trimethoprim:** Once daily (300mg) or twice daily (150mg).',
          itemB: '**Nitrofurantoin:** Four times daily (50mg) or twice daily (100mg modified release).',
        },
        {
          heading: 'Kidney Function Requirements',
          itemA: '**Trimethoprim:** Can be used in mild-moderate kidney impairment with dose adjustment.',
          itemB: '**Nitrofurantoin:** Should not be used if kidney function is significantly impaired (CrCl <45). Not effective if kidneys not working well.',
        },
        {
          heading: 'Common Side Effects',
          itemA: '**Trimethoprim:** Nausea, rash (uncommon).',
          itemB: '**Nitrofurantoin:** Nausea, dark urine (harmless), rarely lung/liver problems with long-term use.',
        },
      ],
      similarities: [
        'Both are first-line treatments for uncomplicated UTI',
        'Both have low resistance rates in Australia',
        'Both are effective for E. coli (most common UTI bacteria)',
        'Both require prescription',
        'Both should be taken as full course even if feeling better',
      ],
      sections: [
        {
          heading: 'Which is more effective?',
          content: 'Both are equally effective for uncomplicated UTIs caused by E. coli (most common). Effectiveness rates are similar (85-95%). Choice depends on pregnancy status, kidney function, and individual tolerance.',
        },
        {
          heading: 'Which is better if I am pregnant?',
          content: 'Nitrofurantoin is the clear choice during pregnancy. It is safe throughout pregnancy. Trimethoprim should be avoided in the first trimester.',
        },
        {
          heading: 'Which has fewer side effects?',
          content: 'Both are generally well-tolerated. Nitrofurantoin more commonly causes nausea and dark urine (harmless). Trimethoprim has fewer side effects overall.',
        },
        {
          heading: 'Why is nitrofurantoin taken for longer?',
          content: 'Nitrofurantoin concentrates in urine but does not achieve high tissue levels, so a longer course (5-7 days) is needed. Trimethoprim achieves good tissue penetration, so 3 days is sufficient.',
        },
        {
          heading: 'Which is better for recurrent UTIs?',
          content: 'For prevention of recurrent UTIs, both can be used. Nitrofurantoin is often preferred for long-term prophylaxis due to low resistance rates.',
        },
        {
          heading: 'Can InstantMed prescribe both?',
          content: 'Yes, InstantMed doctors can prescribe either trimethoprim or nitrofurantoin for uncomplicated UTIs after assessing your symptoms, medical history, and pregnancy status.',
        },
      ],
    },
    faqs: [
      {
        question: 'Which works faster?',
        answer: 'Both start working within 24-48 hours. You should feel significant improvement within 2-3 days. Complete the full course even if feeling better.',
      },
      {
        question: 'Can I switch if one does not work?',
        answer: 'Yes. If symptoms do not improve within 48-72 hours, contact your doctor. You may need a different antibiotic or further investigation.',
      },
      {
        question: 'Why is my urine dark on nitrofurantoin?',
        answer: 'Nitrofurantoin commonly causes dark yellow or brown urine. This is harmless and resolves after finishing the medication.',
      },
      {
        question: 'Which should I avoid if I have kidney problems?',
        answer: 'Avoid nitrofurantoin if you have moderate-severe kidney impairment. Trimethoprim can be used with dose adjustment. Discuss with your doctor.',
      },
    ],
  },
]

export function getComparisonBySlug(slug: string): ComparisonPage | undefined {
  return comparisonPages.find(p => p.slug === slug)
}

export function getAllComparisonSlugs(): string[] {
  return comparisonPages.map(p => p.slug)
}

export function getRelatedComparisons(medicationSlug: string): ComparisonPage[] {
  return comparisonPages.filter(p => 
    p.comparison.itemA.slug === medicationSlug || 
    p.comparison.itemB.slug === medicationSlug
  )
}
