import { blogImages } from '../images'
import { Article, defaultAuthor } from '../types'

export const medicationGuideArticles: Article[] = [
  {
    slug: 'sildenafil-vs-tadalafil',
    title: 'Sildenafil vs Tadalafil: Comparing ED Medications in Australia',
    subtitle: 'Understanding the key differences between the two most common erectile dysfunction treatments.',
    excerpt: 'Sildenafil and tadalafil are the two most prescribed ED medications in Australia. Learn how they compare on duration, timing, side effects, PBS status, and which might suit you better.',
    category: 'medications',
    tags: ['prescription', 'medication'],
    publishedAt: '2026-04-13',
    updatedAt: '2026-04-13',
    readingTime: 8,
    viewCount: 0,
    author: defaultAuthor,
    heroImage: blogImages.sildenafilVsTadalafil,
    heroImageAlt: 'Prescription medication for erectile dysfunction comparison',
    content: [
      { type: 'paragraph', content: 'Erectile dysfunction (ED) affects roughly one in five Australian men over 40, and the number rises with age. Sildenafil and tadalafil are both phosphodiesterase type 5 (PDE5) inhibitors -- the first-line pharmacological treatment recommended by the Australian Therapeutic Guidelines (eTG). They work by the same mechanism (increasing blood flow to the penis during arousal) but differ in duration, timing, side-effect profile, and cost. This guide covers what matters when choosing between them.' },

      { type: 'heading', content: 'How PDE5 Inhibitors Work', level: 2 },
      { type: 'paragraph', content: 'During sexual arousal, nitric oxide is released in the penile tissue, triggering production of cyclic GMP (cGMP). cGMP relaxes smooth muscle and increases blood flow, producing an erection. PDE5 is the enzyme that breaks down cGMP. By inhibiting PDE5, sildenafil and tadalafil allow cGMP to accumulate and sustain the erection for longer. Neither drug causes an erection on its own -- arousal is still required.' },

      { type: 'heading', content: 'Quick Comparison Table', level: 2 },
      { type: 'table', content: '', headers: ['Feature', 'Sildenafil (on demand)', 'Tadalafil (on demand)', 'Tadalafil (daily 5mg)'], rows: [
        ['Onset time', '30-60 minutes', '30-60 minutes', 'Continuous (after 5 days)'],
        ['Duration of action', '4-6 hours', 'Up to 36 hours', 'Continuous'],
        ['Timing required?', 'Yes - take before sex', 'Flexible within 36 hours', 'No - fully spontaneous'],
        ['Affected by fatty meals?', 'Yes - can delay/reduce effect', 'Minimal effect', 'Minimal effect'],
        ['Common unique side effects', 'Visual tinge, nasal congestion', 'Back pain, muscle aches', 'Back pain, muscle aches'],
        ['PBS listed (for ED)?', 'No - private script', 'No - private script', 'No - private script'],
        ['Also treats BPH?', 'No', 'No', 'Yes - TGA-approved'],
      ]},

      { type: 'heading', content: 'Sildenafil: The Original', level: 2 },
      { type: 'paragraph', content: 'Sildenafil was the first oral ED medication approved in Australia (1998). It is available as generic tablets in 25mg, 50mg, and 100mg doses. The typical starting dose is 50mg, taken approximately 30-60 minutes before sexual activity. It should not be taken more than once per day.' },
      { type: 'heading', content: 'When sildenafil works well', level: 3 },
      { type: 'list', content: '', items: [
        'You prefer to take medication only when needed',
        'You can plan around the 30-60 minute onset window',
        'You want a shorter duration of action (some men prefer the drug to "wear off")',
        'Cost is a priority -- generic sildenafil is typically the cheapest PDE5 option',
      ] },
      { type: 'heading', content: 'Key considerations', level: 3 },
      { type: 'list', content: '', items: [
        'High-fat meals can delay absorption by up to an hour and reduce peak effectiveness',
        'The 4-6 hour window means timing matters -- take it too early and the effect may fade',
        'Common side effects: headache (16%), flushing (10%), nasal congestion, visual disturbance (blue tinge, sensitivity to light)',
        'The visual side effects are unique to sildenafil among PDE5 inhibitors (it mildly inhibits PDE6 in the retina)',
      ] },

      { type: 'heading', content: 'Tadalafil: The Long-Acting Option', level: 2 },
      { type: 'paragraph', content: 'Tadalafil was approved in Australia in 2003. It is available in 5mg, 10mg, and 20mg doses. The key differentiator is its 17.5-hour half-life -- roughly four times longer than sildenafil. This gives a window of action up to 36 hours, earning it the nickname "the weekend pill."' },
      { type: 'heading', content: 'As-needed dosing (10mg or 20mg)', level: 3 },
      { type: 'list', content: '', items: [
        'Onset similar to sildenafil (30-60 minutes) but the window extends up to 36 hours',
        'Less affected by food -- can be taken with or without meals',
        'Some men prefer the flexibility of not needing to time the dose precisely',
        'Not to be taken more than once per day',
      ] },
      { type: 'heading', content: 'Daily low-dose (5mg)', level: 3 },
      { type: 'paragraph', content: 'Tadalafil 5mg taken daily provides a continuous low level of PDE5 inhibition. After about 5 days of daily dosing, steady-state plasma levels are reached. This eliminates the need to plan around a dose -- spontaneity is fully preserved. Daily tadalafil is also TGA-approved for benign prostatic hyperplasia (BPH), so men with both ED and urinary symptoms may get a two-for-one benefit.' },
      { type: 'heading', content: 'Key considerations', level: 3 },
      { type: 'list', content: '', items: [
        'Common side effects: headache (15%), dyspepsia/indigestion (10%), back pain, myalgia (muscle aches) -- these are more specific to tadalafil',
        'Back pain and muscle aches typically occur 12-24 hours after the dose and resolve within 48 hours',
        'No visual side effects (tadalafil does not inhibit PDE6)',
        'Daily dosing has a higher ongoing cost but may be preferred by men who are sexually active multiple times per week',
      ] },

      { type: 'heading', content: 'PBS Status and Cost in Australia', level: 2 },
      { type: 'paragraph', content: 'Neither sildenafil nor tadalafil is listed on the PBS for erectile dysfunction. Both are private (non-PBS) prescriptions in Australia, meaning you pay the full price without government subsidy. However, because both are now available as generics, prices have dropped significantly.' },
      { type: 'table', content: '', headers: ['Medication', 'Approximate generic price (2026)', 'Notes'], rows: [
        ['Sildenafil 50mg', '$3-$8 per tablet', 'Most common starting dose'],
        ['Sildenafil 100mg', '$4-$10 per tablet', 'Higher dose, often split'],
        ['Tadalafil 20mg (on demand)', '$4-$10 per tablet', 'Standard as-needed dose'],
        ['Tadalafil 5mg (daily)', '$1.50-$4 per tablet (~$45-$120/month)', 'Higher total cost but continuous coverage'],
      ]},
      { type: 'callout', variant: 'tip', content: 'Prices vary significantly between pharmacies. Generic versions are bioequivalent to branded products (TGA-approved) and can save you 70-80% compared to the original brands. Ask your pharmacist for the generic option.' },

      { type: 'heading', content: 'Contraindications -- Who Should Not Take PDE5 Inhibitors', level: 2 },
      { type: 'callout', variant: 'emergency', content: 'PDE5 inhibitors must NEVER be taken with nitrate medications (GTN spray, isosorbide mononitrate/dinitrate, amyl nitrite). The combination can cause a life-threatening drop in blood pressure. If you use nitrates in any form, PDE5 inhibitors are absolutely contraindicated.' },
      { type: 'list', content: 'Other contraindications and cautions:', items: [
        'Recent heart attack or stroke (within 6 months) -- discuss with your cardiologist',
        'Unstable angina or uncontrolled heart failure',
        'Severe liver impairment (lower doses required in moderate impairment)',
        'Severe renal impairment (dose adjustment needed)',
        'Hypotension (systolic BP below 90 mmHg)',
        'Alpha-blockers for prostate/BPH -- can cause postural hypotension; use with caution and start with the lowest PDE5 dose',
        'Retinitis pigmentosa (sildenafil) -- avoid due to PDE6 effect',
      ] },

      { type: 'heading', content: 'Which One Should You Choose?', level: 2 },
      { type: 'paragraph', content: 'There is no universally "better" option. The choice depends on your lifestyle, how frequently you are sexually active, whether you have concurrent BPH, your side-effect tolerance, and cost preferences.' },
      { type: 'table', content: '', headers: ['Choose this option', 'If this describes you'], rows: [
        ['Sildenafil (on demand)', 'Sexually active 1-2x per week, can plan timing, want lowest per-dose cost, prefer shorter duration'],
        ['Tadalafil (on demand)', 'Want flexibility without strict timing, eat at irregular times, concerned about visual side effects'],
        ['Tadalafil (daily 5mg)', 'Sexually active 3+ times per week, also have BPH/urinary symptoms, want complete spontaneity'],
      ]},

      { type: 'heading', content: 'Switching Between Them', level: 2 },
      { type: 'paragraph', content: 'If one PDE5 inhibitor is not effective or causes unacceptable side effects, switching to the other is a standard clinical approach. Australian Therapeutic Guidelines recommend trying a PDE5 inhibitor on at least 4-6 separate occasions before concluding it is ineffective. The first attempt is often not representative -- anxiety, incorrect timing, or a heavy meal can affect results.' },
      { type: 'callout', variant: 'info', content: 'If switching from tadalafil to sildenafil (or vice versa), allow adequate washout. After as-needed tadalafil, wait at least 48 hours before trying sildenafil. After sildenafil, 24 hours is sufficient before tadalafil.' },

      { type: 'heading', content: 'Getting a Prescription in Australia', level: 2 },
      { type: 'paragraph', content: 'Both sildenafil and tadalafil are Schedule 4 (prescription-only) medications in Australia. You need a prescription from an AHPRA-registered doctor. Telehealth consultations are appropriate for ED prescribing when the doctor can adequately assess your cardiovascular risk profile and medication history. InstantMed offers a structured ED assessment that covers the clinical information a prescribing doctor needs -- including a validated IIEF-5 questionnaire, cardiovascular history, and current medication review.', links: [{ text: 'ED assessment', href: '/erectile-dysfunction', title: 'Erectile dysfunction consultation' }] },
    ],
    faqs: [
      { question: 'Can I buy sildenafil or tadalafil over the counter in Australia?', answer: 'No. Both are Schedule 4 prescription-only medications. Any website or pharmacy selling them without a prescription is operating illegally. Always get a prescription from an AHPRA-registered doctor.' },
      { question: 'Are generic versions as effective as Viagra or Cialis?', answer: 'Yes. The TGA requires generic medications to be bioequivalent -- they contain the same active ingredient in the same dose and must demonstrate equivalent absorption. Generic sildenafil and tadalafil are clinically identical to the branded products.' },
      { question: 'Can I take both sildenafil and tadalafil together?', answer: 'No. Never combine two PDE5 inhibitors. This increases the risk of side effects, particularly dangerous drops in blood pressure. Use one or the other, not both.' },
      { question: 'Will PDE5 inhibitors work if my ED is psychological?', answer: 'They can help by providing a reliable physical response, which often reduces performance anxiety. However, if ED is primarily psychological, addressing the underlying cause (through counselling or therapy) is recommended alongside or instead of medication.' },
      { question: 'How long can I take PDE5 inhibitors?', answer: 'There is no maximum duration. Many men take them safely for years or decades. Regular medical reviews are recommended to reassess cardiovascular health and ensure the medication remains appropriate.' },
    ],
    relatedServices: [
      { title: 'ED Consultation', description: 'Structured erectile dysfunction assessment', href: '/erectile-dysfunction', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request a prescription renewal', href: '/repeat-prescription', icon: 'prescription' },
    ],
    relatedArticles: ['medications-not-prescribed-online', 'generic-vs-brand-medications', 'pbs-pharmaceutical-benefits-scheme'],
    seo: {
      title: 'Sildenafil vs Tadalafil in Australia | ED Medication Comparison | InstantMed',
      description: 'Compare sildenafil and tadalafil for erectile dysfunction -- duration, side effects, cost, PBS status, and how to choose. Evidence-based guide for Australian men.',
      keywords: ['sildenafil vs tadalafil', 'ED medication australia', 'erectile dysfunction treatment', 'sildenafil australia', 'tadalafil australia', 'PDE5 inhibitors comparison', 'generic viagra vs cialis'],
    },
  },

  {
    slug: 'finasteride-vs-minoxidil-hair-loss',
    title: 'Finasteride vs Minoxidil: Hair Loss Treatments Compared',
    subtitle: 'Evidence-based comparison of the two proven hair loss treatments available in Australia.',
    excerpt: 'Finasteride and minoxidil are the only two medications with strong evidence for male pattern hair loss. Learn how they work, their effectiveness, side effects, cost, and whether combining them makes sense.',
    category: 'medications',
    tags: ['prescription', 'medication'],
    publishedAt: '2026-04-13',
    updatedAt: '2026-04-13',
    readingTime: 8,
    viewCount: 0,
    author: defaultAuthor,
    heroImage: blogImages.finasterideVsMinoxidil,
    heroImageAlt: 'Hair loss treatment medications comparison',
    content: [
      { type: 'paragraph', content: 'Male pattern hair loss (androgenetic alopecia) affects roughly 50% of Australian men by age 50. Only two medications have robust clinical evidence for treatment: finasteride (oral, prescription) and minoxidil (topical, over-the-counter). They work by completely different mechanisms, have different side-effect profiles, and can be used alone or together. This guide covers the evidence for both.' },

      { type: 'heading', content: 'How Finasteride Works', level: 2 },
      { type: 'paragraph', content: 'Finasteride is a 5-alpha-reductase inhibitor. It blocks the enzyme that converts testosterone to dihydrotestosterone (DHT). DHT is the androgen primarily responsible for miniaturising hair follicles in genetically susceptible men. By reducing DHT levels by approximately 70%, finasteride slows follicle miniaturisation and, in many cases, allows partially miniaturised follicles to recover.' },
      { type: 'list', content: 'Key facts:', items: [
        'Dose: 1mg daily (oral tablet)',
        'Onset: visible results typically 3-6 months; full effect at 12 months',
        'Efficacy: 83-90% of men maintain or increase hair count over 2 years (Kaufman 1998, Whiting 2003)',
        'Schedule: S4 (prescription only) in Australia',
        'PBS listed: No -- private prescription only for hair loss indication',
      ] },

      { type: 'heading', content: 'How Minoxidil Works', level: 2 },
      { type: 'paragraph', content: 'Minoxidil is a vasodilator that was originally developed for high blood pressure. Its mechanism in hair growth is not fully understood, but it appears to prolong the anagen (growth) phase of the hair cycle and increase follicle size. It works independently of the androgen/DHT pathway, which is why it can complement finasteride.' },
      { type: 'list', content: 'Key facts:', items: [
        'Dose: topical 5% solution or foam, applied twice daily (or once daily for foam formulations)',
        'Onset: visible results typically 3-4 months; full effect at 6-12 months',
        'Efficacy: ~40% of men show moderate to dense regrowth; ~60% show some improvement over placebo',
        'Schedule: S3 (pharmacist-only) in Australia -- no prescription needed, but pharmacist must supply',
        'Oral minoxidil (off-label, low-dose 2.5-5mg) is increasingly prescribed by dermatologists',
      ] },

      { type: 'heading', content: 'Effectiveness: Head-to-Head', level: 2 },
      { type: 'paragraph', content: 'Direct comparison trials show finasteride is generally more effective than topical minoxidil for vertex (crown) hair loss. A 2004 study (Arca et al.) comparing finasteride 1mg to minoxidil 5% over 12 months found superior hair count improvements with finasteride. However, minoxidil may be more effective at the frontal hairline in some patients.' },
      { type: 'list', content: 'Summary:', items: [
        'Vertex (crown): finasteride generally superior',
        'Frontal hairline: both have modest efficacy; neither is strongly effective for advanced recession',
        'Maintenance (preventing further loss): finasteride superior -- it addresses the underlying hormonal cause',
        'Regrowth: both can regrow hair in partially miniaturised follicles; dead follicles cannot be recovered by either',
      ] },

      { type: 'heading', content: 'Side Effects', level: 2 },
      { type: 'heading', content: 'Finasteride side effects', level: 3 },
      { type: 'list', content: '', items: [
        'Sexual side effects (decreased libido, erectile difficulty, reduced ejaculate volume): reported by 2-4% in clinical trials',
        'These resolve on discontinuation in the vast majority of cases',
        'Post-finasteride syndrome (persistent sexual side effects after stopping): reported anecdotally but not confirmed in controlled studies; the FDA added warnings based on post-marketing reports',
        'Breast tenderness/gynaecomastia: rare (<1%)',
        'Mood changes: rare, reported anecdotally',
      ] },
      { type: 'callout', variant: 'info', content: 'The nocebo effect is well-documented with finasteride. A 2007 study (Mondaini et al.) found men who were informed about sexual side effects were significantly more likely to report them than men who were not informed but received the same drug. Discuss this with your doctor to put the risk in perspective.' },
      { type: 'heading', content: 'Minoxidil side effects (topical)', level: 3 },
      { type: 'list', content: '', items: [
        'Scalp irritation, dryness, or itching (most common, especially with the alcohol-based solution)',
        'Initial shedding in weeks 2-8 (a normal sign the treatment is working -- miniaturised hairs shed to make way for thicker ones)',
        'Unwanted facial hair growth if the solution drips onto the face',
        'Systemic side effects (dizziness, rapid heartbeat) are rare with topical application but more relevant with oral minoxidil',
        'The foam formulation causes less irritation than the solution',
      ] },

      { type: 'heading', content: 'Combining Finasteride and Minoxidil', level: 2 },
      { type: 'paragraph', content: 'Because finasteride and minoxidil work by different mechanisms, combining them is a well-established approach. Studies show combination therapy is more effective than either treatment alone, particularly for men with moderate hair loss who want maximum regrowth potential. The combination addresses both the hormonal cause (DHT) and directly stimulates follicle growth.' },

      { type: 'heading', content: 'Cost in Australia', level: 2 },
      { type: 'list', content: '', items: [
        'Finasteride 1mg (generic): approximately $20-$40 for 30 tablets (one month supply)',
        'Minoxidil 5% topical solution: approximately $25-$50 for a one-month supply (pharmacy brands)',
        'Minoxidil foam (e.g., Regaine): approximately $40-$70 for a one-month supply',
        'Neither is PBS-subsidised for hair loss -- both are private/full-price purchases',
      ] },
      { type: 'callout', variant: 'tip', content: 'Generic finasteride 1mg is bioequivalent to branded Propecia and costs a fraction of the price. Ask your pharmacist for the generic option. Some pharmacies also stock generic minoxidil solutions that are significantly cheaper than branded products.' },

      { type: 'heading', content: 'Important: Finasteride and Women', level: 2 },
      { type: 'callout', variant: 'warning', content: 'Finasteride is contraindicated in women of childbearing potential. It is a Category X drug in pregnancy -- exposure to finasteride during pregnancy can cause genital abnormalities in a male foetus. Women should not handle crushed or broken finasteride tablets. If your partner is pregnant or may become pregnant, handle tablets carefully.' },

      { type: 'heading', content: 'When to See a Dermatologist', level: 2 },
      { type: 'list', content: 'Consider specialist referral if:', items: [
        'You are losing hair rapidly or in patches (may indicate alopecia areata, not androgenetic alopecia)',
        'You are female (female pattern hair loss has different treatment approaches)',
        'Standard treatments have been ineffective after 12 months',
        'You have scarring or inflammation on the scalp',
        'You want to discuss advanced options (low-dose oral minoxidil, dutasteride, hair transplant)',
      ] },

      { type: 'heading', content: 'Getting Treatment in Australia', level: 2 },
      { type: 'paragraph', content: 'Minoxidil (topical) is available over-the-counter from any pharmacy (Schedule 3 -- pharmacist-only). Finasteride requires a prescription from an AHPRA-registered doctor. Telehealth consultations are appropriate for hair loss assessment and finasteride prescribing when the doctor can review your medical history and hair loss pattern. InstantMed offers a structured hair loss assessment pathway.', links: [{ text: 'hair loss assessment', href: '/hair-loss', title: 'Hair loss consultation' }] },
    ],
    faqs: [
      { question: 'How long do I need to take finasteride?', answer: 'Finasteride works only while you take it. Hair loss typically resumes within 6-12 months of stopping. Most men who respond well continue indefinitely.' },
      { question: 'Can I use minoxidil on my beard?', answer: 'Some men use minoxidil off-label for beard growth. Evidence is limited but anecdotal reports are positive. Discuss with your doctor.' },
      { question: 'Is finasteride the same as dutasteride?', answer: 'Both are 5-alpha-reductase inhibitors, but dutasteride inhibits both type 1 and type 2 isoforms (finasteride inhibits only type 2). Dutasteride is more potent but not TGA-approved for hair loss in Australia. Some dermatologists prescribe it off-label.' },
      { question: 'Will hair loss come back if I stop treatment?', answer: 'Yes, for both medications. Finasteride: hair loss resumes within 6-12 months. Minoxidil: regrown hair sheds within 3-6 months. They manage the condition, not cure it.' },
      { question: 'Can I take finasteride at a lower dose?', answer: 'Some dermatologists prescribe 0.5mg or even 0.25mg daily to reduce side-effect risk while maintaining most of the DHT reduction. Discuss dose adjustment with your doctor.' },
    ],
    relatedServices: [
      { title: 'Hair Loss Consultation', description: 'Structured hair loss assessment', href: '/hair-loss', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request a prescription renewal', href: '/repeat-prescription', icon: 'prescription' },
    ],
    relatedArticles: ['generic-vs-brand-medications', 'medications-not-prescribed-online', 'pbs-pharmaceutical-benefits-scheme'],
    seo: {
      title: 'Finasteride vs Minoxidil for Hair Loss | Australian Guide | InstantMed',
      description: 'Compare finasteride and minoxidil for male pattern hair loss -- how they work, effectiveness, side effects, cost in Australia, and whether to combine them.',
      keywords: ['finasteride vs minoxidil', 'hair loss treatment australia', 'finasteride australia', 'minoxidil australia', 'male pattern baldness treatment', 'propecia vs regaine'],
    },
  },

  {
    slug: 'metformin-type-2-diabetes-guide',
    title: 'Metformin for Type 2 Diabetes: What Australians Need to Know',
    subtitle: 'A practical guide to Australia\'s most prescribed diabetes medication.',
    excerpt: 'Metformin is the first-line medication for type 2 diabetes in Australia. Learn how it works, dosing, side effects, PBS status, and what to expect when starting treatment.',
    category: 'medications',
    tags: ['prescription', 'medication', 'chronic'],
    publishedAt: '2026-04-13',
    updatedAt: '2026-04-13',
    readingTime: 7,
    viewCount: 0,
    author: defaultAuthor,
    heroImage: blogImages.metforminGuide,
    heroImageAlt: 'Type 2 diabetes medication metformin guide',
    content: [
      { type: 'paragraph', content: 'Metformin is the most prescribed medication for type 2 diabetes worldwide and has been a cornerstone of treatment for over 60 years. In Australia, the Therapeutic Guidelines (eTG) recommend it as the first-line pharmacological therapy for type 2 diabetes, alongside lifestyle modifications. Over 2 million Australians have type 2 diabetes, and metformin is typically the first medication prescribed after diagnosis.', links: [{ text: 'type 2 diabetes', href: '/conditions/type-2-diabetes', title: 'Type 2 diabetes information' }] },

      { type: 'heading', content: 'How Metformin Works', level: 2 },
      { type: 'paragraph', content: 'Metformin is a biguanide that works primarily by reducing glucose production in the liver and improving insulin sensitivity in muscle tissue. Unlike some diabetes medications, metformin does not stimulate insulin secretion, which means it rarely causes hypoglycaemia (dangerously low blood sugar) when used alone.' },
      { type: 'list', content: 'Mechanism summary:', items: [
        'Reduces hepatic (liver) glucose production -- the primary effect',
        'Improves insulin sensitivity in peripheral tissues (muscle, fat)',
        'Modestly reduces intestinal absorption of glucose',
        'Does not cause weight gain -- may cause modest weight loss (1-2kg on average)',
        'Does not stimulate insulin release -- very low risk of hypoglycaemia as monotherapy',
      ] },

      { type: 'heading', content: 'Dosing and Formulations', level: 2 },
      { type: 'paragraph', content: 'Metformin is available in immediate-release (IR) and modified-release (MR/XR) tablets. The modified-release formulation was developed to reduce gastrointestinal side effects, which are metformin\'s main tolerability issue.' },
      { type: 'list', content: '', items: [
        'Immediate-release (IR): 500mg, 850mg, 1000mg tablets -- taken 2-3 times daily with meals',
        'Modified-release (MR/XR): 500mg, 1000mg tablets -- taken once daily (usually with evening meal)',
        'Starting dose: typically 500mg once or twice daily, increasing gradually over 2-4 weeks',
        'Target dose: usually 1500-2000mg daily (the dose at which maximum glucose-lowering effect is seen)',
        'Maximum dose: 3000mg daily (IR) or 2000mg daily (MR)',
      ] },
      { type: 'callout', variant: 'tip', content: 'The slow dose escalation is important. Starting at the full dose causes more GI side effects. Most doctors start at 500mg with the evening meal and increase by 500mg every 1-2 weeks until the target dose is reached.' },

      { type: 'heading', content: 'Side Effects', level: 2 },
      { type: 'heading', content: 'Common (10-30% of patients)', level: 3 },
      { type: 'list', content: '', items: [
        'Nausea, particularly when starting or increasing the dose',
        'Diarrhoea or loose stools',
        'Abdominal cramping or bloating',
        'Metallic taste',
        'Reduced appetite',
      ] },
      { type: 'paragraph', content: 'GI side effects typically improve after 2-4 weeks as the body adjusts. Taking metformin with food helps significantly. If IR tablets cause persistent GI issues, switching to the modified-release (MR) formulation often resolves them.' },
      { type: 'heading', content: 'Rare but serious', level: 3 },
      { type: 'list', content: '', items: [
        'Vitamin B12 deficiency: occurs in 5-10% of long-term users. Annual B12 monitoring is recommended, particularly after 3+ years of use',
        'Lactic acidosis: extremely rare (estimated 3-10 cases per 100,000 patient-years) but potentially fatal. Risk is elevated by severe kidney impairment, liver disease, alcohol excess, acute illness, or dehydration',
      ] },
      { type: 'callout', variant: 'warning', content: 'Metformin should be temporarily withheld during acute illness (especially with dehydration, vomiting, or diarrhoea), before and after surgery, and before procedures involving iodinated contrast dye. Your doctor or pharmacist will advise on when to pause and restart.' },

      { type: 'heading', content: 'Kidney Function and Metformin', level: 2 },
      { type: 'paragraph', content: 'Metformin is cleared by the kidneys. If kidney function declines (as measured by eGFR), the dose may need to be reduced or the medication stopped to avoid accumulation and lactic acidosis risk.' },
      { type: 'list', content: 'Australian dosing guidance by eGFR:', items: [
        'eGFR > 60: full dose (up to 2000-3000mg daily)',
        'eGFR 30-60: reduce dose; maximum 1000mg daily; monitor kidney function 3-6 monthly',
        'eGFR < 30: contraindicated -- metformin should be stopped',
      ] },

      { type: 'heading', content: 'PBS Status and Cost', level: 2 },
      { type: 'paragraph', content: 'Metformin is listed on the PBS for type 2 diabetes. This makes it one of the most affordable diabetes medications in Australia.' },
      { type: 'list', content: '', items: [
        'General patients: PBS co-payment (up to $31.60 for 2024)',
        'Concession card holders: $7.70 per script',
        'Generic metformin: widely available and bioequivalent to branded versions',
        'Cost without PBS (private): approximately $10-$25 for a month\'s supply',
      ] },

      { type: 'heading', content: 'Lifestyle Alongside Metformin', level: 2 },
      { type: 'paragraph', content: 'Metformin is not a replacement for lifestyle management -- it is an addition. The Australian Therapeutic Guidelines emphasise that diet, exercise, and weight management remain the foundation of type 2 diabetes treatment. Metformin is most effective when combined with these lifestyle modifications.', links: [{ text: 'weight management', href: '/conditions/weight-management', title: 'Weight management strategies' }] },
      { type: 'list', content: '', items: [
        'Regular physical activity: 150 minutes per week of moderate-intensity exercise (eTG recommendation)',
        'Dietary management: reduced refined carbohydrates, increased fibre, portion control',
        'Weight loss: even 5-10% body weight reduction significantly improves glycaemic control',
        'Alcohol moderation: alcohol increases lactic acidosis risk and can cause hypoglycaemia',
        'Regular monitoring: HbA1c every 3-6 months, annual kidney function, annual B12 after 3 years',
      ] },

      { type: 'heading', content: 'When Metformin Is Not Enough', level: 2 },
      { type: 'paragraph', content: 'If metformin alone does not achieve glycaemic targets (typically HbA1c below 53 mmol/mol or 7%), additional medications may be added. Second-line options in Australia include SGLT2 inhibitors (e.g., empagliflozin, dapagliflozin), GLP-1 receptor agonists (e.g., semaglutide, dulaglutide), DPP-4 inhibitors, and sulfonylureas. The choice depends on individual factors including cardiovascular risk, weight, kidney function, and cost. Your GP or endocrinologist will guide this decision.' },

      { type: 'heading', content: 'Getting Metformin Prescribed', level: 2 },
      { type: 'paragraph', content: 'Metformin requires a prescription from an AHPRA-registered doctor. For initial diagnosis and treatment commencement, an in-person GP consultation is recommended to include blood tests (HbA1c, fasting glucose, kidney function, lipids). For ongoing repeat prescriptions of stable, well-managed type 2 diabetes, telehealth is a convenient option.', links: [{ text: 'telehealth', href: '/consult', title: 'Online doctor consultation' }] },
    ],
    faqs: [
      { question: 'Can metformin help with weight loss?', answer: 'Metformin typically causes modest weight loss (1-2kg on average) rather than weight gain, which distinguishes it from some other diabetes medications. However, it is not approved or recommended solely for weight loss.' },
      { question: 'Can I drink alcohol while taking metformin?', answer: 'Moderate alcohol consumption is generally acceptable, but heavy or binge drinking increases the risk of lactic acidosis and can cause hypoglycaemia. Discuss your alcohol intake with your doctor.' },
      { question: 'Do I need to test my blood sugar on metformin?', answer: 'If you are on metformin alone (without insulin or sulfonylureas), routine home blood glucose monitoring is generally not necessary. Your HbA1c blood test every 3-6 months provides a better picture of overall control.' },
      { question: 'Is metformin safe long-term?', answer: 'Yes. Metformin has a 60+ year safety track record and is one of the most studied medications in the world. Long-term monitoring of B12 levels and kidney function is recommended.' },
      { question: 'What if I miss a dose?', answer: 'Take it as soon as you remember, unless it is nearly time for your next dose. Do not double up. Occasional missed doses are not dangerous.' },
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your diabetes management', href: '/consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request a prescription renewal', href: '/repeat-prescription', icon: 'prescription' },
    ],
    relatedArticles: ['pbs-pharmaceutical-benefits-scheme', 'generic-vs-brand-medications', 'medication-interactions'],
    seo: {
      title: 'Metformin for Type 2 Diabetes | Australian Guide | InstantMed',
      description: 'Complete guide to metformin for type 2 diabetes in Australia -- how it works, dosing, side effects, PBS cost, kidney considerations, and when to add second-line therapy.',
      keywords: ['metformin australia', 'metformin type 2 diabetes', 'metformin side effects', 'metformin PBS', 'diabetes medication australia', 'metformin dosing'],
    },
  },

  {
    slug: 'omeprazole-vs-pantoprazole',
    title: 'Omeprazole vs Pantoprazole: Comparing PPIs in Australia',
    subtitle: 'How the two most common proton pump inhibitors compare for reflux and stomach acid.',
    excerpt: 'Omeprazole and pantoprazole are the most prescribed proton pump inhibitors in Australia. Learn how they compare on effectiveness, side effects, drug interactions, PBS status, and long-term use considerations.',
    category: 'medications',
    tags: ['prescription', 'medication'],
    publishedAt: '2026-04-13',
    updatedAt: '2026-04-13',
    readingTime: 7,
    viewCount: 0,
    author: defaultAuthor,
    heroImage: blogImages.omeprazoleVsPantoprazole,
    heroImageAlt: 'Proton pump inhibitor medications comparison',
    content: [
      { type: 'paragraph', content: 'Proton pump inhibitors (PPIs) are among the most widely prescribed medications in Australia. Omeprazole and pantoprazole are the two most common, and GPs are frequently asked which one is "better." The short answer: they are very similar in effectiveness, but differ in drug interactions, formulation, and PBS listing. This guide covers the clinically relevant differences.' },

      { type: 'heading', content: 'How PPIs Work', level: 2 },
      { type: 'paragraph', content: 'PPIs irreversibly block the hydrogen-potassium ATPase enzyme (the proton pump) in the stomach lining. This is the final step of acid secretion. By blocking this pump, PPIs reduce stomach acid production by approximately 90% when taken at full dose. All PPIs work by the same mechanism -- the differences are pharmacokinetic (how the body processes them), not pharmacodynamic (what they do).' },

      { type: 'heading', content: 'Omeprazole', level: 2 },
      { type: 'paragraph', content: 'Omeprazole was the first PPI, approved in Australia in 1988. It remains one of the most prescribed medications in the country.' },
      { type: 'list', content: '', items: [
        'Doses: 10mg, 20mg, 40mg capsules',
        'Standard dose: 20mg once daily, taken 30-60 minutes before breakfast',
        'Metabolism: primarily through CYP2C19 and CYP3A4 liver enzymes',
        'Drug interactions: moderate -- interacts with clopidogrel (Plavix), some antifungals, and warfarin. The clopidogrel interaction is the most clinically significant',
        'PBS listed: Yes, for GORD, peptic ulcer, and H. pylori eradication',
        'Available OTC: Yes, omeprazole 10mg and 20mg are available over-the-counter (S3) from pharmacies',
      ] },

      { type: 'heading', content: 'Pantoprazole', level: 2 },
      { type: 'paragraph', content: 'Pantoprazole is a newer PPI that gained popularity partly because of its cleaner drug interaction profile.' },
      { type: 'list', content: '', items: [
        'Doses: 20mg, 40mg tablets',
        'Standard dose: 40mg once daily, taken 30-60 minutes before breakfast',
        'Metabolism: primarily through CYP2C19 but with less competitive inhibition than omeprazole',
        'Drug interactions: fewer than omeprazole. Importantly, pantoprazole has minimal interaction with clopidogrel -- this is a key clinical advantage for patients on antiplatelet therapy',
        'PBS listed: Yes, for GORD, peptic ulcer, and H. pylori eradication',
        'Available OTC: Yes, pantoprazole 20mg is available over-the-counter (S3)',
      ] },

      { type: 'heading', content: 'Effectiveness: Are They Equally Good?', level: 2 },
      { type: 'paragraph', content: 'For the most common indications -- gastro-oesophageal reflux disease (GORD), peptic ulcers, and H. pylori eradication (with antibiotics) -- meta-analyses show no clinically significant difference in effectiveness between omeprazole and pantoprazole at equivalent doses. Healing rates for oesophagitis and symptom relief for reflux are essentially identical.' },
      { type: 'callout', variant: 'info', content: 'The "equivalent dose" comparison is important. Omeprazole 20mg is roughly equivalent to pantoprazole 40mg in terms of acid suppression. If your doctor switches you from omeprazole 20mg to pantoprazole 20mg (rather than 40mg), you may notice reduced effectiveness.' },

      { type: 'heading', content: 'The Clopidogrel Question', level: 2 },
      { type: 'paragraph', content: 'This is the most important clinical difference. Clopidogrel (Plavix) is an antiplatelet medication used after heart attacks, stents, and strokes. Clopidogrel is a prodrug that requires activation by CYP2C19 -- the same enzyme that metabolises omeprazole. Concurrent omeprazole use can reduce clopidogrel\'s antiplatelet effect, potentially increasing cardiovascular risk.' },
      { type: 'paragraph', content: 'Pantoprazole has a weaker interaction with CYP2C19 and is the preferred PPI for patients taking clopidogrel. Australian Therapeutic Guidelines recommend pantoprazole (or rabeprazole) over omeprazole for patients on concurrent antiplatelet therapy.' },
      { type: 'callout', variant: 'warning', content: 'If you are taking clopidogrel (Plavix), tell your doctor. They should prescribe pantoprazole rather than omeprazole to avoid the drug interaction.' },

      { type: 'heading', content: 'Side Effects', level: 2 },
      { type: 'paragraph', content: 'Side effect profiles are very similar between the two PPIs. Most side effects are class effects (shared by all PPIs) rather than specific to one drug.' },
      { type: 'list', content: 'Common (1-10%):', items: [
        'Headache',
        'Nausea, diarrhoea, constipation, or abdominal pain',
        'Flatulence',
      ] },
      { type: 'list', content: 'Long-term use considerations:', items: [
        'Vitamin B12 deficiency: reduced acid impairs B12 absorption. Monitor after 2+ years',
        'Magnesium deficiency: rare but can occur with prolonged use (>1 year). Symptoms include muscle cramps, tremor, palpitations',
        'Calcium absorption: reduced acid may impair calcium absorption, potentially increasing fracture risk with long-term use (evidence is mixed)',
        'C. difficile infection: reduced stomach acid may increase susceptibility. Relevant mainly in hospital/aged care settings',
        'Rebound acid hypersecretion: stopping a PPI abruptly after prolonged use can cause temporary worsening of symptoms. Taper the dose gradually',
      ] },

      { type: 'heading', content: 'PBS Status and Cost', level: 2 },
      { type: 'list', content: '', items: [
        'Both are PBS listed for GORD, peptic ulcer, and H. pylori eradication',
        'PBS co-payment applies (general or concession rate)',
        'OTC omeprazole/pantoprazole: approximately $8-$20 for 14-28 tablets',
        'Generic versions of both are widely available and bioequivalent',
      ] },

      { type: 'heading', content: 'When to Use PPIs -- and When to Stop', level: 2 },
      { type: 'paragraph', content: 'PPIs are highly effective but are often continued longer than necessary. Australian Therapeutic Guidelines recommend the lowest effective dose for the shortest duration. Many patients can step down from a full-dose PPI to a half-dose, then to as-needed use, or discontinue entirely with lifestyle modifications.' },
      { type: 'list', content: 'When long-term PPI use is appropriate:', items: [
        'Barrett\'s oesophagus (ongoing acid suppression recommended)',
        'Severe erosive oesophagitis that relapses on stepping down',
        'Concurrent NSAID use in patients at high GI bleeding risk',
        'Zollinger-Ellison syndrome',
      ] },
      { type: 'list', content: 'Lifestyle modifications that can reduce PPI dependence:', items: [
        'Elevate the head of the bed (not just extra pillows -- raise the frame)',
        'Avoid eating within 2-3 hours of lying down',
        'Reduce caffeine, alcohol, chocolate, and spicy foods if they trigger symptoms',
        'Achieve a healthy weight -- excess abdominal fat increases reflux',
        'Stop smoking',
      ] },

      { type: 'heading', content: 'Getting a PPI Prescribed or Renewed', level: 2 },
      { type: 'paragraph', content: 'Low-dose omeprazole (10-20mg) and pantoprazole (20mg) are available without a prescription from pharmacies. Higher doses and PBS-subsidised supplies require a doctor\'s prescription. For ongoing repeat prescriptions of an established PPI, telehealth is a convenient option.', links: [{ text: 'telehealth', href: '/consult', title: 'Online doctor consultation' }] },
    ],
    faqs: [
      { question: 'Can I switch between omeprazole and pantoprazole?', answer: 'Yes, with appropriate dose adjustment. Omeprazole 20mg is roughly equivalent to pantoprazole 40mg. Your doctor can guide the switch.' },
      { question: 'Should I take my PPI before or after food?', answer: 'Before food -- ideally 30-60 minutes before breakfast. PPIs are most effective when taken before the first meal of the day, as they block proton pumps that are activated by eating.' },
      { question: 'Is it safe to take PPIs long-term?', answer: 'For appropriate indications, yes, with monitoring. However, Australian guidelines recommend regular review to assess whether the PPI is still needed and whether the dose can be reduced.' },
      { question: 'Can I buy PPIs without a prescription?', answer: 'Yes. Low-dose omeprazole and pantoprazole are available over-the-counter from pharmacies (Schedule 3). The pharmacist will assess appropriateness before supply.' },
      { question: 'What is the best time to take a PPI?', answer: 'Morning, 30-60 minutes before breakfast. If you need twice-daily dosing, take the second dose 30-60 minutes before dinner.' },
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your reflux management', href: '/consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request a prescription renewal', href: '/repeat-prescription', icon: 'prescription' },
    ],
    relatedArticles: ['medication-interactions', 'generic-vs-brand-medications', 'pbs-pharmaceutical-benefits-scheme'],
    seo: {
      title: 'Omeprazole vs Pantoprazole | PPI Comparison Australia | InstantMed',
      description: 'Compare omeprazole and pantoprazole for reflux and stomach acid -- effectiveness, drug interactions (clopidogrel), side effects, PBS cost, and long-term use guidance.',
      keywords: ['omeprazole vs pantoprazole', 'PPI comparison', 'omeprazole australia', 'pantoprazole australia', 'reflux medication', 'GORD treatment australia', 'proton pump inhibitors'],
    },
  },

  {
    slug: 'sertraline-vs-escitalopram',
    title: 'Sertraline vs Escitalopram: Comparing SSRIs for Anxiety and Depression',
    subtitle: 'How Australia\'s two most prescribed antidepressants compare.',
    excerpt: 'Sertraline and escitalopram are the most commonly prescribed SSRIs in Australia. Learn how they compare on effectiveness, side effects, drug interactions, PBS status, and which conditions each is best for.',
    category: 'medications',
    tags: ['prescription', 'medication'],
    publishedAt: '2026-04-13',
    updatedAt: '2026-04-13',
    readingTime: 8,
    viewCount: 0,
    author: defaultAuthor,
    heroImage: blogImages.sertralineVsEscitalopram,
    heroImageAlt: 'Antidepressant medication comparison guide',
    content: [
      { type: 'paragraph', content: 'Selective serotonin reuptake inhibitors (SSRIs) are the first-line pharmacological treatment for depression and most anxiety disorders in Australia. Sertraline and escitalopram are the two most prescribed SSRIs in the country, and both are recommended by the Australian Therapeutic Guidelines (eTG) as first-line options. This guide covers how they compare -- but it is important to note that medication choice for mental health is highly individual, and what works best varies significantly between people.', links: [{ text: 'depression', href: '/conditions/depression', title: 'Understanding depression' }] },
      { type: 'callout', variant: 'emergency', content: 'If you or someone you know is in crisis, contact Lifeline (13 11 14), Beyond Blue (1300 22 4636), or call 000 in an emergency. This article is informational -- it is not a substitute for individualised medical advice.' },

      { type: 'heading', content: 'How SSRIs Work', level: 2 },
      { type: 'paragraph', content: 'SSRIs increase serotonin levels in the brain by blocking its reabsorption (reuptake) into nerve cells. This makes more serotonin available in the synaptic cleft, which over time helps regulate mood, anxiety, and emotional processing. SSRIs don\'t work immediately -- it typically takes 2-4 weeks for therapeutic effects to begin, and 6-8 weeks for the full effect.' },

      { type: 'heading', content: 'Sertraline (Zoloft)', level: 2 },
      { type: 'list', content: '', items: [
        'Doses: 25mg, 50mg, 100mg tablets',
        'Starting dose: typically 25-50mg daily',
        'Target dose: 50-200mg daily',
        'TGA-approved for: depression, OCD, panic disorder, PTSD, social anxiety disorder, premenstrual dysphoric disorder (PMDD)',
        'PBS listed: Yes, for depression and OCD',
        'Half-life: 26 hours',
      ] },
      { type: 'paragraph', content: 'Sertraline has the broadest range of TGA-approved indications among SSRIs. It is the SSRI of choice in pregnancy (lowest risk of malformations based on available data) and is often preferred for patients with comorbid anxiety and depression.' },

      { type: 'heading', content: 'Escitalopram (Lexapro)', level: 2 },
      { type: 'list', content: '', items: [
        'Doses: 5mg, 10mg, 20mg tablets',
        'Starting dose: typically 5-10mg daily',
        'Target dose: 10-20mg daily',
        'TGA-approved for: depression, generalised anxiety disorder (GAD), social anxiety disorder, OCD',
        'PBS listed: Yes, for depression and GAD',
        'Half-life: 27-32 hours',
      ] },
      { type: 'paragraph', content: 'Escitalopram is the S-enantiomer of citalopram (purified active form). It is often considered the "cleanest" SSRI in terms of selectivity -- it has the fewest off-target receptor effects, which generally translates to fewer drug interactions and a straightforward side-effect profile.' },

      { type: 'heading', content: 'Effectiveness: Head-to-Head', level: 2 },
      { type: 'paragraph', content: 'The landmark Cipriani et al. 2018 network meta-analysis (published in The Lancet, covering 522 trials and 116,477 participants) ranked escitalopram as one of the most effective and best-tolerated antidepressants overall. Sertraline ranked highly on tolerability and was specifically noted for its good balance of efficacy and acceptability.' },
      { type: 'list', content: 'Summary from the evidence:', items: [
        'For depression: both are effective first-line options. Escitalopram may have a slight edge in overall efficacy in meta-analyses, but the clinical difference is small',
        'For generalised anxiety (GAD): escitalopram has the stronger evidence base and TGA approval',
        'For panic disorder: sertraline has TGA approval; escitalopram is used off-label',
        'For PTSD: sertraline is the preferred SSRI (TGA-approved; strongest evidence)',
        'For OCD: both have TGA approval. Higher doses are often needed (sertraline up to 200mg; escitalopram up to 20mg)',
        'For PMDD: sertraline has TGA approval -- the only SSRI with this specific indication in Australia',
      ] },

      { type: 'heading', content: 'Side Effects', level: 2 },
      { type: 'paragraph', content: 'Both SSRIs share common class side effects, but there are some differences in emphasis.' },
      { type: 'heading', content: 'Common side effects (both)', level: 3 },
      { type: 'list', content: '', items: [
        'Nausea (most common in the first 1-2 weeks, usually settles)',
        'Headache',
        'Sexual dysfunction (reduced libido, difficulty achieving orgasm) -- affects 30-50% of users',
        'Sleep disturbance (insomnia or drowsiness)',
        'Weight changes (modest -- typically 1-2kg over 6-12 months)',
        'Increased anxiety in the first 1-2 weeks (paradoxical but common -- usually settles)',
      ] },
      { type: 'heading', content: 'Sertraline-specific', level: 3 },
      { type: 'list', content: '', items: [
        'More likely to cause diarrhoea and GI upset (sertraline has mild dopamine reuptake activity)',
        'May be more activating (some patients find it energising, which can be good or bad depending on the individual)',
      ] },
      { type: 'heading', content: 'Escitalopram-specific', level: 3 },
      { type: 'list', content: '', items: [
        'Dose-dependent QT prolongation -- the TGA has a maximum recommended dose of 20mg. Avoid in patients with known QT prolongation or those taking other QT-prolonging drugs',
        'Generally considered slightly better tolerated overall (fewer GI side effects than sertraline)',
      ] },
      { type: 'callout', variant: 'warning', content: 'SSRIs should not be stopped abruptly -- discontinuation symptoms (dizziness, electric shock sensations, irritability, flu-like symptoms) can occur. Always taper gradually under medical supervision. Sertraline, with its shorter half-life, may cause more discontinuation effects than escitalopram.' },

      { type: 'heading', content: 'Drug Interactions', level: 2 },
      { type: 'paragraph', content: 'Escitalopram has fewer drug interactions than sertraline because it has less effect on cytochrome P450 enzymes. Sertraline is a moderate inhibitor of CYP2D6, which means it can increase levels of some other medications. Neither should be combined with MAOIs, and both require caution with other serotonergic drugs (tramadol, St John\'s Wort) due to serotonin syndrome risk.' },

      { type: 'heading', content: 'PBS Status and Cost', level: 2 },
      { type: 'list', content: '', items: [
        'Both are PBS listed -- standard co-payment applies',
        'Generic versions of both are widely available and significantly cheaper than branded versions',
        'Generic sertraline: approximately $8-$15 per month (PBS)',
        'Generic escitalopram: approximately $8-$15 per month (PBS)',
      ] },

      { type: 'heading', content: 'Starting and Stopping SSRIs', level: 2 },
      { type: 'paragraph', content: 'Starting: both should be initiated at a low dose and increased gradually. The first 2-4 weeks are the hardest -- side effects are most prominent before therapeutic benefits appear. Your doctor should review you within 2-4 weeks of starting.' },
      { type: 'paragraph', content: 'Stopping: taper gradually over at least 4 weeks (longer if you have been on the medication for more than 6 months). Never stop an SSRI abruptly. Discuss any planned changes with your prescribing doctor.' },
      { type: 'paragraph', content: 'Duration: Australian guidelines recommend continuing an SSRI for at least 6-12 months after remission of a first depressive episode. For recurrent depression, longer-term maintenance treatment may be appropriate.' },

      { type: 'heading', content: 'Choosing Between Them', level: 2 },
      { type: 'paragraph', content: 'In practice, the choice often comes down to individual factors and the specific condition being treated.' },
      { type: 'list', content: 'Consider sertraline if:', items: [
        'You have PTSD, panic disorder, or PMDD (stronger evidence / TGA approval)',
        'You are pregnant or planning pregnancy (lowest risk SSRI)',
        'You prefer a more "activating" profile',
        'Cost is a priority (both are similarly priced, but sertraline has been generic for longer)',
      ] },
      { type: 'list', content: 'Consider escitalopram if:', items: [
        'You have GAD (TGA-approved with strong evidence)',
        'You want the fewest drug interactions',
        'You are sensitive to GI side effects',
        'Previous SSRIs caused problematic side effects (escitalopram is often the best-tolerated)',
      ] },

      { type: 'heading', content: 'Getting an SSRI Prescribed', level: 2 },
      { type: 'paragraph', content: 'SSRIs require a prescription from an AHPRA-registered doctor. Initial assessment for depression or anxiety should ideally include a comprehensive history, validated screening tools (PHQ-9 for depression, GAD-7 for anxiety), and discussion of both medication and non-medication options (psychological therapy is recommended alongside or instead of medication for mild-to-moderate symptoms). For ongoing prescriptions of a stable, well-managed regimen, telehealth is a convenient option for repeat scripts.', links: [{ text: 'repeat scripts', href: '/repeat-prescription', title: 'Repeat prescription request' }] },
    ],
    faqs: [
      { question: 'How long do SSRIs take to work?', answer: 'Most people notice some improvement in 2-4 weeks, with full therapeutic effect at 6-8 weeks. If there is no improvement after 4-6 weeks at an adequate dose, discuss alternatives with your doctor.' },
      { question: 'Can I drink alcohol on an SSRI?', answer: 'Moderate alcohol is generally not contraindicated, but alcohol can worsen depression and anxiety, and may increase drowsiness. Many doctors recommend limiting or avoiding alcohol, particularly in the first few weeks.' },
      { question: 'Will I gain weight on an SSRI?', answer: 'SSRIs can cause modest weight changes (typically 1-2kg). Sertraline and escitalopram are considered "weight-neutral" compared to some other antidepressants (e.g., mirtazapine, which causes more significant weight gain).' },
      { question: 'Can I switch from one SSRI to another?', answer: 'Yes, with medical guidance. Direct switching (tapering one while starting the other) is usually straightforward between sertraline and escitalopram. Your doctor will advise on the crossover schedule.' },
      { question: 'Are SSRIs addictive?', answer: 'No. SSRIs are not addictive and do not cause cravings or compulsive use. However, stopping abruptly can cause discontinuation symptoms (not the same as withdrawal from addictive substances). This is why gradual tapering is important.' },
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your mental health treatment', href: '/consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request a prescription renewal', href: '/repeat-prescription', icon: 'prescription' },
    ],
    relatedArticles: ['medication-interactions', 'generic-vs-brand-medications', 'medications-not-prescribed-online'],
    seo: {
      title: 'Sertraline vs Escitalopram | SSRI Comparison Australia | InstantMed',
      description: 'Compare sertraline and escitalopram for depression and anxiety -- effectiveness, side effects, drug interactions, PBS cost, and which conditions each is best suited for.',
      keywords: ['sertraline vs escitalopram', 'SSRI comparison', 'sertraline australia', 'escitalopram australia', 'antidepressant comparison', 'zoloft vs lexapro', 'depression medication australia'],
    },
  },

  {
    slug: 'amoxicillin-guide-australia',
    title: 'Amoxicillin in Australia: Uses, Dosing, and What to Know',
    subtitle: 'A practical guide to Australia\'s most prescribed antibiotic.',
    excerpt: 'Amoxicillin is the most commonly prescribed antibiotic in Australia. Learn what it treats, how to take it, side effects, when it won\'t work (viral infections), and why completing the course matters.',
    category: 'medications',
    tags: ['prescription', 'medication'],
    publishedAt: '2026-04-13',
    updatedAt: '2026-04-13',
    readingTime: 6,
    viewCount: 0,
    author: defaultAuthor,
    heroImage: blogImages.amoxicillinGuide,
    heroImageAlt: 'Antibiotic medication amoxicillin guide',
    content: [
      { type: 'paragraph', content: 'Amoxicillin is a penicillin-type antibiotic and the most frequently prescribed antibiotic in Australia. It is effective against a wide range of common bacterial infections and has been in clinical use since 1972. This guide covers what amoxicillin treats, how to take it, side effects, and the critical distinction between bacterial infections (where antibiotics help) and viral infections (where they do not).' },

      { type: 'heading', content: 'What Amoxicillin Treats', level: 2 },
      { type: 'paragraph', content: 'Amoxicillin is effective against many gram-positive and some gram-negative bacteria. The Australian Therapeutic Guidelines (eTG) recommend it as first-line treatment for several common infections:' },
      { type: 'list', content: '', items: [
        'Acute bacterial sinusitis (when criteria for antibiotic treatment are met)',
        'Acute otitis media (middle ear infection)',
        'Streptococcal pharyngitis/tonsillitis (confirmed or strongly suspected strep throat)',
        'Community-acquired pneumonia (mild, in combination or as first-line)',
        'Urinary tract infections (less commonly now due to resistance patterns)',
        'H. pylori eradication (as part of triple therapy with a PPI and clarithromycin)',
        'Dental infections',
        'Skin infections (some types)',
      ] },

      { type: 'heading', content: 'What Amoxicillin Does NOT Treat', level: 2 },
      { type: 'callout', variant: 'warning', content: 'Amoxicillin does NOT work against viral infections. The common cold, most sore throats, influenza, COVID-19, and most coughs are viral. Taking antibiotics for viral infections does not help, exposes you to side effects unnecessarily, and contributes to antibiotic resistance -- a major public health threat.' },
      { type: 'paragraph', content: 'Australian data shows that antibiotics are still over-prescribed for conditions that are usually viral. If your doctor determines that your infection is likely viral, the appropriate treatment is rest, fluids, and symptomatic relief -- not antibiotics. A good doctor will explain why they are not prescribing antibiotics, not just hand over a script to end the consultation.' },

      { type: 'heading', content: 'Dosing', level: 2 },
      { type: 'list', content: 'Standard adult dosing (varies by indication):', items: [
        'Mild infections: 500mg every 8 hours (three times daily)',
        'Moderate infections: 500mg-1g every 8 hours',
        'Duration: typically 5-7 days for most infections; 10 days for strep throat; 14 days for H. pylori',
        'Take with or without food -- amoxicillin is well absorbed either way',
        'Space doses as evenly as possible (e.g., 7am, 3pm, 11pm for three times daily)',
      ] },
      { type: 'callout', variant: 'tip', content: 'Complete the full course as prescribed, even if you feel better after 2-3 days. Stopping early increases the risk of the infection returning and contributes to antibiotic resistance.' },

      { type: 'heading', content: 'Side Effects', level: 2 },
      { type: 'heading', content: 'Common (5-10%)', level: 3 },
      { type: 'list', content: '', items: [
        'Diarrhoea (most common -- amoxicillin disrupts gut flora)',
        'Nausea',
        'Skin rash (non-allergic amoxicillin rash occurs in ~5-10%, especially with concurrent viral infections like glandular fever)',
      ] },
      { type: 'heading', content: 'Uncommon but important', level: 3 },
      { type: 'list', content: '', items: [
        'Vaginal thrush (candidiasis) -- antibiotics disrupt normal bacterial balance',
        'Allergic reactions: true penicillin allergy occurs in ~1-2% of the population. Symptoms include urticaria (hives), angioedema, and rarely anaphylaxis',
      ] },
      { type: 'callout', variant: 'emergency', content: 'If you develop difficulty breathing, facial/throat swelling, or widespread hives after taking amoxicillin, call 000 immediately. This may be anaphylaxis -- a medical emergency.' },

      { type: 'heading', content: 'Penicillin Allergy', level: 2 },
      { type: 'paragraph', content: 'Many people believe they are allergic to penicillin, but studies show that over 90% of people labelled "penicillin allergic" can actually tolerate penicillins safely. Common childhood rashes during antibiotic courses are often viral (coincidental) rather than true drug allergies. If you have a "penicillin allergy" label, discuss it with your doctor -- allergy testing may be appropriate to clarify, as the label can limit your antibiotic options unnecessarily.' },

      { type: 'heading', content: 'Amoxicillin and the Contraceptive Pill', level: 2 },
      { type: 'paragraph', content: 'The interaction between standard antibiotics (including amoxicillin) and the oral contraceptive pill has been largely debunked. Current evidence and Australian guidelines indicate that non-enzyme-inducing antibiotics like amoxicillin do not reduce the effectiveness of the combined oral contraceptive pill. The exception is rifampicin and rifabutin, which are enzyme-inducing and do affect the pill.' },
      { type: 'callout', variant: 'info', content: 'If you experience vomiting or severe diarrhoea while on amoxicillin and the pill, this CAN affect pill absorption (as it would with any GI disturbance). In this case, use additional contraception until you have taken the pill for 7 consecutive days without GI symptoms.' },

      { type: 'heading', content: 'Antibiotic Resistance', level: 2 },
      { type: 'paragraph', content: 'Antibiotic resistance is one of the most significant public health threats globally. Australia\'s Antimicrobial Resistance Strategy emphasises responsible prescribing. You can help by:' },
      { type: 'list', content: '', items: [
        'Only taking antibiotics when prescribed by a doctor for a confirmed or strongly suspected bacterial infection',
        'Completing the full course as prescribed',
        'Never sharing antibiotics or using leftover antibiotics from a previous course',
        'Not pressuring your doctor for antibiotics when they advise against them',
        'Understanding that most colds, sore throats, and coughs are viral and do not need antibiotics',
      ] },

      { type: 'heading', content: 'PBS Status and Cost', level: 2 },
      { type: 'list', content: '', items: [
        'PBS listed: Yes, for appropriate bacterial infections',
        'Cost: PBS co-payment (general or concession)',
        'Without PBS: approximately $8-$15 for a standard course',
        'Available as capsules, tablets, and oral suspension (liquid, for children or those who can\'t swallow tablets)',
      ] },

      { type: 'heading', content: 'Getting Amoxicillin Prescribed', level: 2 },
      { type: 'paragraph', content: 'Amoxicillin is a Schedule 4 (prescription-only) medication. Antibiotics should only be prescribed after a clinical assessment determines that a bacterial infection is likely or confirmed. Telehealth can be appropriate for some antibiotic prescribing -- for example, when symptoms and history strongly suggest a specific bacterial infection (such as UTI in a woman with recurrent, well-characterised episodes). For conditions requiring examination (throat inspection, ear examination), in-person assessment is more appropriate.', links: [{ text: 'clinical assessment', href: '/consult', title: 'Online doctor consultation' }] },
    ],
    faqs: [
      { question: 'Can I take amoxicillin if I\'m allergic to penicillin?', answer: 'No. Amoxicillin is a penicillin. If you have a confirmed penicillin allergy, you need an alternative antibiotic. However, many people labelled "penicillin allergic" are not truly allergic -- discuss allergy testing with your doctor.' },
      { question: 'Can I drink alcohol while taking amoxicillin?', answer: 'Amoxicillin does not have a direct interaction with alcohol. However, alcohol can worsen side effects like nausea and can impair your immune system. Moderate consumption is unlikely to cause problems, but resting and staying hydrated is more helpful for recovery.' },
      { question: 'What if I miss a dose?', answer: 'Take it as soon as you remember, then space the remaining doses evenly for the rest of the day. Do not take a double dose. If it is nearly time for your next dose, skip the missed one.' },
      { question: 'Why did my doctor refuse to prescribe antibiotics?', answer: 'Most likely because your infection is viral. This is responsible prescribing -- prescribing antibiotics for viral infections exposes you to unnecessary side effects and contributes to antibiotic resistance without any benefit.' },
      { question: 'Can I get amoxicillin over the counter?', answer: 'No. All antibiotics in Australia are prescription-only (Schedule 4). Any source offering antibiotics without a prescription is operating outside the law.' },
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your infection symptoms', href: '/consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request a prescription', href: '/repeat-prescription', icon: 'prescription' },
    ],
    relatedArticles: ['medications-not-prescribed-online', 'pbs-pharmaceutical-benefits-scheme', 'generic-vs-brand-medications'],
    seo: {
      title: 'Amoxicillin Guide Australia | Uses, Dosing, Side Effects | InstantMed',
      description: 'Complete guide to amoxicillin in Australia -- what it treats, dosing, side effects, penicillin allergy, antibiotic resistance, and when antibiotics are not appropriate.',
      keywords: ['amoxicillin australia', 'amoxicillin uses', 'amoxicillin side effects', 'antibiotic guide', 'amoxicillin dosing', 'penicillin allergy', 'antibiotic resistance australia'],
    },
  },
]
