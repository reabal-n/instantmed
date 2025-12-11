// Comprehensive medication database for the prescription flow
export interface Medication {
  slug: string
  name: string
  brandNames: string[]
  genericName: string
  category: MedicationCategory
  description: string
  simpleDescription: string // "What it does" in plain English
  uses: string[]
  dosages: string[]
  sideEffects: string[]
  contraindications: string[] // "Who it's NOT for" in plain English
  warnings: string[]
  schedule: "S2" | "S3" | "S4" | "S8"
  prescribable: boolean
  price: number
  popular: boolean
  searchTerms: string[]
}

export type MedicationCategory =
  | "blood-pressure"
  | "cholesterol"
  | "diabetes"
  | "skin"
  | "womens-health"
  | "mens-health"
  | "weight-loss"
  | "mental-health"
  | "antibiotics"
  | "pain-relief"
  | "respiratory"
  | "other"

export const CATEGORY_LABELS: Record<MedicationCategory, string> = {
  "blood-pressure": "Blood Pressure",
  cholesterol: "Cholesterol",
  diabetes: "Diabetes",
  skin: "Skin",
  "womens-health": "Women's Health",
  "mens-health": "Men's Health",
  "weight-loss": "Weight Loss",
  "mental-health": "Mental Health",
  antibiotics: "Antibiotics",
  "pain-relief": "Pain Relief",
  respiratory: "Respiratory",
  other: "Other",
}

export const CATEGORY_ICONS: Record<MedicationCategory, string> = {
  "blood-pressure": "❤️",
  cholesterol: "🫀",
  diabetes: "💉",
  skin: "✨",
  "womens-health": "♀️",
  "mens-health": "♂️",
  "weight-loss": "⚖️",
  "mental-health": "🧠",
  antibiotics: "💊",
  "pain-relief": "🩹",
  respiratory: "🫁",
  other: "💊",
}

