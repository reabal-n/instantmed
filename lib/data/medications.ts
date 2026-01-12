/**
 * Medication data for SEO landing pages
 * Note: This is reference information only - not used for prescribing decisions
 * All prescribing happens outside platform in clinician's system
 */

export type MedicationCategory = 
  | "blood_pressure"
  | "cholesterol"
  | "diabetes"
  | "contraception"
  | "acid_reflux"
  | "mental_health"
  | "pain_relief"
  | "skin"
  | "allergy"
  | "other"

export const CATEGORY_LABELS: Record<MedicationCategory, string> = {
  blood_pressure: "Blood Pressure",
  cholesterol: "Cholesterol",
  diabetes: "Diabetes",
  contraception: "Contraception",
  acid_reflux: "Acid Reflux",
  mental_health: "Mental Health",
  pain_relief: "Pain Relief",
  skin: "Skin Conditions",
  allergy: "Allergy",
  other: "Other",
}

export const CATEGORY_ICONS: Record<MedicationCategory, string> = {
  blood_pressure: "❤️",
  cholesterol: "🫀",
  diabetes: "💉",
  contraception: "💊",
  acid_reflux: "🔥",
  mental_health: "🧠",
  pain_relief: "💪",
  skin: "✨",
  allergy: "🌸",
  other: "📋",
}

export interface Medication {
  id: string // alias for slug, used in some components
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
  requiresConsult: boolean
  requiresCall?: boolean // alias for requiresConsult
}

/**
 * Common medications for SEO landing pages
 * This data is for informational purposes only
 */
