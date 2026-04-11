/**
 * Medications data for the prescriptions section
 * Note: This is reference data only - all prescribing decisions are made by doctors
 */

export type MedicationCategory =
  | "skin"
  | "mens-health"
  | "womens-health"
  | "pain"
  | "allergy"
  | "mental-health"
  | "infection"
  | "chronic"

export interface Medication {
  id: string
  slug: string
  name: string
  genericName: string
  brandNames: string[]
  category: MedicationCategory
  simpleDescription: string
  uses: string[]
  dosages: string[]
  sideEffects: string[]
  warnings: string[]
  contraindications: string[]
  price: number
  requiresCall: boolean
  popular: boolean
  faqs?: Array<{ q: string; a: string }>
}

export const CATEGORY_LABELS: Record<MedicationCategory, string> = {
  skin: "Skin & Acne",
  "mens-health": "Men's Health",
  "womens-health": "Women's Health",
  pain: "Pain Relief",
  allergy: "Allergy & Hayfever",
  "mental-health": "Mental Health",
  infection: "Infections",
  chronic: "Chronic Conditions",
}

export const CATEGORY_ICONS: Record<MedicationCategory, string> = {
  skin: "✨",
  "mens-health": "👨",
  "womens-health": "👩",
  pain: "💊",
  allergy: "🌸",
  "mental-health": "🧠",
  infection: "🦠",
  chronic: "❤️",
}