// Top 30 most requested medications in Australian telehealth
export const MEDICATIONS: Medication[] = [
  // Blood Pressure
  {
    slug: "amlodipine",
    name: "Amlodipine",
    brandNames: ["Norvasc", "Amlovask"],
    genericName: "Amlodipine Besylate",
    category: "blood-pressure",
    description: "Calcium channel blocker used to treat high blood pressure and chest pain.",
    simpleDescription: "Relaxes blood vessels to lower your blood pressure. The go-to for many Aussies.",
    uses: ["High blood pressure", "Angina (chest pain)", "Coronary artery disease"],
    dosages: ["5mg once daily", "10mg once daily"],
    sideEffects: ["Swollen ankles", "Flushing", "Headache", "Dizziness"],
    contraindications: ["Severe aortic stenosis", "Unstable angina", "Cardiogenic shock"],
    warnings: ["May cause ankle swelling", "Grapefruit can increase side effects"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["norvasc", "blood pressure", "bp", "hypertension"],
  },
  {
    slug: "ramipril",
    name: "Ramipril",
    brandNames: ["Tritace", "Ramace"],
    genericName: "Ramipril",
    category: "blood-pressure",
    description: "ACE inhibitor for blood pressure and heart protection.",
    simpleDescription: "Protects your heart and kidneys while keeping blood pressure down.",
    uses: ["High blood pressure", "Heart failure", "Post heart attack", "Diabetic kidney protection"],
    dosages: ["2.5mg once daily", "5mg once daily", "10mg once daily"],
    sideEffects: ["Dry cough", "Dizziness", "Fatigue", "High potassium"],
    contraindications: ["Pregnancy", "History of angioedema", "Bilateral renal artery stenosis"],
    warnings: ["Can cause persistent dry cough", "Avoid if pregnant or planning pregnancy"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["tritace", "ace inhibitor", "blood pressure", "heart"],
  },
  {
    slug: "perindopril",
    name: "Perindopril",
    brandNames: ["Coversyl", "Perindo"],
    genericName: "Perindopril Erbumine",
    category: "blood-pressure",
    description: "ACE inhibitor for blood pressure with excellent heart protection.",
    simpleDescription: "Another ACE inhibitor, often causes less cough than ramipril.",
    uses: ["High blood pressure", "Heart failure", "Coronary artery disease"],
    dosages: ["4mg once daily", "8mg once daily"],
    sideEffects: ["Cough", "Dizziness", "Headache"],
    contraindications: ["Pregnancy", "Angioedema history"],
    warnings: ["Stop if you develop swelling of face/lips/tongue"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: false,
    searchTerms: ["coversyl", "ace inhibitor", "bp"],
  },

  // Cholesterol
  {
    slug: "atorvastatin",
    name: "Atorvastatin",
    brandNames: ["Lipitor"],
    genericName: "Atorvastatin Calcium",
    category: "cholesterol",
    description: "Statin medication to lower cholesterol and reduce heart disease risk.",
    simpleDescription: "Australia's most prescribed cholesterol medication. Lowers the bad stuff.",
    uses: ["High cholesterol", "Heart disease prevention", "Post heart attack"],
    dosages: ["10mg once daily", "20mg once daily", "40mg once daily", "80mg once daily"],
    sideEffects: ["Muscle aches", "Digestive issues", "Headache"],
    contraindications: ["Active liver disease", "Pregnancy", "Breastfeeding"],
    warnings: ["Report unexplained muscle pain", "Avoid grapefruit juice"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["lipitor", "cholesterol", "statin", "heart"],
  },
  {
    slug: "rosuvastatin",
    name: "Rosuvastatin",
    brandNames: ["Crestor"],
    genericName: "Rosuvastatin Calcium",
    category: "cholesterol",
    description: "Powerful statin for cholesterol management.",
    simpleDescription: "The strongest statin available. Great if atorvastatin isn't doing enough.",
    uses: ["High cholesterol", "Cardiovascular prevention"],
    dosages: ["5mg once daily", "10mg once daily", "20mg once daily"],
    sideEffects: ["Muscle pain", "Headache", "Abdominal pain"],
    contraindications: ["Liver disease", "Pregnancy"],
    warnings: ["Lower starting dose for Asian patients"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["crestor", "cholesterol", "statin"],
  },

  // Diabetes
  {
    slug: "metformin",
    name: "Metformin",
    brandNames: ["Glucophage", "Diabex", "Diaformin"],
    genericName: "Metformin Hydrochloride",
    category: "diabetes",
    description: "First-line medication for type 2 diabetes.",
    simpleDescription: "Helps your body use insulin better. The starting point for most type 2 diabetics.",
    uses: ["Type 2 diabetes", "PCOS", "Insulin resistance"],
    dosages: ["500mg twice daily", "850mg twice daily", "1000mg twice daily"],
    sideEffects: ["Nausea", "Diarrhea", "Stomach upset", "Vitamin B12 deficiency"],
    contraindications: ["Severe kidney disease", "Metabolic acidosis"],
    warnings: ["Stop before CT scans with contrast", "Avoid excessive alcohol"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["glucophage", "diabex", "diabetes", "blood sugar", "pcos"],
  },
  {
    slug: "gliclazide",
    name: "Gliclazide",
    brandNames: ["Diamicron", "Glyade"],
    genericName: "Gliclazide",
    category: "diabetes",
    description: "Sulfonylurea that stimulates insulin release.",
    simpleDescription: "Makes your pancreas produce more insulin. Often added when metformin alone isn't enough.",
    uses: ["Type 2 diabetes"],
    dosages: ["40mg once daily", "80mg once daily", "Modified release 30-120mg"],
    sideEffects: ["Low blood sugar", "Weight gain", "Nausea"],
    contraindications: ["Type 1 diabetes", "Severe liver/kidney disease"],
    warnings: ["Can cause hypos - know the symptoms", "Carry glucose tablets"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: false,
    searchTerms: ["diamicron", "diabetes", "sulfonylurea"],
  },

  // Women's Health
  {
    slug: "levonorgestrel-ethinylestradiol",
    name: "Levlen ED",
    brandNames: ["Levlen ED", "Microgynon", "Monofeme"],
    genericName: "Levonorgestrel/Ethinylestradiol",
    category: "womens-health",
    description: "Combined oral contraceptive pill.",
    simpleDescription: "The classic 'pill'. Prevents pregnancy and can help with periods too.",
    uses: ["Contraception", "Period regulation", "Acne", "Endometriosis"],
    dosages: ["One tablet daily for 21 days, 7 day break"],
    sideEffects: ["Nausea", "Breast tenderness", "Mood changes", "Spotting"],
    contraindications: ["History of blood clots", "Migraine with aura", "Smokers over 35"],
    warnings: ["Increased clot risk", "Tell doctor if you get migraines"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["pill", "contraceptive", "birth control", "levlen", "microgynon"],
  },
  {
    slug: "norethisterone",
    name: "Norethisterone",
    brandNames: ["Primolut N"],
    genericName: "Norethisterone",
    category: "womens-health",
    description: "Progestogen used to delay or regulate periods.",
    simpleDescription: "Need to delay your period for a holiday or event? This is what you need.",
    uses: ["Period delay", "Heavy periods", "Endometriosis", "Abnormal bleeding"],
    dosages: ["5mg three times daily"],
    sideEffects: ["Nausea", "Headache", "Breast tenderness", "Bloating"],
    contraindications: ["Pregnancy", "Liver disease", "History of blood clots"],
    warnings: ["Not a contraceptive", "Period usually starts 2-3 days after stopping"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["primolut", "delay period", "heavy periods"],
  },
  {
    slug: "trimethoprim",
    name: "Trimethoprim",
    brandNames: ["Alprim", "Triprim"],
    genericName: "Trimethoprim",
    category: "womens-health",
    description: "Antibiotic commonly used for urinary tract infections.",
    simpleDescription: "The go-to for UTIs. Usually works within 24-48 hours.",
    uses: ["Urinary tract infections", "Cystitis"],
    dosages: ["300mg once daily for 3 days", "150mg twice daily for 3 days"],
    sideEffects: ["Nausea", "Rash", "Itching"],
    contraindications: ["Severe kidney disease", "Blood disorders", "Pregnancy (first trimester)"],
    warnings: ["Complete the full course", "Drink plenty of water"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["uti", "urinary infection", "cystitis", "burning pee"],
  },

  // Men's Health
  {
    slug: "sildenafil",
    name: "Sildenafil",
    brandNames: ["Viagra"],
    genericName: "Sildenafil Citrate",
    category: "mens-health",
    description: "PDE5 inhibitor for erectile dysfunction.",
    simpleDescription: "The original ED medication. Works in about 30 minutes, lasts 4-5 hours.",
    uses: ["Erectile dysfunction"],
    dosages: ["25mg as needed", "50mg as needed", "100mg as needed"],
    sideEffects: ["Headache", "Flushing", "Indigestion", "Nasal congestion", "Visual changes"],
    contraindications: ["Taking nitrates", "Severe heart disease", "Recent stroke"],
    warnings: ["Never take with nitrates", "Seek help for erections > 4 hours"],
    schedule: "S4",
    prescribable: true,
    price: 29.95,
    popular: true,
    searchTerms: ["viagra", "ed", "erectile dysfunction", "impotence"],
  },
  {
    slug: "tadalafil",
    name: "Tadalafil",
    brandNames: ["Cialis"],
    genericName: "Tadalafil",
    category: "mens-health",
    description: "Long-acting PDE5 inhibitor for ED.",
    simpleDescription: "The 'weekend pill'. Take Friday night, works until Sunday. Or daily for spontaneity.",
    uses: ["Erectile dysfunction", "Benign prostatic hyperplasia"],
    dosages: ["10mg as needed", "20mg as needed", "5mg daily"],
    sideEffects: ["Headache", "Back pain", "Muscle aches", "Flushing"],
    contraindications: ["Nitrates", "Severe heart disease"],
    warnings: ["Effects last up to 36 hours", "Don't combine with other ED meds"],
    schedule: "S4",
    prescribable: true,
    price: 29.95,
    popular: true,
    searchTerms: ["cialis", "ed", "erectile dysfunction", "weekend pill"],
  },
  {
    slug: "finasteride",
    name: "Finasteride",
    brandNames: ["Propecia", "Proscar"],
    genericName: "Finasteride",
    category: "mens-health",
    description: "5-alpha reductase inhibitor for hair loss and enlarged prostate.",
    simpleDescription: "Stops hair loss by blocking DHT. Takes 3-6 months to see results.",
    uses: ["Male pattern baldness", "Enlarged prostate (BPH)"],
    dosages: ["1mg daily for hair loss", "5mg daily for BPH"],
    sideEffects: ["Decreased libido", "Erectile dysfunction", "Decreased ejaculate"],
    contraindications: ["Women (especially pregnant)", "Children"],
    warnings: ["Can affect PSA test results", "Don't donate blood while taking"],
    schedule: "S4",
    prescribable: true,
    price: 29.95,
    popular: true,
    searchTerms: ["propecia", "proscar", "hair loss", "balding", "bph"],
  },

  // Weight Loss
  {
    slug: "orlistat",
    name: "Orlistat",
    brandNames: ["Xenical"],
    genericName: "Orlistat",
    category: "weight-loss",
    description: "Lipase inhibitor that reduces fat absorption.",
    simpleDescription: "Blocks about 30% of the fat you eat. Expect oily stools if you eat fatty food.",
    uses: ["Obesity", "Weight management"],
    dosages: ["120mg with each main meal"],
    sideEffects: ["Oily stools", "Flatulence", "Urgent bowel movements", "Vitamin deficiency"],
    contraindications: ["Cholestasis", "Malabsorption syndrome"],
    warnings: ["Take a multivitamin at bedtime", "Eat low-fat meals to avoid side effects"],
    schedule: "S4",
    prescribable: true,
    price: 34.95,
    popular: false,
    searchTerms: ["xenical", "weight loss", "fat blocker", "obesity"],
  },

  // Mental Health (non-MHCP)
  {
    slug: "sertraline",
    name: "Sertraline",
    brandNames: ["Zoloft"],
    genericName: "Sertraline Hydrochloride",
    category: "mental-health",
    description: "SSRI antidepressant for depression and anxiety.",
    simpleDescription: "One of the most prescribed antidepressants. Generally well-tolerated with few interactions.",
    uses: ["Depression", "Anxiety disorders", "OCD", "PTSD", "Panic disorder"],
    dosages: ["50mg once daily", "100mg once daily", "Up to 200mg daily"],
    sideEffects: ["Nausea", "Insomnia", "Diarrhea", "Sexual dysfunction", "Drowsiness"],
    contraindications: ["MAOIs", "Pimozide", "Disulfiram (liquid form)"],
    warnings: ["Takes 2-4 weeks to work", "Don't stop suddenly", "Monitor for worsening mood"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["zoloft", "depression", "anxiety", "ssri", "antidepressant"],
  },
  {
    slug: "escitalopram",
    name: "Escitalopram",
    brandNames: ["Lexapro", "Esipram"],
    genericName: "Escitalopram Oxalate",
    category: "mental-health",
    description: "SSRI for depression and generalised anxiety.",
    simpleDescription: "Cleaner version of citalopram. Often first choice for anxiety.",
    uses: ["Depression", "Generalised anxiety disorder", "Social anxiety"],
    dosages: ["10mg once daily", "20mg once daily"],
    sideEffects: ["Nausea", "Insomnia", "Fatigue", "Sexual dysfunction"],
    contraindications: ["MAOIs", "QT prolongation"],
    warnings: ["Takes 2-4 weeks to work", "Taper slowly when stopping"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["lexapro", "esipram", "anxiety", "depression", "ssri"],
  },

  // Skin
  {
    slug: "doxycycline",
    name: "Doxycycline",
    brandNames: ["Doryx", "Doxylin"],
    genericName: "Doxycycline Hyclate",
    category: "skin",
    description: "Tetracycline antibiotic for acne and skin infections.",
    simpleDescription: "Great for moderate acne. Also treats rosacea and skin infections.",
    uses: ["Acne", "Rosacea", "Skin infections", "Respiratory infections"],
    dosages: ["50mg twice daily", "100mg once or twice daily"],
    sideEffects: ["Nausea", "Photosensitivity", "Oesophageal irritation"],
    contraindications: ["Pregnancy", "Children under 12", "Severe liver disease"],
    warnings: ["Take with food and water", "Avoid sun exposure", "Don't lie down after taking"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["acne", "pimples", "rosacea", "skin infection"],
  },
  {
    slug: "tretinoin",
    name: "Tretinoin",
    brandNames: ["Retin-A", "Retrieve"],
    genericName: "Tretinoin",
    category: "skin",
    description: "Topical retinoid for acne and skin aging.",
    simpleDescription: "The gold standard for acne and anti-aging. Start low and go slow.",
    uses: ["Acne", "Fine wrinkles", "Sun-damaged skin"],
    dosages: ["0.025% cream", "0.05% cream", "0.1% cream"],
    sideEffects: ["Redness", "Peeling", "Dryness", "Sun sensitivity"],
    contraindications: ["Pregnancy", "Eczema on face"],
    warnings: ["Use at night only", "Apply sunscreen daily", "Skin will purge initially"],
    schedule: "S4",
    prescribable: true,
    price: 29.95,
    popular: true,
    searchTerms: ["retin-a", "retinoid", "acne", "anti-aging", "wrinkles"],
  },

  // Antibiotics
  {
    slug: "amoxicillin",
    name: "Amoxicillin",
    brandNames: ["Amoxil", "Alphamox"],
    genericName: "Amoxicillin",
    category: "antibiotics",
    description: "Broad-spectrum penicillin antibiotic.",
    simpleDescription: "Workhorse antibiotic for chest, ear, and dental infections.",
    uses: ["Chest infections", "Ear infections", "UTIs", "Dental infections", "H. pylori"],
    dosages: ["250mg three times daily", "500mg three times daily"],
    sideEffects: ["Diarrhea", "Nausea", "Rash", "Yeast infection"],
    contraindications: ["Penicillin allergy", "Glandular fever (causes rash)"],
    warnings: ["Complete the full course", "Tell us if you're allergic to penicillin"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: true,
    searchTerms: ["amoxil", "penicillin", "antibiotic", "chest infection", "ear infection"],
  },
  {
    slug: "azithromycin",
    name: "Azithromycin",
    brandNames: ["Zithromax", "Azithromycin Sandoz"],
    genericName: "Azithromycin",
    category: "antibiotics",
    description: "Macrolide antibiotic for respiratory and skin infections.",
    simpleDescription: "The '3-day antibiotic'. Great if you're allergic to penicillin.",
    uses: ["Chest infections", "STIs (chlamydia)", "Skin infections", "Ear infections"],
    dosages: ["500mg day 1, then 250mg for 4 days", "1g single dose for chlamydia"],
    sideEffects: ["Nausea", "Diarrhea", "Abdominal pain"],
    contraindications: ["Liver disease", "QT prolongation"],
    warnings: ["Can affect heart rhythm", "Report irregular heartbeat"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: false,
    searchTerms: ["zithromax", "z-pack", "antibiotic", "chlamydia"],
  },

  // Respiratory
  {
    slug: "salbutamol",
    name: "Salbutamol Inhaler",
    brandNames: ["Ventolin", "Asmol"],
    genericName: "Salbutamol Sulfate",
    category: "respiratory",
    description: "Reliever inhaler for asthma and COPD.",
    simpleDescription: "The blue puffer. Fast-acting relief for asthma symptoms.",
    uses: ["Asthma relief", "COPD", "Exercise-induced wheeze"],
    dosages: ["1-2 puffs as needed", "Max 8 puffs per day"],
    sideEffects: ["Tremor", "Fast heartbeat", "Headache"],
    contraindications: ["None absolute"],
    warnings: ["If using > 2 times per week, your asthma may need better control"],
    schedule: "S3",
    prescribable: true,
    price: 19.95,
    popular: true,
    searchTerms: ["ventolin", "asthma", "puffer", "inhaler", "wheeze"],
  },
  {
    slug: "fluticasone-salmeterol",
    name: "Seretide",
    brandNames: ["Seretide", "Advair"],
    genericName: "Fluticasone/Salmeterol",
    category: "respiratory",
    description: "Preventer inhaler combining steroid and long-acting bronchodilator.",
    simpleDescription: "The purple preventer. Use daily to stop asthma attacks before they start.",
    uses: ["Asthma prevention", "COPD maintenance"],
    dosages: ["1 puff twice daily", "Available in different strengths"],
    sideEffects: ["Hoarse voice", "Oral thrush", "Headache"],
    contraindications: ["Active TB", "Untreated infections"],
    warnings: ["Rinse mouth after use", "Don't use as reliever"],
    schedule: "S4",
    prescribable: true,
    price: 24.95,
    popular: false,
    searchTerms: ["seretide", "advair", "preventer", "asthma control"],
  },
]

// Helper functions
export function searchMedications(query: string): Medication[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  return MEDICATIONS.filter(
    (med) =>
      med.name.toLowerCase().includes(q) ||
      med.genericName.toLowerCase().includes(q) ||
      med.brandNames.some((b) => b.toLowerCase().includes(q)) ||
      med.searchTerms.some((t) => t.includes(q)) ||
      med.simpleDescription.toLowerCase().includes(q),
  ).slice(0, 10)
}

export function getMedicationBySlug(slug: string): Medication | undefined {
  return MEDICATIONS.find((m) => m.slug === slug)
}

export function getPopularMedications(): Medication[] {
  return MEDICATIONS.filter((m) => m.popular && m.prescribable)
}

export function getMedicationsByCategory(category: MedicationCategory): Medication[] {
  return MEDICATIONS.filter((m) => m.category === category && m.prescribable)
}

export function getAllCategories(): MedicationCategory[] {
  return [...new Set(MEDICATIONS.map((m) => m.category))]
}