export const MEDICATIONS: Medication[] = [
  {
    id: "omeprazole",
    slug: "omeprazole",
    name: "Omeprazole",
    genericName: "Omeprazole",
    brandNames: ["Losec", "Acimax", "Maxor"],
    category: "acid_reflux",
    simpleDescription: "A proton pump inhibitor that reduces stomach acid production. Used for heartburn, reflux, and ulcers.",
    uses: [
      "Gastroesophageal reflux disease (GORD)",
      "Peptic ulcers",
      "Heartburn and acid indigestion",
      "Helicobacter pylori eradication (with antibiotics)",
    ],
    dosages: ["10mg daily", "20mg daily", "40mg daily"],
    sideEffects: [
      "Headache",
      "Nausea or stomach pain",
      "Diarrhea or constipation",
      "Flatulence",
    ],
    warnings: [
      "Long-term use may increase risk of bone fractures",
      "May reduce magnesium levels with prolonged use",
      "Can interact with some medications including clopidogrel",
    ],
    contraindications: [
      "Known allergy to omeprazole or other PPIs",
      "Taking rilpivirine-containing HIV medications",
    ],
    price: 19.95,
    requiresConsult: false,
  },
  {
    id: "rosuvastatin",
    slug: "rosuvastatin",
    name: "Rosuvastatin",
    genericName: "Rosuvastatin",
    brandNames: ["Crestor", "Rostor"],
    category: "cholesterol",
    simpleDescription: "A statin medication that lowers cholesterol and reduces cardiovascular risk.",
    uses: [
      "High cholesterol (hypercholesterolemia)",
      "Prevention of cardiovascular disease",
      "Mixed dyslipidemia",
    ],
    dosages: ["5mg daily", "10mg daily", "20mg daily", "40mg daily"],
    sideEffects: [
      "Muscle pain or weakness",
      "Headache",
      "Nausea",
      "Abdominal pain",
    ],
    warnings: [
      "Report unexplained muscle pain immediately",
      "Regular liver function monitoring may be required",
      "Avoid grapefruit juice in large quantities",
    ],
    contraindications: [
      "Active liver disease",
      "Pregnancy or breastfeeding",
      "Severe kidney impairment (for higher doses)",
    ],
    price: 19.95,
    requiresConsult: false,
  },
  {
    id: "metformin",
    slug: "metformin",
    name: "Metformin",
    genericName: "Metformin hydrochloride",
    brandNames: ["Diabex", "Glucophage", "Diaformin"],
    category: "diabetes",
    simpleDescription: "First-line medication for type 2 diabetes that helps control blood sugar levels.",
    uses: [
      "Type 2 diabetes mellitus",
      "Polycystic ovary syndrome (off-label)",
      "Prediabetes management",
    ],
    dosages: ["500mg twice daily", "850mg twice daily", "1000mg twice daily"],
    sideEffects: [
      "Nausea or stomach upset",
      "Diarrhea",
      "Metallic taste",
      "Decreased appetite",
    ],
    warnings: [
      "Stop before surgery or procedures with contrast dye",
      "Avoid excessive alcohol consumption",
      "Monitor kidney function regularly",
    ],
    contraindications: [
      "Severe kidney disease (eGFR < 30)",
      "Metabolic acidosis",
      "Acute conditions that may affect kidney function",
    ],
    price: 19.95,
    requiresConsult: false,
  },
  {
    id: "levonorgestrel-ethinylestradiol",
    slug: "levonorgestrel-ethinylestradiol",
    name: "Combined Oral Contraceptive",
    genericName: "Levonorgestrel/Ethinylestradiol",
    brandNames: ["Levlen ED", "Microgynon", "Monofeme"],
    category: "contraception",
    simpleDescription: "Combined hormonal contraceptive pill for pregnancy prevention.",
    uses: [
      "Contraception",
      "Regulation of menstrual cycle",
      "Treatment of heavy or painful periods",
      "Management of endometriosis symptoms",
    ],
    dosages: ["30mcg ethinylestradiol / 150mcg levonorgestrel"],
    sideEffects: [
      "Nausea",
      "Breast tenderness",
      "Headaches",
      "Mood changes",
      "Breakthrough bleeding",
    ],
    warnings: [
      "Slightly increased risk of blood clots",
      "Does not protect against STIs",
      "Effectiveness reduced by some medications",
    ],
    contraindications: [
      "History of blood clots or stroke",
      "Migraine with aura",
      "Uncontrolled high blood pressure",
      "Smokers over 35 years old",
      "Breast cancer",
    ],
    price: 29.95,
    requiresConsult: true,
  },
  {
    id: "cetirizine",
    slug: "cetirizine",
    name: "Cetirizine",
    genericName: "Cetirizine hydrochloride",
    brandNames: ["Zyrtec", "Alzene", "Zilarex"],
    category: "allergy",
    simpleDescription: "Non-drowsy antihistamine for allergy relief including hay fever and hives.",
    uses: [
      "Hay fever (allergic rhinitis)",
      "Hives (urticaria)",
      "Allergic skin conditions",
      "Itchy, watery eyes",
    ],
    dosages: ["10mg once daily"],
    sideEffects: [
      "Drowsiness (less common than older antihistamines)",
      "Dry mouth",
      "Headache",
      "Fatigue",
    ],
    warnings: [
      "May cause drowsiness in some people",
      "Use caution when driving until you know how it affects you",
      "Avoid alcohol",
    ],
    contraindications: [
      "Severe kidney disease",
      "Known allergy to cetirizine or hydroxyzine",
    ],
    price: 19.95,
    requiresConsult: false,
  },
  {
    id: "escitalopram",
    slug: "escitalopram",
    name: "Escitalopram",
    genericName: "Escitalopram oxalate",
    brandNames: ["Lexapro", "Esipram", "Loxalate"],
    category: "mental_health",
    simpleDescription: "An SSRI antidepressant used for depression and anxiety disorders.",
    uses: [
      "Major depressive disorder",
      "Generalised anxiety disorder",
      "Social anxiety disorder",
      "Panic disorder",
    ],
    dosages: ["5mg daily", "10mg daily", "20mg daily"],
    sideEffects: [
      "Nausea",
      "Headache",
      "Sleep disturbances",
      "Sexual dysfunction",
      "Dry mouth",
    ],
    warnings: [
      "May increase suicidal thoughts initially in young adults",
      "Do not stop suddenly - taper gradually",
      "May take 2-4 weeks for full effect",
    ],
    contraindications: [
      "Use with MAO inhibitors",
      "Use with pimozide",
      "Known QT prolongation",
    ],
    price: 29.95,
    requiresConsult: true,
  },
]

/**
 * Get a medication by its URL slug
 */
export function getMedicationBySlug(slug: string): Medication | undefined {
  return MEDICATIONS.find((med) => med.slug === slug)
}

/**
 * Get all medications in a category
 */
export function getMedicationsByCategory(category: MedicationCategory): Medication[] {
  return MEDICATIONS.filter((med) => med.category === category)
}

/**
 * Get all medication slugs for static generation
 */
export function getAllMedicationSlugs(): string[] {
  return MEDICATIONS.map((med) => med.slug)
}

/**
 * Get all unique categories that have medications
 */
export function getAllCategories(): MedicationCategory[] {
  const categories = new Set(MEDICATIONS.map((med) => med.category))
  return Array.from(categories)
}

/**
 * Get popular/featured medications for display
 */
export function getPopularMedications(limit: number = 6): Medication[] {
  return MEDICATIONS.slice(0, limit)
}

/**
 * Search medications by name, brand name, or generic name
 */
export function searchMedications(query: string): Medication[] {
  if (!query || query.length < 2) return []
  
  const lowerQuery = query.toLowerCase()
  return MEDICATIONS.filter((med) => 
    med.name.toLowerCase().includes(lowerQuery) ||
    med.genericName.toLowerCase().includes(lowerQuery) ||
    med.brandNames.some((brand) => brand.toLowerCase().includes(lowerQuery)) ||
    med.simpleDescription.toLowerCase().includes(lowerQuery)
  )
}