const MEDICATIONS: Medication[] = [
  // Skin
  {
    id: "tretinoin",
    slug: "tretinoin",
    name: "Tretinoin",
    genericName: "Tretinoin",
    brandNames: ["Retrieve", "Stieva-A"],
    category: "skin",
    simpleDescription: "A vitamin A derivative used for acne and skin renewal. Applied topically to improve skin texture and reduce breakouts.",
    uses: ["Acne treatment", "Skin texture improvement", "Fine lines reduction", "Sun damage repair"],
    dosages: ["0.025% cream", "0.05% cream", "0.1% cream"],
    sideEffects: ["Skin dryness", "Peeling", "Redness", "Sun sensitivity"],
    warnings: ["Avoid sun exposure", "Not for use during pregnancy", "Start with lower strength"],
    contraindications: ["Pregnancy", "Breastfeeding", "Eczema on treatment area"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "How long does tretinoin take to work?", a: "Most people see improvement in 6–12 weeks. Skin may initially look worse (purging) before improving. Consistency is key - don't stop early." },
      { q: "Can I use tretinoin with other skincare?", a: "Avoid using with AHAs, BHAs, benzoyl peroxide, or vitamin C at the same time. Your doctor will advise on a safe routine." },
      { q: "Do I need sunscreen with tretinoin?", a: "Yes - tretinoin increases sun sensitivity significantly. Use SPF 50+ daily, even on cloudy days." },
    ],
  },
  {
    id: "doxycycline-acne",
    slug: "doxycycline-acne",
    name: "Doxycycline",
    genericName: "Doxycycline",
    brandNames: ["Doryx", "Doxy"],
    category: "skin",
    simpleDescription: "An antibiotic used for moderate to severe acne. Reduces bacteria and inflammation.",
    uses: ["Moderate acne", "Severe acne", "Inflammatory acne"],
    dosages: ["50mg daily", "100mg daily"],
    sideEffects: ["Nausea", "Sun sensitivity", "Stomach upset"],
    warnings: ["Take with food", "Avoid lying down after taking", "Use sun protection"],
    contraindications: ["Pregnancy", "Children under 12", "Severe liver disease"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "Can I take doxycycline with alcohol?", a: "It's best to avoid alcohol while on doxycycline. Alcohol doesn't reduce effectiveness, but it can worsen side effects like nausea and stomach upset." },
      { q: "How long do I take doxycycline for acne?", a: "Typically 3–6 months. Your doctor will review progress and may switch to topical treatment once acne is controlled." },
      { q: "Does doxycycline cause sun sensitivity?", a: "Yes - doxycycline makes skin more sensitive to UV. Use SPF 50+ sunscreen and avoid prolonged sun exposure during treatment." },
    ],
  },
  // Men's Health
  {
    id: "sildenafil",
    slug: "sildenafil",
    name: "Sildenafil",
    genericName: "Sildenafil",
    brandNames: ["Viagra", "Vedafil"],
    category: "mens-health",
    simpleDescription: "Used for erectile dysfunction. Works by increasing blood flow. Take 30-60 minutes before activity.",
    uses: ["Erectile dysfunction"],
    dosages: ["25mg", "50mg", "100mg"],
    sideEffects: ["Headache", "Flushing", "Nasal congestion", "Indigestion"],
    warnings: ["Do not use with nitrates", "Seek help if erection lasts >4 hours"],
    contraindications: ["Heart conditions requiring nitrates", "Recent stroke", "Severe heart failure"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "How long before activity should I take sildenafil?", a: "Take 30–60 minutes before. Effects last 4–6 hours. It works best on an empty stomach or after a light meal." },
      { q: "Can I take sildenafil daily?", a: "Sildenafil is typically taken as needed. For daily use, your doctor may recommend tadalafil 5mg instead." },
      { q: "Is sildenafil the same as Viagra?", a: "Yes - sildenafil is the active ingredient in Viagra. Generic sildenafil is equally effective at a lower cost." },
    ],
  },
  {
    id: "tadalafil",
    slug: "tadalafil",
    name: "Tadalafil",
    genericName: "Tadalafil",
    brandNames: ["Cialis"],
    category: "mens-health",
    simpleDescription: "Long-acting treatment for erectile dysfunction. Effects can last up to 36 hours.",
    uses: ["Erectile dysfunction", "Benign prostatic hyperplasia"],
    dosages: ["5mg daily", "10mg as needed", "20mg as needed"],
    sideEffects: ["Headache", "Back pain", "Muscle aches", "Flushing"],
    warnings: ["Do not use with nitrates", "Effects last longer than other options"],
    contraindications: ["Heart conditions requiring nitrates", "Recent stroke", "Severe liver disease"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "What's the difference between tadalafil and sildenafil?", a: "Tadalafil lasts up to 36 hours vs 4–6 hours for sildenafil. Tadalafil can also be taken daily at a low dose (5mg) for continuous effect." },
      { q: "Can I drink alcohol with tadalafil?", a: "Small amounts are generally fine, but alcohol can increase side effects like dizziness and lower blood pressure. Avoid heavy drinking." },
      { q: "Is Cialis the same as tadalafil?", a: "Yes - tadalafil is the active ingredient in Cialis. Generic tadalafil is equally effective." },
    ],
  },
  // Women's Health
  {
    id: "norethisterone",
    slug: "norethisterone",
    name: "Norethisterone",
    genericName: "Norethisterone",
    brandNames: ["Primolut N"],
    category: "womens-health",
    simpleDescription: "Used to delay periods for travel or events. Start 3 days before expected period.",
    uses: ["Period delay", "Heavy periods", "Endometriosis"],
    dosages: ["5mg three times daily"],
    sideEffects: ["Bloating", "Breast tenderness", "Mood changes"],
    warnings: ["Not a contraceptive", "Period will start 2-3 days after stopping"],
    contraindications: ["Pregnancy", "History of blood clots", "Liver disease"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "How far in advance should I start norethisterone?", a: "Start 3 days before your expected period. Your period will typically start 2–3 days after you stop taking it." },
      { q: "Is norethisterone a contraceptive?", a: "No - norethisterone at this dose is NOT a contraceptive. You still need separate contraception to prevent pregnancy." },
      { q: "How long can I delay my period?", a: "Usually up to 2 weeks. Longer use should be discussed with your doctor. It's a short-term solution for travel or events." },
    ],
  },
  {
    id: "trimethoprim",
    slug: "trimethoprim",
    name: "Trimethoprim",
    genericName: "Trimethoprim",
    brandNames: ["Alprim"],
    category: "womens-health",
    simpleDescription: "Antibiotic commonly used for uncomplicated urinary tract infections (UTIs).",
    uses: ["Urinary tract infections", "Bladder infections"],
    dosages: ["300mg once daily for 3 days", "150mg twice daily for 3 days"],
    sideEffects: ["Nausea", "Rash", "Itching"],
    warnings: ["Complete full course", "Drink plenty of water"],
    contraindications: ["Severe kidney disease", "Blood disorders", "Folate deficiency"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "How quickly does trimethoprim work for a UTI?", a: "Most people feel improvement within 24 hours. Complete the full 3-day course even if symptoms resolve earlier." },
      { q: "Can I get trimethoprim without seeing a doctor in person?", a: "Yes - uncomplicated UTIs are well-suited to telehealth. A doctor will assess your symptoms and prescribe if appropriate." },
      { q: "Will trimethoprim affect the contraceptive pill?", a: "Trimethoprim is not generally considered to reduce pill effectiveness. However, being unwell can sometimes affect absorption." },
    ],
  },
  // Allergy
  {
    id: "fexofenadine",
    slug: "fexofenadine",
    name: "Fexofenadine",
    genericName: "Fexofenadine",
    brandNames: ["Telfast", "Fexotabs"],
    category: "allergy",
    simpleDescription: "Non-drowsy antihistamine for hayfever and allergies. Works within 1-3 hours.",
    uses: ["Hayfever", "Allergic rhinitis", "Hives", "Skin allergies"],
    dosages: ["60mg twice daily", "120mg once daily", "180mg once daily"],
    sideEffects: ["Headache", "Drowsiness (rare)", "Nausea"],
    warnings: ["Avoid with fruit juice", "Take on empty stomach for best effect"],
    contraindications: ["Severe kidney disease"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "Is fexofenadine non-drowsy?", a: "Yes - fexofenadine is a non-drowsy antihistamine. It's one of the least sedating options available and is safe for driving." },
      { q: "Can I take fexofenadine every day?", a: "Yes - it's safe for daily use during allergy season. Take it at the same time each day for best results." },
      { q: "Why shouldn't I take fexofenadine with fruit juice?", a: "Fruit juice (especially grapefruit, orange, apple) can reduce absorption by up to 40%. Take with water instead." },
    ],
  },
  {
    id: "mometasone-nasal",
    slug: "mometasone-nasal",
    name: "Mometasone Nasal Spray",
    genericName: "Mometasone",
    brandNames: ["Nasonex"],
    category: "allergy",
    simpleDescription: "Steroid nasal spray for hayfever and nasal congestion. Use daily for best effect.",
    uses: ["Hayfever", "Allergic rhinitis", "Nasal polyps", "Nasal congestion"],
    dosages: ["2 sprays each nostril once daily"],
    sideEffects: ["Nosebleeds", "Headache", "Throat irritation"],
    warnings: ["Takes a few days for full effect", "Use regularly during allergy season"],
    contraindications: ["Recent nasal surgery", "Nasal infections"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "How long does mometasone take to work?", a: "You may notice some relief within 12 hours, but full effect takes 1–2 weeks of regular daily use. Don't use it sporadically." },
      { q: "Is mometasone a steroid?", a: "Yes - it's a corticosteroid nasal spray. At nasal doses, very little is absorbed systemically, so side effects are minimal." },
      { q: "Can I use mometasone with antihistamine tablets?", a: "Yes - combining a nasal steroid with oral antihistamines (like fexofenadine) is a common and effective strategy for moderate-to-severe hayfever." },
    ],
  },
  // Pain
  {
    id: "naproxen",
    slug: "naproxen",
    name: "Naproxen",
    genericName: "Naproxen",
    brandNames: ["Naprosyn", "Naprogesic"],
    category: "pain",
    simpleDescription: "Anti-inflammatory painkiller for muscle pain, period pain, and arthritis.",
    uses: ["Period pain", "Muscle pain", "Arthritis", "Back pain", "Headaches"],
    dosages: ["250mg twice daily", "500mg twice daily"],
    sideEffects: ["Stomach upset", "Heartburn", "Dizziness"],
    warnings: ["Take with food", "Avoid alcohol", "Not for long-term use without supervision"],
    contraindications: ["Stomach ulcers", "Severe kidney disease", "Heart failure", "Third trimester pregnancy"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "Is naproxen stronger than ibuprofen?", a: "They're similar strength, but naproxen lasts longer (8–12 hours vs 4–6 hours for ibuprofen), so you take fewer doses per day." },
      { q: "Can I take naproxen on an empty stomach?", a: "No - always take with food or milk. Naproxen can irritate the stomach lining and cause ulcers if taken without food." },
      { q: "How long can I take naproxen?", a: "Short-term use (up to 2 weeks) is generally safe. Long-term use requires doctor supervision due to stomach and cardiovascular risks." },
    ],
  },
  // Mental Health
  {
    id: "sertraline",
    slug: "sertraline",
    name: "Sertraline",
    genericName: "Sertraline",
    brandNames: ["Zoloft"],
    category: "mental-health",
    simpleDescription: "An SSRI antidepressant used for depression and anxiety disorders.",
    uses: ["Depression", "Anxiety disorders", "Panic disorder", "OCD", "PTSD"],
    dosages: ["25mg daily", "50mg daily", "100mg daily"],
    sideEffects: ["Nausea", "Headache", "Sleep changes", "Sexual side effects"],
    warnings: ["Takes 2-4 weeks for full effect", "Do not stop suddenly", "Monitor for worsening mood initially"],
    contraindications: ["MAOIs", "Pimozide use", "Uncontrolled epilepsy"],
    price: 49,
    requiresCall: true,
    popular: true,
    faqs: [
      { q: "How long does sertraline take to work?", a: "Most people notice improvement in 2–4 weeks, but full effects can take 6–8 weeks. Don't stop taking it because it feels like it's not working yet." },
      { q: "Can I drink alcohol while taking sertraline?", a: "It's best to avoid or limit alcohol. Sertraline and alcohol both affect the brain - combining them can worsen drowsiness, dizziness, and depression." },
      { q: "What happens if I miss a dose?", a: "Take it as soon as you remember, unless it's close to your next dose. Never take a double dose. Missing doses occasionally is common - just resume your normal schedule." },
    ],
  },
  {
    id: "escitalopram",
    slug: "escitalopram",
    name: "Escitalopram",
    genericName: "Escitalopram",
    brandNames: ["Lexapro", "Esipram"],
    category: "mental-health",
    simpleDescription: "An SSRI antidepressant commonly used for depression and generalised anxiety.",
    uses: ["Depression", "Generalised anxiety", "Social anxiety", "Panic disorder"],
    dosages: ["5mg daily", "10mg daily", "20mg daily"],
    sideEffects: ["Nausea", "Fatigue", "Insomnia", "Sexual side effects"],
    warnings: ["Takes 2-4 weeks for full effect", "Do not stop suddenly"],
    contraindications: ["MAOIs", "QT prolongation", "Severe liver disease"],
    price: 49,
    requiresCall: true,
    popular: true,
    faqs: [
      { q: "What's the difference between escitalopram and sertraline?", a: "Both are SSRIs. Escitalopram tends to have fewer side effects and drug interactions. Your doctor will recommend based on your specific situation." },
      { q: "Can I stop escitalopram suddenly?", a: "No - stopping suddenly can cause withdrawal symptoms (dizziness, nausea, brain zaps). Always taper off gradually under doctor supervision." },
      { q: "Does escitalopram cause weight gain?", a: "Some people experience modest weight gain, but it's less common than with other antidepressants. Effects vary between individuals." },
    ],
  },
  // Infection
  {
    id: "amoxicillin",
    slug: "amoxicillin",
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    brandNames: ["Amoxil", "Alphamox"],
    category: "infection",
    simpleDescription: "A broad-spectrum antibiotic for various bacterial infections.",
    uses: ["Chest infections", "Ear infections", "Skin infections", "Dental infections"],
    dosages: ["250mg three times daily", "500mg three times daily"],
    sideEffects: ["Diarrhea", "Nausea", "Rash"],
    warnings: ["Complete full course", "May reduce effectiveness of contraceptive pill"],
    contraindications: ["Penicillin allergy", "Glandular fever"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "Can I take amoxicillin with alcohol?", a: "Moderate alcohol is unlikely to interfere, but it can worsen side effects like nausea. Best to avoid heavy drinking while fighting an infection." },
      { q: "Do I need to finish the whole course?", a: "Yes - always complete the full course even if you feel better. Stopping early can allow resistant bacteria to survive and the infection to return." },
      { q: "Does amoxicillin affect the contraceptive pill?", a: "Current evidence suggests amoxicillin doesn't reduce pill effectiveness. However, being unwell (vomiting, diarrhoea) can - use backup contraception if in doubt." },
    ],
  },
  {
    id: "azithromycin",
    slug: "azithromycin",
    name: "Azithromycin",
    genericName: "Azithromycin",
    brandNames: ["Zithromax"],
    category: "infection",
    simpleDescription: "An antibiotic for respiratory and skin infections. Short course treatment.",
    uses: ["Chest infections", "Skin infections", "Chlamydia", "Traveller's diarrhea"],
    dosages: ["500mg day 1, then 250mg days 2-5", "1g single dose (chlamydia)"],
    sideEffects: ["Nausea", "Diarrhea", "Stomach pain"],
    warnings: ["Complete full course", "May cause heart rhythm changes in susceptible people"],
    contraindications: ["Macrolide allergy", "Severe liver disease", "QT prolongation"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "Why is azithromycin taken for only 5 days?", a: "Azithromycin stays active in your body for several days after the last dose. The 5-day course provides effective treatment equivalent to longer courses of other antibiotics." },
      { q: "Can I take azithromycin on an empty stomach?", a: "Yes - azithromycin can be taken with or without food. If you experience stomach upset, taking it with food may help." },
      { q: "Is a single dose of azithromycin enough for chlamydia?", a: "Yes - a single 1g dose is the standard treatment for uncomplicated chlamydia. You should avoid sexual contact for 7 days after treatment." },
    ],
  },
  // Chronic
  {
    id: "omeprazole",
    slug: "omeprazole",
    name: "Omeprazole",
    genericName: "Omeprazole",
    brandNames: ["Losec", "Acimax"],
    category: "chronic",
    simpleDescription: "A proton pump inhibitor (PPI) for heartburn, reflux, and stomach ulcers.",
    uses: ["Heartburn", "Acid reflux (GORD)", "Stomach ulcers", "H. pylori treatment"],
    dosages: ["10mg daily", "20mg daily", "40mg daily"],
    sideEffects: ["Headache", "Nausea", "Diarrhea", "Stomach pain"],
    warnings: ["Long-term use may affect vitamin absorption", "Take before breakfast"],
    contraindications: ["None significant for short-term use"],
    price: 39,
    requiresCall: false,
    popular: true,
    faqs: [
      { q: "Can I take omeprazole long-term?", a: "Short-term use (2–8 weeks) is generally safe. Long-term use may affect calcium and magnesium absorption. Discuss with your doctor if you've been on it for months." },
      { q: "When should I take omeprazole?", a: "Take 30 minutes before breakfast on an empty stomach. This gives it time to block acid production before you eat." },
      { q: "Can I stop omeprazole suddenly?", a: "Stopping suddenly after long-term use can cause rebound acid production. If you've been on it for weeks, your doctor may recommend tapering off gradually." },
    ],
  },
  {
    id: "metformin",
    slug: "metformin",
    name: "Metformin",
    genericName: "Metformin",
    brandNames: ["Glucophage", "Diabex"],
    category: "chronic",
    simpleDescription: "First-line medication for type 2 diabetes. Helps control blood sugar levels.",
    uses: ["Type 2 diabetes", "Pre-diabetes", "PCOS (off-label)"],
    dosages: ["500mg twice daily", "850mg twice daily", "1000mg twice daily"],
    sideEffects: ["Nausea", "Diarrhea", "Stomach upset", "Metallic taste"],
    warnings: ["Take with food", "Stop before contrast scans", "Monitor kidney function"],
    contraindications: ["Severe kidney disease", "Acute heart failure", "Severe liver disease"],
    price: 49,
    requiresCall: true,
    popular: true,
    faqs: [
      { q: "Why does metformin cause stomach upset?", a: "Metformin can irritate the gut lining. Starting with a low dose, taking it with food, and using the extended-release (XR) form all help reduce this." },
      { q: "Do I need blood tests while taking metformin?", a: "Yes - your doctor should check kidney function and HbA1c regularly. Your prescribing doctor will advise on the frequency." },
      { q: "Can metformin help with weight loss?", a: "Metformin is weight-neutral or may cause modest weight loss in some people. It's prescribed for blood sugar control, not weight management." },
    ],
  },
]

/**
 * Get all available medication categories
 */
export function getAllCategories(): MedicationCategory[] {
  return Object.keys(CATEGORY_LABELS) as MedicationCategory[]
}

/**
 * Get medications by category
 */
export function getMedicationsByCategory(category: MedicationCategory): Medication[] {
  return MEDICATIONS.filter((med) => med.category === category)
}

/**
 * Get popular medications (for homepage display)
 */
export function getPopularMedications(): Medication[] {
  return MEDICATIONS.filter((med) => med.popular)
}

/**
 * Search medications by name, brand name, or uses
 */
export function searchMedications(query: string): Medication[] {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return []

  return MEDICATIONS.filter((med) => {
    const searchable = [
      med.name,
      med.genericName,
      ...med.brandNames,
      ...med.uses,
      med.simpleDescription,
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(normalizedQuery)
  })
}

/**
 * Get a single medication by slug
 */
export function getMedicationBySlug(slug: string): Medication | undefined {
  return MEDICATIONS.find((med) => med.slug === slug)
}

/**
 * Get all medications
 */
export function getAllMedications(): Medication[] {
  return MEDICATIONS
}
