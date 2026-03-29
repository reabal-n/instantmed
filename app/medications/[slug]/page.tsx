import { Navbar } from "@/components/shared/navbar"
import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { Footer } from "@/components/shared/footer"
import { AlertTriangle, Pill, Clock, FileText } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Medication Directory Configuration
const medications: Record<
  string,
  {
    name: string
    genericName: string
    category: string
    description: string
    uses: string[]
    dosages: string[]
    sideEffects: string[]
    warnings: string[]
    prescribable: boolean
    schedule: string
  }
> = {
  amoxicillin: {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    category: "Antibiotic",
    description: "A penicillin-type antibiotic used to treat a wide variety of bacterial infections.",
    uses: ["Chest infections", "Ear infections", "Urinary tract infections", "Skin infections", "Dental infections"],
    dosages: ["250mg three times daily", "500mg three times daily", "Course typically 5-7 days"],
    sideEffects: ["Nausea", "Diarrhea", "Skin rash", "Yeast infections"],
    warnings: ["Tell your doctor if you&apos;re allergic to penicillin", "Complete the full course even if you feel better"],
    prescribable: true,
    schedule: "S4",
  },
  metformin: {
    name: "Metformin",
    genericName: "Metformin Hydrochloride",
    category: "Diabetes Medication",
    description: "First-line medication for type 2 diabetes that helps control blood sugar levels.",
    uses: ["Type 2 diabetes", "Polycystic ovary syndrome (PCOS)", "Insulin resistance"],
    dosages: ["500mg once or twice daily", "850mg once daily", "Extended release formulations available"],
    sideEffects: ["Nausea", "Diarrhea", "Stomach upset", "Vitamin B12 deficiency (long-term)"],
    warnings: ["Avoid excessive alcohol", "May need to stop before surgery or contrast scans"],
    prescribable: true,
    schedule: "S4",
  },
  sildenafil: {
    name: "Viagra (Sildenafil)",
    genericName: "Sildenafil Citrate",
    category: "Erectile Dysfunction",
    description: "Medication used to treat erectile dysfunction by increasing blood flow.",
    uses: ["Erectile dysfunction", "Pulmonary arterial hypertension"],
    dosages: ["25mg, 50mg, or 100mg", "Take 30-60 minutes before sexual activity", "Maximum once per day"],
    sideEffects: ["Headache", "Flushing", "Indigestion", "Nasal congestion", "Visual changes"],
    warnings: [
      "Do not take with nitrates",
      "Seek medical help for erections lasting more than 4 hours",
      "Not suitable for some heart conditions",
    ],
    prescribable: true,
    schedule: "S4",
  },
  trimethoprim: {
    name: "Trimethoprim",
    genericName: "Trimethoprim",
    category: "Antibiotic",
    description: "Antibiotic commonly used to treat urinary tract infections (UTIs).",
    uses: ["Urinary tract infections", "Bladder infections", "Some chest infections"],
    dosages: ["300mg once daily for 3 days (UTI)", "Or 100mg twice daily", "Complete full course"],
    sideEffects: ["Nausea", "Rash", "Itching", "Rarely: blood disorders"],
    warnings: ["Tell your doctor if pregnant or have kidney problems", "Complete full course", "Report any rash"],
    prescribable: true,
    schedule: "S4",
  },
  doxycycline: {
    name: "Doxycycline",
    genericName: "Doxycycline Hyclate",
    category: "Antibiotic",
    description: "Broad-spectrum antibiotic used for various bacterial infections including chest infections and acne.",
    uses: ["Chest infections", "Acne", "Chlamydia", "Lyme disease", "Malaria prevention"],
    dosages: ["100mg once or twice daily", "Take with food to reduce stomach upset", "Avoid lying down for 30 min after"],
    sideEffects: ["Nausea", "Sensitivity to sun", "Esophageal irritation if not taken with water"],
    warnings: ["Avoid sun exposure — use sunscreen", "Take with food and plenty of water", "Not for children under 8", "Can reduce effectiveness of oral contraceptives"],
    prescribable: true,
    schedule: "S4",
  },
  sertraline: {
    name: "Sertraline (Zoloft)",
    genericName: "Sertraline Hydrochloride",
    category: "Antidepressant",
    description: "SSRI antidepressant used for depression, anxiety, and related conditions.",
    uses: ["Depression", "Anxiety disorders", "PTSD", "OCD", "Panic disorder"],
    dosages: ["Usually 50mg daily to start", "May increase to 100-200mg", "Takes 2-4 weeks for full effect"],
    sideEffects: ["Nausea", "Headache", "Insomnia or drowsiness", "Sexual dysfunction", "Dry mouth"],
    warnings: ["Don't stop suddenly — taper with doctor guidance", "May increase suicidal thoughts in young adults initially", "Tell your doctor about other medications"],
    prescribable: true,
    schedule: "S4",
  },
  pantoprazole: {
    name: "Pantoprazole",
    genericName: "Pantoprazole Sodium",
    category: "Proton Pump Inhibitor",
    description: "Reduces stomach acid production. Used for reflux, ulcers, and heartburn.",
    uses: ["Acid reflux (GORD)", "Stomach ulcers", "Heartburn", "Erosive esophagitis"],
    dosages: ["40mg once daily", "Take before breakfast", "May need 8 weeks for ulcers"],
    sideEffects: ["Headache", "Diarrhea", "Nausea", "Long-term: possible B12, magnesium deficiency"],
    warnings: ["Long-term use — discuss with doctor", "Tell doctor if you have osteoporosis", "May interact with some medications"],
    prescribable: true,
    schedule: "S4",
  },
  omeprazole: {
    name: "Omeprazole",
    genericName: "Omeprazole",
    category: "Proton Pump Inhibitor",
    description: "Reduces stomach acid. Available over-the-counter for short-term heartburn relief.",
    uses: ["Heartburn", "Acid reflux", "Stomach ulcers", "Prevention of NSAID-induced ulcers"],
    dosages: ["20mg once daily OTC", "40mg for prescription strength", "Take before meals"],
    sideEffects: ["Headache", "Abdominal pain", "Nausea", "Diarrhea"],
    warnings: ["Don't use for more than 14 days without doctor advice (OTC)", "Long-term use needs medical supervision"],
    prescribable: true,
    schedule: "S3",
  },
  azithromycin: {
    name: "Azithromycin (Z-Pack)",
    genericName: "Azithromycin",
    category: "Antibiotic",
    description: "Macrolide antibiotic used for chest infections, throat infections, and some STIs.",
    uses: ["Chest infections", "Strep throat", "Ear infections", "Chlamydia", "Sinusitis"],
    dosages: ["500mg day 1, then 250mg for 4 days", "Or single dose for chlamydia", "Take as directed"],
    sideEffects: ["Nausea", "Diarrhea", "Stomach pain", "Rarely: hearing changes"],
    warnings: ["Complete full course", "Tell doctor about heart conditions", "Can interact with some medications"],
    prescribable: true,
    schedule: "S4",
  },
  citalopram: {
    name: "Citalopram",
    genericName: "Citalopram Hydrobromide",
    category: "Antidepressant",
    description: "SSRI antidepressant for depression and anxiety.",
    uses: ["Depression", "Anxiety", "Panic disorder"],
    dosages: ["20mg daily to start", "Max 40mg daily", "Takes 2-4 weeks for effect"],
    sideEffects: ["Nausea", "Fatigue", "Dry mouth", "Sexual dysfunction", "Sweating"],
    warnings: ["Don't stop suddenly", "May worsen anxiety initially", "Tell doctor about other medications"],
    prescribable: true,
    schedule: "S4",
  },
  escitalopram: {
    name: "Escitalopram (Lexapro)",
    genericName: "Escitalopram Oxalate",
    category: "Antidepressant",
    description: "SSRI antidepressant for depression and anxiety. Often preferred for lower drug interaction risk.",
    uses: ["Depression", "Generalised anxiety disorder", "Panic disorder"],
    dosages: ["10mg daily to start", "May increase to 20mg", "Takes 2-4 weeks for effect"],
    sideEffects: ["Nausea", "Fatigue", "Insomnia", "Sexual dysfunction", "Dry mouth"],
    warnings: ["Don't stop suddenly", "May worsen anxiety initially", "Tell doctor about other medications"],
    prescribable: true,
    schedule: "S4",
  },
  fluoxetine: {
    name: "Fluoxetine (Prozac)",
    genericName: "Fluoxetine Hydrochloride",
    category: "Antidepressant",
    description: "SSRI antidepressant with a long half-life. Used for depression, anxiety, and OCD.",
    uses: ["Depression", "Anxiety", "OCD", "Bulimia nervosa"],
    dosages: ["20mg daily to start", "May increase to 60mg for OCD", "Takes 2-4 weeks for effect"],
    sideEffects: ["Nausea", "Insomnia", "Headache", "Sexual dysfunction", "Dry mouth"],
    warnings: ["Don't stop suddenly", "Long half-life means it stays in system longer", "Tell doctor about other medications"],
    prescribable: true,
    schedule: "S4",
  },
  loratadine: {
    name: "Loratadine (Claratyne)",
    genericName: "Loratadine",
    category: "Antihistamine",
    description: "Non-drowsy antihistamine for allergies and hay fever.",
    uses: ["Hay fever", "Allergic rhinitis", "Hives", "Pet allergies"],
    dosages: ["10mg once daily", "Available over-the-counter", "Take with or without food"],
    sideEffects: ["Headache", "Dry mouth", "Fatigue (rare)", "Generally well tolerated"],
    warnings: ["Tell doctor if you have liver/kidney problems", "May interact with some medications"],
    prescribable: true,
    schedule: "S2",
  },
  cetirizine: {
    name: "Cetirizine (Zyrtec)",
    genericName: "Cetirizine Hydrochloride",
    category: "Antihistamine",
    description: "Non-drowsy antihistamine for allergies. Available over-the-counter.",
    uses: ["Hay fever", "Allergic rhinitis", "Hives", "Itchy skin"],
    dosages: ["10mg once daily", "Available OTC", "Take in evening if drowsy"],
    sideEffects: ["Drowsiness (in some people)", "Dry mouth", "Headache"],
    warnings: ["Tell doctor if you have kidney problems", "May cause drowsiness — avoid driving if affected"],
    prescribable: true,
    schedule: "S2",
  },
  salbutamol: {
    name: "Salbutamol (Ventolin)",
    genericName: "Salbutamol Sulfate",
    category: "Bronchodilator",
    description: "Short-acting reliever for asthma and bronchospasm. Opens airways quickly.",
    uses: ["Asthma relief", "Exercise-induced bronchospasm", "COPD symptom relief"],
    dosages: ["1-2 puffs as needed", "Usually 100mcg per puff", "Not for regular use — only when needed"],
    sideEffects: ["Tremor", "Rapid heartbeat", "Headache", "Nervousness"],
    warnings: ["Seek help if reliever doesn't work", "If using more than 3 times per week, discuss with doctor", "Not a substitute for preventer"],
    prescribable: true,
    schedule: "S3",
  },
  prednisolone: {
    name: "Prednisolone",
    genericName: "Prednisolone",
    category: "Corticosteroid",
    description: "Short-term steroid for inflammation. Used for asthma flares, severe allergies, and inflammatory conditions.",
    uses: ["Asthma flare-ups", "Severe allergic reactions", "Inflammatory conditions", "Some autoimmune conditions"],
    dosages: ["Varies by condition — short courses common", "Take with food", "Usually 5-50mg daily"],
    sideEffects: ["Increased appetite", "Mood changes", "Fluid retention", "Short-term use usually well tolerated"],
    warnings: ["Don't stop suddenly if on longer courses", "Tell doctor if diabetic, have infections, or take other medications", "Short courses only — long-term needs monitoring"],
    prescribable: true,
    schedule: "S4",
  },
  naproxen: {
    name: "Naproxen",
    genericName: "Naproxen Sodium",
    category: "NSAID",
    description: "Anti-inflammatory pain reliever. Longer-acting than ibuprofen.",
    uses: ["Period pain", "Muscle pain", "Arthritis", "Headaches"],
    dosages: ["250-500mg twice daily", "Take with food", "Usually short-term use"],
    sideEffects: ["Stomach upset", "Heartburn", "Nausea", "Increased risk of bleeding with long-term use"],
    warnings: ["Take with food", "Avoid if stomach ulcers or bleeding history", "Tell doctor if heart/kidney problems", "Not for long-term use without doctor review"],
    prescribable: true,
    schedule: "S3",
  },
  diclofenac: {
    name: "Diclofenac",
    genericName: "Diclofenac Sodium",
    category: "NSAID",
    description: "Anti-inflammatory for pain and inflammation. Available as tablets or gel.",
    uses: ["Arthritis", "Muscle pain", "Back pain", "Period pain"],
    dosages: ["25-50mg two to three times daily", "Gel for topical use", "Take with food"],
    sideEffects: ["Stomach upset", "Nausea", "Dizziness", "Increased cardiovascular risk with long-term use"],
    warnings: ["Take with food", "Avoid if stomach ulcers", "Tell doctor about heart/kidney history", "Short-term use preferred"],
    prescribable: true,
    schedule: "S4",
  },
  famotidine: {
    name: "Famotidine (Pepcid)",
    genericName: "Famotidine",
    category: "H2 Blocker",
    description: "Reduces stomach acid. Alternative to PPIs for some people.",
    uses: ["Heartburn", "Acid reflux", "Stomach ulcers", "Indigestion"],
    dosages: ["20mg twice daily or 40mg at night", "Available over-the-counter", "Take before meals"],
    sideEffects: ["Headache", "Dizziness", "Constipation or diarrhea"],
    warnings: ["Tell doctor if kidney problems", "May interact with some medications"],
    prescribable: true,
    schedule: "S2",
  },
  "amoxicillin-clavulanate": {
    name: "Amoxicillin-Clavulanate (Augmentin)",
    genericName: "Amoxicillin with Clavulanic Acid",
    category: "Antibiotic",
    description: "Broad-spectrum antibiotic that combats bacterial resistance. Used when amoxicillin alone may not work.",
    uses: ["Sinusitis", "Ear infections", "Chest infections", "Skin infections", "Dental infections"],
    dosages: ["Varies by formulation — 500/125mg or 875/125mg", "Usually twice daily", "Take with food"],
    sideEffects: ["Diarrhea", "Nausea", "Stomach upset", "Yeast infections"],
    warnings: ["Tell doctor if allergic to penicillin", "Complete full course", "Take with food to reduce stomach upset"],
    prescribable: true,
    schedule: "S4",
  },
  cephalexin: {
    name: "Cephalexin (Keflex)",
    genericName: "Cephalexin",
    category: "Antibiotic",
    description: "Cephalosporin antibiotic for bacterial infections. Alternative for penicillin allergy in some cases.",
    uses: ["Skin infections", "Throat infections", "Urinary tract infections", "Ear infections"],
    dosages: ["250-500mg every 6 hours", "Course typically 5-10 days", "Take with food"],
    sideEffects: ["Diarrhea", "Nausea", "Stomach upset", "Rash"],
    warnings: ["Tell doctor if allergic to penicillin or cephalosporins", "Complete full course"],
    prescribable: true,
    schedule: "S4",
  },
  gabapentin: {
    name: "Gabapentin (Neurontin)",
    genericName: "Gabapentin",
    category: "Anticonvulsant",
    description: "Used for nerve pain, seizures, and some anxiety. Often used for neuropathic pain.",
    uses: ["Nerve pain", "Shingles pain", "Fibromyalgia", "Some anxiety"],
    dosages: ["Start low, increase gradually", "Usually 300-900mg three times daily", "Takes time to work"],
    sideEffects: ["Drowsiness", "Dizziness", "Swelling", "Weight gain"],
    warnings: ["Don't stop suddenly", "May cause drowsiness — avoid driving initially", "Tell doctor about kidney function"],
    prescribable: true,
    schedule: "S4",
  },
  propranolol: {
    name: "Propranolol",
    genericName: "Propranolol Hydrochloride",
    category: "Beta Blocker",
    description: "Reduces heart rate and blood pressure. Used for anxiety, migraines, and high blood pressure.",
    uses: ["Performance anxiety", "Migraine prevention", "High blood pressure", "Heart conditions"],
    dosages: ["Varies by condition — 10-80mg", "Take as directed", "Usually once or twice daily"],
    sideEffects: ["Fatigue", "Cold hands/feet", "Slow heartbeat", "Dizziness"],
    warnings: ["Don't stop suddenly", "May mask low blood sugar in diabetics", "Tell doctor about asthma/breathing problems", "Not for acute asthma"],
    prescribable: true,
    schedule: "S4",
  },
  "oral-contraceptive": {
    name: "Oral Contraceptive (The Pill)",
    genericName: "Combined or Progestogen-only",
    category: "Contraceptive",
    description: "Hormonal contraception to prevent pregnancy. Combined or progestogen-only formulations available.",
    uses: ["Contraception", "Period regulation", "Acne (some formulations)", "Heavy periods"],
    dosages: ["One pill daily", "Combined: 21-day or 28-day packs", "Progestogen-only: daily at same time"],
    sideEffects: ["Nausea", "Breast tenderness", "Mood changes", "Breakthrough bleeding initially"],
    warnings: ["Not for everyone — discuss with doctor", "Progestogen-only: must take at same time daily", "Tell doctor about blood clots, migraines, smoking"],
    prescribable: true,
    schedule: "S4",
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const med = medications[slug]
  if (!med) return {}

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

  return {
    title: `${med.name} Information | InstantMed`,
    description: `Learn about ${med.name} (${med.genericName}). ${med.description} Educational information reviewed by Australian doctors.`,
    keywords: [`${med.name} information`, `${med.name} side effects`, `${med.name} uses`],
    alternates: {
      canonical: `${baseUrl}/medications/${slug}`,
    },
    openGraph: {
      title: `${med.name} Information | InstantMed`,
      description: `Educational information about ${med.name} reviewed by AHPRA-registered doctors.`,
      url: `${baseUrl}/medications/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(medications).map((slug) => ({ slug }))
}

export default async function MedicationPage({ params }: PageProps) {
  const { slug } = await params
  const med = medications[slug]

  if (!med) {
    notFound()
  }

  // Educational health information schema (NOT Drug schema — avoids Google pharma policy triggers)
  const medSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${med.name} Information`,
    description: `Educational information about ${med.name}`,
    lastReviewed: new Date().toISOString().split("T")[0],
    medicalAudience: {
      "@type": "MedicalAudience",
      audienceType: "Patient",
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medSchema) }} />

      <div className="flex min-h-screen flex-col bg-hero">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="medication" slug={slug} serviceRecommendation="prescription" />

        <main className="flex-1 pt-24">
          {/* Hero */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link href="/medications" className="hover:text-success">
                  Medications
                </Link>
                <span>/</span>
                <span>{med.category}</span>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl bg-success-light flex items-center justify-center shrink-0">
                  <Pill className="h-7 w-7 text-success" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                    {med.name}
                  </h1>
                  <p className="text-muted-foreground">
                    {med.genericName} • {med.category} • Schedule {med.schedule}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">{med.description}</p>
            </div>
          </section>

          {/* Details Grid */}
          <section className="px-4 py-12 bg-mesh">
            <div className="mx-auto max-w-3xl grid gap-6 sm:grid-cols-2">
              {/* Uses */}
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-success" />
                  <h2 className="font-semibold">Common Uses</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {med.uses.map((use, i) => (
                    <li key={i}>• {use}</li>
                  ))}
                </ul>
              </div>

              {/* Dosages */}
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-sky-500" />
                  <h2 className="font-semibold">Typical Dosages</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {med.dosages.map((dose, i) => (
                    <li key={i}>• {dose}</li>
                  ))}
                </ul>
              </div>

              {/* Side Effects */}
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="h-5 w-5 text-warning" />
                  <h2 className="font-semibold">Possible Side Effects</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {med.sideEffects.map((effect, i) => (
                    <li key={i}>• {effect}</li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              <div className="bg-warning-light/50 dark:bg-card border border-warning-border dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <h2 className="font-semibold text-warning">Important Warnings</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-warning">
                  {med.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
              <p>
                This information is for educational purposes only and is not a substitute for professional medical
                advice. Always consult a doctor before starting or changing any medication. The prescribing doctor will
                assess whether this medication is appropriate for you.
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
