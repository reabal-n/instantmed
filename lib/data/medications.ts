/**
 * Australian Medication Database
 * Common medications available in Australia with PBS listings
 */

export interface Medication {
  id: string
  name: string // Generic name
  brandNames: string[] // Common brand names
  strengths: string[] // Available strengths
  category: MedicationCategory
  commonUses: string[]
  requiresCall: boolean // Whether a phone consult is required
  schedule: number // 2, 3, 4, or 8 (controlled substances)
  notes?: string
  searchTerms: string[] // Additional search terms
}

export type MedicationCategory =
  | "cardiovascular"
  | "diabetes"
  | "mental-health"
  | "pain-relief"
  | "antibiotics"
  | "thyroid"
  | "gastrointestinal"
  | "respiratory"
  | "contraception"
  | "cholesterol"
  | "blood-pressure"
  | "allergy"
  | "skin"
  | "other"

export const AUSTRALIAN_MEDICATIONS: Medication[] = [
  // === CARDIOVASCULAR & CHOLESTEROL ===
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    brandNames: ["Lipitor", "Atorva", "Atostin"],
    strengths: ["10mg", "20mg", "40mg", "80mg"],
    category: "cholesterol",
    commonUses: ["High cholesterol", "Heart disease prevention"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["statin", "cholesterol", "lipitor"],
  },
  {
    id: "rosuvastatin",
    name: "Rosuvastatin",
    brandNames: ["Crestor", "Rosuva"],
    strengths: ["5mg", "10mg", "20mg", "40mg"],
    category: "cholesterol",
    commonUses: ["High cholesterol", "Cardiovascular disease prevention"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["statin", "cholesterol", "crestor"],
  },
  {
    id: "perindopril",
    name: "Perindopril",
    brandNames: ["Coversyl", "Perindo"],
    strengths: ["2.5mg", "5mg", "10mg"],
    category: "blood-pressure",
    commonUses: ["High blood pressure", "Heart failure"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["ace inhibitor", "blood pressure", "coversyl"],
  },
  {
    id: "irbesartan",
    name: "Irbesartan",
    brandNames: ["Avapro", "Karvea"],
    strengths: ["75mg", "150mg", "300mg"],
    category: "blood-pressure",
    commonUses: ["High blood pressure", "Diabetic kidney disease"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["arb", "blood pressure", "avapro"],
  },
  {
    id: "amlodipine",
    name: "Amlodipine",
    brandNames: ["Norvasc", "Amlosafe"],
    strengths: ["5mg", "10mg"],
    category: "blood-pressure",
    commonUses: ["High blood pressure", "Angina"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["calcium channel blocker", "blood pressure", "norvasc"],
  },

  // === DIABETES ===
  {
    id: "metformin",
    name: "Metformin",
    brandNames: ["Diabex", "Diaformin", "Glucophage"],
    strengths: ["500mg", "850mg", "1000mg", "XR 500mg", "XR 1000mg"],
    category: "diabetes",
    commonUses: ["Type 2 diabetes", "PCOS", "Prediabetes"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["diabetes", "sugar", "diabex", "glucophage"],
  },
  {
    id: "gliclazide",
    name: "Gliclazide",
    brandNames: ["Diamicron", "Glyade"],
    strengths: ["30mg", "60mg", "80mg", "MR 30mg", "MR 60mg"],
    category: "diabetes",
    commonUses: ["Type 2 diabetes"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["diabetes", "sugar", "diamicron"],
  },

  // === THYROID ===
  {
    id: "levothyroxine",
    name: "Levothyroxine",
    brandNames: ["Oroxine", "Eltroxin", "Eutroxsig"],
    strengths: ["25mcg", "50mcg", "75mcg", "100mcg", "125mcg", "150mcg", "200mcg"],
    category: "thyroid",
    commonUses: ["Hypothyroidism", "Thyroid hormone replacement"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["thyroid", "underactive thyroid", "oroxine", "eltroxin"],
  },

  // === RESPIRATORY ===
  {
    id: "salbutamol",
    name: "Salbutamol",
    brandNames: ["Ventolin", "Asmol", "Salamol"],
    strengths: ["100mcg inhaler", "200mcg inhaler"],
    category: "respiratory",
    commonUses: ["Asthma", "COPD", "Bronchospasm"],
    requiresCall: false,
    schedule: 3,
    searchTerms: ["asthma", "inhaler", "ventolin", "puffer"],
  },
  {
    id: "fluticasone-salmeterol",
    name: "Fluticasone/Salmeterol",
    brandNames: ["Seretide", "Flutiform"],
    strengths: ["25/125", "25/250", "25/500"],
    category: "respiratory",
    commonUses: ["Asthma", "COPD prevention"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["asthma", "preventer", "seretide"],
  },

  // === GASTROINTESTINAL ===
  {
    id: "esomeprazole",
    name: "Esomeprazole",
    brandNames: ["Nexium", "Esopral"],
    strengths: ["20mg", "40mg"],
    category: "gastrointestinal",
    commonUses: ["GERD", "Reflux", "Stomach ulcers", "Heartburn"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["reflux", "heartburn", "nexium", "ppi"],
  },
  {
    id: "pantoprazole",
    name: "Pantoprazole",
    brandNames: ["Somac", "Pantoloc"],
    strengths: ["20mg", "40mg"],
    category: "gastrointestinal",
    commonUses: ["GERD", "Reflux", "Stomach ulcers"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["reflux", "heartburn", "somac", "ppi"],
  },

  // === MENTAL HEALTH ===
  {
    id: "sertraline",
    name: "Sertraline",
    brandNames: ["Zoloft", "Xydep", "Sertra"],
    strengths: ["50mg", "100mg"],
    category: "mental-health",
    commonUses: ["Depression", "Anxiety", "OCD", "PTSD"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires mental health assessment",
    searchTerms: ["depression", "anxiety", "ssri", "zoloft", "antidepressant"],
  },
  {
    id: "escitalopram",
    name: "Escitalopram",
    brandNames: ["Lexapro", "Esipram"],
    strengths: ["10mg", "20mg"],
    category: "mental-health",
    commonUses: ["Depression", "Anxiety", "GAD"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires mental health assessment",
    searchTerms: ["depression", "anxiety", "ssri", "lexapro", "antidepressant"],
  },
  {
    id: "venlafaxine",
    name: "Venlafaxine",
    brandNames: ["Efexor", "Enlafax"],
    strengths: ["37.5mg", "75mg", "150mg", "XR 75mg", "XR 150mg"],
    category: "mental-health",
    commonUses: ["Depression", "Anxiety", "GAD"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires mental health assessment",
    searchTerms: ["depression", "anxiety", "snri", "efexor", "antidepressant"],
  },

  // === ANTIBIOTICS ===
  {
    id: "amoxicillin",
    name: "Amoxicillin",
    brandNames: ["Amoxil", "Moxacin"],
    strengths: ["250mg", "500mg"],
    category: "antibiotics",
    commonUses: ["Bacterial infections", "UTI", "Respiratory infections"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires clinical assessment",
    searchTerms: ["antibiotic", "infection", "amoxil"],
  },
  {
    id: "cephalexin",
    name: "Cephalexin",
    brandNames: ["Keflex", "Cefalexin"],
    strengths: ["250mg", "500mg"],
    category: "antibiotics",
    commonUses: ["Skin infections", "UTI", "Respiratory infections"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires clinical assessment",
    searchTerms: ["antibiotic", "infection", "keflex"],
  },

  // === CONTRACEPTION ===
  {
    id: "levonorgestrel-ethinylestradiol",
    name: "Levonorgestrel/Ethinylestradiol",
    brandNames: ["Microgynon", "Levlen", "Monofeme"],
    strengths: ["150/30mcg"],
    category: "contraception",
    commonUses: ["Contraception", "Period regulation"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["pill", "contraceptive", "birth control", "microgynon", "levlen"],
  },

  // === PAIN RELIEF ===
  {
    id: "paracetamol-codeine",
    name: "Paracetamol/Codeine",
    brandNames: ["Panadeine Forte", "Panamax Co"],
    strengths: ["500/30mg"],
    category: "pain-relief",
    commonUses: ["Moderate to severe pain"],
    requiresCall: true,
    schedule: 4,
    notes: "Short-term use only",
    searchTerms: ["pain", "panadeine forte", "codeine"],
  },

  // === MEN'S HEALTH ===
  {
    id: "sildenafil",
    name: "Sildenafil",
    brandNames: ["Viagra", "Silvasta"],
    strengths: ["25mg", "50mg", "100mg"],
    category: "other",
    commonUses: ["Erectile dysfunction"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["ed", "erectile dysfunction", "viagra", "mens health"],
  },
  {
    id: "tadalafil",
    name: "Tadalafil",
    brandNames: ["Cialis", "Tadacip"],
    strengths: ["5mg", "10mg", "20mg"],
    category: "other",
    commonUses: ["Erectile dysfunction", "BPH"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["ed", "erectile dysfunction", "cialis", "mens health"],
  },
  {
    id: "finasteride",
    name: "Finasteride",
    brandNames: ["Propecia", "Proscar"],
    strengths: ["1mg", "5mg"],
    category: "other",
    commonUses: ["Hair loss", "Male pattern baldness", "BPH"],
    requiresCall: false,
    schedule: 4,
    searchTerms: ["hair loss", "baldness", "propecia"],
  },

  // === ALLERGY ===
  {
    id: "cetirizine",
    name: "Cetirizine",
    brandNames: ["Zyrtec", "Zetop"],
    strengths: ["10mg"],
    category: "allergy",
    commonUses: ["Allergies", "Hay fever", "Hives"],
    requiresCall: false,
    schedule: 2,
    searchTerms: ["allergy", "hay fever", "zyrtec", "antihistamine"],
  },
  {
    id: "fexofenadine",
    name: "Fexofenadine",
    brandNames: ["Telfast", "Fexotab"],
    strengths: ["60mg", "120mg", "180mg"],
    category: "allergy",
    commonUses: ["Allergies", "Hay fever"],
    requiresCall: false,
    schedule: 2,
    searchTerms: ["allergy", "hay fever", "telfast", "antihistamine"],
  },

  // === SKIN CONDITIONS ===
  {
    id: "tretinoin",
    name: "Tretinoin",
    brandNames: ["Retin-A", "Retrieve"],
    strengths: ["0.025%", "0.05%", "0.1%"],
    category: "skin",
    commonUses: ["Acne", "Anti-aging", "Skin texture"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires skin assessment",
    searchTerms: ["acne", "retinoid", "retin-a", "wrinkles"],
  },
  {
    id: "adapalene",
    name: "Adapalene",
    brandNames: ["Differin"],
    strengths: ["0.1%"],
    category: "skin",
    commonUses: ["Acne"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires skin assessment",
    searchTerms: ["acne", "retinoid", "differin"],
  },

  // === WOMEN'S HEALTH ===
  {
    id: "nitrofurantoin",
    name: "Nitrofurantoin",
    brandNames: ["Macrobid", "Macrodantin"],
    strengths: ["50mg", "100mg"],
    category: "antibiotics",
    commonUses: ["UTI", "Urinary tract infections"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires assessment",
    searchTerms: ["uti", "urinary", "cystitis", "macrobid"],
  },
  {
    id: "trimethoprim",
    name: "Trimethoprim",
    brandNames: ["Triprim", "Alprim"],
    strengths: ["150mg", "300mg"],
    category: "antibiotics",
    commonUses: ["UTI", "Urinary tract infections"],
    requiresCall: true,
    schedule: 4,
    notes: "Requires assessment",
    searchTerms: ["uti", "urinary", "cystitis"],
  },

  // Add more medications as needed...
]

/**
 * Search medications by name, brand, or search terms
 */
export function searchMedications(query: string): Medication[] {
  if (!query || query.length < 2) {
    return []
  }

  const lowerQuery = query.toLowerCase().trim()

  return AUSTRALIAN_MEDICATIONS.filter((med) => {
    // Search in generic name
    if (med.name.toLowerCase().includes(lowerQuery)) return true

    // Search in brand names
    if (med.brandNames.some((brand) => brand.toLowerCase().includes(lowerQuery))) return true

    // Search in search terms
    if (med.searchTerms.some((term) => term.toLowerCase().includes(lowerQuery))) return true

    // Search in common uses
    if (med.commonUses.some((use) => use.toLowerCase().includes(lowerQuery))) return true

    return false
  }).slice(0, 10) // Return top 10 results
}

/**
 * Get medication by ID
 */
export function getMedicationById(id: string): Medication | undefined {
  return AUSTRALIAN_MEDICATIONS.find((med) => med.id === id)
}

/**
 * Get medications by category
 */
export function getMedicationsByCategory(category: MedicationCategory): Medication[] {
  return AUSTRALIAN_MEDICATIONS.filter((med) => med.category === category)
}

/**
 * Check if medication is controlled (Schedule 8)
 */
export function isControlledMedication(medicationId: string): boolean {
  const med = getMedicationById(medicationId)
  return med?.schedule === 8
}

/**
 * Get medication by slug (slug is the id)
 */
export function getMedicationBySlug(slug: string): Medication | undefined {
  return getMedicationById(slug)
}

/**
 * Get all unique categories
 */
export function getAllCategories(): MedicationCategory[] {
  const categories = new Set<MedicationCategory>()
  AUSTRALIAN_MEDICATIONS.forEach((med) => {
    categories.add(med.category)
  })
  return Array.from(categories)
}

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<MedicationCategory, string> = {
  cardiovascular: "Cardiovascular",
  diabetes: "Diabetes",
  "mental-health": "Mental Health",
  "pain-relief": "Pain Relief",
  antibiotics: "Antibiotics",
  thyroid: "Thyroid",
  gastrointestinal: "Gastrointestinal",
  respiratory: "Respiratory",
  contraception: "Contraception",
  cholesterol: "Cholesterol",
  "blood-pressure": "Blood Pressure",
  allergy: "Allergy",
  skin: "Skin Conditions",
  other: "Other",
}

/**
 * Category icons (using emoji for simplicity)
 */
export const CATEGORY_ICONS: Record<MedicationCategory, string> = {
  cardiovascular: "❤️",
  diabetes: "🩺",
  "mental-health": "🧠",
  "pain-relief": "💊",
  antibiotics: "🦠",
  thyroid: "🦋",
  gastrointestinal: "🤢",
  respiratory: "🫁",
  contraception: "💕",
  cholesterol: "🩸",
  "blood-pressure": "📊",
  allergy: "🤧",
  skin: "✨",
  other: "📦",
}
