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
