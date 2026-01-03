import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Clock, Shield, Stethoscope, AlertCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey issues during build
export const dynamic = "force-dynamic"

// Condition Landing Pages Configuration - 15 conditions
const conditions: Record<
  string,
  {
    name: string
    slug: string
    title: string
    h1: string
    description: string
    heroSubhead: string
    symptoms: string[]
    howWeHelp: string[]
    pricing: { name: string; price: string; description: string }
    ctaHref: string
    ctaText: string
    whenToSeeGP: string[]
    faqs: { q: string; a: string }[]
    relatedConditions: string[]
  }
> = {
  uti: {
    name: "UTI (Urinary Tract Infection)",
    slug: "uti",
    title: "UTI Treatment Online Australia | Same Day Antibiotics | InstantMed",
    h1: "UTI Treatment Online — Fast Relief When You Need It",
    description:
      "Get UTI treatment online in Australia. Same-day assessment by Australian doctors. Antibiotics prescribed if appropriate. No awkward conversations.",
    heroSubhead: "Burning, stinging, constant trips to the loo? We get it. Let&apos;s sort it out quickly and discreetly.",
    symptoms: [
      "Burning or stinging when you pee",
      "Needing to pee urgently or frequently",
      "Cloudy, dark or strong-smelling urine",
      "Pain in your lower tummy or back",
      "Feeling generally unwell",
    ],
    howWeHelp: [
      "Answer a few quick questions about your symptoms",
      "A doctor reviews your case (usually within 30 mins)",
      "If appropriate, antibiotics are prescribed via e-script",
      "Pick up from any pharmacy or get delivered",
    ],
    pricing: {
      name: "UTI Consultation",
      price: "$29.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/womens-health?condition=uti",
    ctaText: "Get UTI Treatment Now",
    whenToSeeGP: [
      "Blood in your urine",
      "High fever or chills",
      "Severe back pain",
      "Symptoms lasting more than 3 days",
      "Pregnant or might be pregnant",
      "Recurrent UTIs (3+ per year)",
    ],
    faqs: [
      {
        q: "Can you prescribe antibiotics for a UTI online?",
        a: "Yes — if your symptoms are consistent with a straightforward UTI and you don&apos;t have any red flags, our doctors can prescribe appropriate antibiotics via e-script.",
      },
      {
        q: "How quickly will I feel better?",
        a: "Most people start feeling relief within 24-48 hours of starting antibiotics. Always complete the full course even if you feel better.",
      },
      {
        q: "What if it keeps coming back?",
        a: "If you&apos;re getting recurrent UTIs (3+ per year), we'd recommend seeing a GP in person for further investigation and prevention strategies.",
      },
      {
        q: "Do I need a urine test?",
        a: "For straightforward UTIs with typical symptoms, we can often treat based on symptoms alone. If your case is unclear or recurrent, we may recommend a urine culture.",
      },
    ],
    relatedConditions: ["thrush", "contraception"],
  },
  acne: {
    name: "Acne",
    slug: "acne",
    title: "Acne Treatment Online Australia | Prescription Skincare | InstantMed",
    h1: "Acne Treatment Online — Prescription-Strength Solutions",
    description:
      "Get effective acne treatment online. Australian doctors can prescribe retinoids, antibiotics, and prescription skincare. No waiting rooms.",
    heroSubhead: "Tried everything from the chemist? It might be time for prescription-strength treatment.",
    symptoms: [
      "Pimples, blackheads, or whiteheads",
      "Red or inflamed skin",
      "Painful cysts or nodules",
      "Scarring from previous breakouts",
      "Acne on face, chest, or back",
    ],
    howWeHelp: [
      "Share photos and describe your skin concerns",
      "A doctor assesses your acne type and severity",
      "Prescription treatment prescribed if appropriate",
      "Follow-up available to adjust treatment",
    ],
    pricing: {
      name: "Acne Consultation",
      price: "$34.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/prescriptions/request?condition=acne",
    ctaText: "Start Acne Treatment",
    whenToSeeGP: [
      "Severe cystic acne",
      "Acne causing significant scarring",
      "Acne not responding to treatment",
      "Considering isotretinoin (Roaccutane)",
    ],
    faqs: [
      {
        q: "What acne treatments can you prescribe?",
        a: "Our doctors can prescribe topical retinoids (tretinoin, adapalene), topical antibiotics (clindamycin), benzoyl peroxide combinations, and oral antibiotics for moderate cases.",
      },
      {
        q: "Can you prescribe Roaccutane online?",
        a: "No — isotretinoin (Roaccutane) requires specialist supervision and regular blood tests. We can refer you to a dermatologist if appropriate.",
      },
      {
        q: "How long until I see results?",
        a: "Most prescription acne treatments take 6-12 weeks to show significant improvement. Some treatments may cause initial purging before improvement.",
      },
    ],
    relatedConditions: ["eczema"],
  },
  eczema: {
    name: "Eczema",
    slug: "eczema",
    title: "Eczema Treatment Online Australia | Prescription Creams | InstantMed",
    h1: "Eczema Treatment Online — Stop the Itch",
    description:
      "Get eczema treatment online in Australia. Prescription steroid creams and moisturising advice from Australian doctors.",
    heroSubhead: "Itchy, red, cracked skin? Let&apos;s get you some relief without the wait.",
    symptoms: [
      "Itchy, dry, or cracked skin",
      "Red or inflamed patches",
      "Skin that weeps or crusts",
      "Thickened skin from scratching",
      "Sleep disruption from itching",
    ],
    howWeHelp: [
      "Share photos of affected areas",
      "Doctor assesses severity and type",
      "Appropriate treatment prescribed",
      "Moisturising and trigger-avoidance advice",
    ],
    pricing: {
      name: "Eczema Consultation",
      price: "$29.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/prescriptions/request?condition=eczema",
    ctaText: "Get Eczema Treatment",
    whenToSeeGP: [
      "Signs of skin infection (yellow crusting, pus)",
      "Eczema covering large body areas",
      "Not responding to treatment",
      "Affecting sleep significantly",
    ],
    faqs: [
      {
        q: "What can you prescribe for eczema?",
        a: "Our doctors can prescribe topical corticosteroids of various strengths, calcineurin inhibitors (tacrolimus, pimecrolimus), and recommend appropriate emollients.",
      },
      {
        q: "Is it safe to use steroid creams?",
        a: "Yes, when used as directed. Different strengths are used for different body areas. Our doctors will advise on appropriate use and duration.",
      },
    ],
    relatedConditions: ["acne", "hay-fever"],
  },
  "hay-fever": {
    name: "Hay Fever",
    slug: "hay-fever",
    title: "Hay Fever Treatment Online Australia | Prescription Relief | InstantMed",
    h1: "Hay Fever Treatment Online — Breathe Easy",
    description:
      "Get prescription hay fever treatment online. Stronger antihistamines and nasal sprays when over-the-counter options fail.",
    heroSubhead: "Sneezing, itchy eyes, runny nose? When the chemist stuff isn&apos;t cutting it, we can help.",
    symptoms: [
      "Sneezing fits",
      "Itchy, watery eyes",
      "Runny or blocked nose",
      "Itchy throat or ears",
      "Fatigue and poor concentration",
    ],
    howWeHelp: [
      "Tell us about your symptoms and what you have tried",
      "Doctor recommends appropriate treatment",
      "Prescription issued if needed",
      "Advice on reducing exposure",
    ],
    pricing: {
      name: "Hay Fever Consultation",
      price: "$29.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/prescriptions/request?condition=hayfever",
    ctaText: "Get Hay Fever Relief",
    whenToSeeGP: [
      "Symptoms affecting daily life significantly",
      "Asthma symptoms worsening",
      "Considering immunotherapy",
      "Year-round symptoms",
    ],
    faqs: [
      {
        q: "What prescription options are available?",
        a: "Stronger antihistamines, prescription nasal corticosteroid sprays, and eye drops. For severe cases, short courses of oral steroids may be considered.",
      },
      {
        q: "Why prescription when there's stuff at the chemist?",
        a: "Prescription options are often stronger and more targeted. Some people also benefit from combining treatments in ways that require medical guidance.",
      },
    ],
    relatedConditions: ["sinus-infection", "cold-and-flu"],
  },
  "acid-reflux": {
    name: "Acid Reflux / GERD",
    slug: "acid-reflux",
    title: "Acid Reflux Treatment Online Australia | Heartburn Relief | InstantMed",
    h1: "Acid Reflux Treatment Online — Settle Your Stomach",
    description:
      "Get acid reflux and heartburn treatment online. Prescription PPIs and advice from Australian doctors.",
    heroSubhead: "Heartburn keeping you up at night? Constant burping and discomfort? Let&apos;s sort it.",
    symptoms: [
      "Burning sensation in chest (heartburn)",
      "Acid taste in mouth",
      "Difficulty swallowing",
      "Burping or regurgitation",
      "Worse after eating or lying down",
    ],
    howWeHelp: [
      "Describe your symptoms and triggers",
      "Doctor assesses and recommends treatment",
      "Prescription issued if appropriate",
      "Lifestyle modification advice",
    ],
    pricing: {
      name: "Acid Reflux Consultation",
      price: "$29.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/prescriptions/request?condition=reflux",
    ctaText: "Get Reflux Treatment",
    whenToSeeGP: [
      "Difficulty swallowing",
      "Unintended weight loss",
      "Vomiting blood",
      "Symptoms for more than 2 weeks",
      "Chest pain (rule out heart problems)",
    ],
    faqs: [
      {
        q: "What medications can you prescribe?",
        a: "Proton pump inhibitors (PPIs) like omeprazole, esomeprazole, and pantoprazole. Also H2 blockers like ranitidine for milder cases.",
      },
      {
        q: "Do I need a gastroscopy?",
        a: "Not always. For typical symptoms responding to treatment, investigation may not be needed. Persistent or concerning symptoms may warrant referral.",
      },
    ],
    relatedConditions: ["cold-and-flu"],
  },
  "high-blood-pressure": {
    name: "High Blood Pressure",
    slug: "high-blood-pressure",
    title: "Blood Pressure Medication Online Australia | Repeat Scripts | InstantMed",
    h1: "Blood Pressure Medication Online — Easy Repeats",
    description:
      "Get your blood pressure medication renewed online. For stable patients on existing treatment. Australian doctors.",
    heroSubhead: "Already on BP medication and need a repeat? We can help — no need to take time off work.",
    symptoms: [
      "Usually no symptoms (silent condition)",
      "Headaches in severe cases",
      "Shortness of breath",
      "Nosebleeds",
      "Dizziness",
    ],
    howWeHelp: [
      "Confirm your current medication and dose",
      "Provide recent BP readings if available",
      "Doctor reviews and issues repeat",
      "E-script sent to your phone",
    ],
    pricing: {
      name: "Repeat Prescription",
      price: "$29.95",
      description: "For stable patients on existing medication",
    },
    ctaHref: "/prescriptions?category=blood-pressure",
    ctaText: "Get Repeat Script",
    whenToSeeGP: [
      "Starting blood pressure medication for first time",
      "BP not well controlled",
      "Experiencing side effects",
      "Due for annual review",
      "Other health conditions",
    ],
    faqs: [
      {
        q: "Can I start BP medication online?",
        a: "For new diagnoses, we'd recommend seeing a GP in person for proper assessment including physical examination. We're best for stable repeats.",
      },
      {
        q: "What if my BP has changed?",
        a: "If your readings have changed significantly, the doctor may recommend seeing your regular GP for medication adjustment.",
      },
    ],
    relatedConditions: ["high-cholesterol"],
  },
  "high-cholesterol": {
    name: "High Cholesterol",
    slug: "high-cholesterol",
    title: "Cholesterol Medication Online Australia | Statin Repeats | InstantMed",
    h1: "Cholesterol Medication Online — Simple Repeats",
    description:
      "Get your cholesterol medication renewed online. For stable patients on statins. Quick and convenient.",
    heroSubhead: "On statins and need a repeat? We've got you covered.",
    symptoms: [
      "Usually no symptoms",
      "Diagnosed through blood tests",
      "May have fatty deposits around eyes",
      "Family history important",
    ],
    howWeHelp: [
      "Confirm current medication and dose",
      "Review recent lipid results if available",
      "Doctor issues repeat prescription",
      "E-script sent to your phone if approved",
    ],
    pricing: {
      name: "Repeat Prescription",
      price: "$29.95",
      description: "For stable patients on existing medication",
    },
    ctaHref: "/prescriptions?category=cholesterol",
    ctaText: "Get Repeat Script",
    whenToSeeGP: [
      "Starting cholesterol medication",
      "Due for blood tests",
      "Experiencing muscle pain",
      "Other health conditions",
    ],
    faqs: [
      {
        q: "Can you prescribe statins without blood tests?",
        a: "For repeats of existing medication, recent bloods help but may not always be required. New prescriptions typically need lipid panel results.",
      },
    ],
    relatedConditions: ["high-blood-pressure"],
  },
  "erectile-dysfunction": {
    name: "Erectile Dysfunction",
    slug: "erectile-dysfunction",
    title: "Erectile Dysfunction Treatment Online Australia | Discreet | InstantMed",
    h1: "ED Treatment Online — Discreet and Confidential",
    description:
      "Get erectile dysfunction treatment online in Australia. Viagra, Cialis and alternatives prescribed discreetly by Australian doctors.",
    heroSubhead:
      "Not performing like you used to? No awkward conversations — just effective treatment, delivered discreetly.",
    symptoms: [
      "Difficulty getting an erection",
      "Difficulty maintaining an erection",
      "Reduced sexual desire",
      "Performance anxiety",
    ],
    howWeHelp: [
      "Answer confidential health questions",
      "Doctor reviews and recommends treatment",
      "Prescription issued if safe and appropriate",
      "Discreet packaging available",
    ],
    pricing: {
      name: "ED Consultation",
      price: "$34.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/mens-health?condition=ed",
    ctaText: "Get ED Treatment",
    whenToSeeGP: [
      "ED with chest pain or heart symptoms",
      "Sudden onset of ED",
      "ED with other urinary symptoms",
      "Psychological causes suspected",
    ],
    faqs: [
      {
        q: "What ED medications can you prescribe?",
        a: "Sildenafil (Viagra), tadalafil (Cialis), and vardenafil (Levitra). The doctor will recommend the most appropriate option based on your needs.",
      },
      {
        q: "Is it safe to buy ED medication online?",
        a: "Yes, when prescribed by a registered doctor after proper assessment. We never sell medication without a prescription.",
      },
      {
        q: "What about the generic versions?",
        a: "Generic versions are equally effective and more affordable. They contain the same active ingredient.",
      },
    ],
    relatedConditions: ["hair-loss"],
  },
  "hair-loss": {
    name: "Hair Loss",
    slug: "hair-loss",
    title: "Hair Loss Treatment Online Australia | Finasteride & Minoxidil | InstantMed",
    h1: "Hair Loss Treatment Online — Keep What You Have",
    description:
      "Get hair loss treatment online. Finasteride, minoxidil, and combination treatments prescribed by Australian doctors.",
    heroSubhead: "Noticing more hair in the drain? The earlier you act, the better the results.",
    symptoms: [
      "Receding hairline",
      "Thinning on crown",
      "Gradual hair loss over time",
      "More hair in brush or shower",
      "Family history of baldness",
    ],
    howWeHelp: [
      "Share photos of your hair loss pattern",
      "Doctor assesses type and stage",
      "Appropriate treatment prescribed",
      "Ongoing support and adjustments",
    ],
    pricing: {
      name: "Hair Loss Consultation",
      price: "$34.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/mens-health?condition=hairloss",
    ctaText: "Start Hair Treatment",
    whenToSeeGP: [
      "Sudden or patchy hair loss",
      "Hair loss with other symptoms",
      "Hair loss in women",
      "Scalp problems",
    ],
    faqs: [
      {
        q: "Does hair loss treatment actually work?",
        a: "Yes — finasteride stops further loss in about 90% of men and regrows hair in about 65%. Results are best when started early.",
      },
      {
        q: "What about side effects?",
        a: "Most men experience no side effects. A small percentage may experience sexual side effects which typically resolve if treatment is stopped.",
      },
    ],
    relatedConditions: ["erectile-dysfunction"],
  },
  contraception: {
    name: "Contraception",
    slug: "contraception",
    title: "Contraceptive Pill Online Australia | Birth Control | InstantMed",
    h1: "Contraceptive Pill Online — Easy Repeats",
    description:
      "Get your contraceptive pill renewed online. For women already on the pill who need a repeat prescription.",
    heroSubhead: "Running low on the pill? Get your repeat sorted without the hassle.",
    symptoms: [
      "Need to prevent pregnancy",
      "Already on contraceptive pill",
      "Need repeat prescription",
      "May also help with period pain or acne",
    ],
    howWeHelp: [
      "Confirm your current pill and health history",
      "Doctor reviews and issues repeat",
      "E-script sent to your phone",
      "Pick up from any pharmacy",
    ],
    pricing: { name: "Contraception Repeat", price: "$29.95", description: "For women already on the pill" },
    ctaHref: "/womens-health?condition=contraception",
    ctaText: "Get Pill Repeat",
    whenToSeeGP: [
      "Starting the pill for first time",
      "Wanting to change pill type",
      "Experiencing side effects",
      "Over 35 and smoking",
      "History of blood clots",
    ],
    faqs: [
      {
        q: "Can I start the pill online?",
        a: "For first-time users, we'd recommend seeing a GP in person to discuss options and check blood pressure. We're great for repeats of existing prescriptions.",
      },
      {
        q: "Can you prescribe any pill?",
        a: "We can prescribe most combined and progesterone-only pills. The doctor will confirm your current pill is still appropriate.",
      },
    ],
    relatedConditions: ["uti", "thrush"],
  },
  "weight-loss": {
    name: "Weight Loss",
    slug: "weight-loss",
    title: "Weight Loss Medication Online Australia | Ozempic, Saxenda | InstantMed",
    h1: "Weight Loss Medication Online — Medical Support",
    description:
      "Get weight loss medication like Ozempic and Saxenda prescribed online. Includes eligibility assessment and ongoing support.",
    heroSubhead: "Struggling to shift the weight despite your best efforts? Medical options may help.",
    symptoms: [
      "BMI over 30",
      "BMI over 27 with health conditions",
      "Difficulty losing weight with diet/exercise",
      "Weight-related health problems",
    ],
    howWeHelp: [
      "Complete eligibility assessment",
      "Doctor reviews your health history",
      "If appropriate, medication prescribed",
      "Ongoing monitoring and support",
    ],
    pricing: { name: "Weight Loss Consultation", price: "$49.95", description: "Includes comprehensive assessment" },
    ctaHref: "/weight-loss",
    ctaText: "Check Eligibility",
    whenToSeeGP: [
      "Want comprehensive weight management program",
      "Multiple health conditions",
      "Previous bariatric surgery",
      "Eating disorders",
    ],
    faqs: [
      {
        q: "Can you prescribe Ozempic for weight loss?",
        a: "We can prescribe semaglutide (Ozempic/Wegovy) for eligible patients. You must meet BMI criteria and have no contraindications.",
      },
      {
        q: "How much weight can I expect to lose?",
        a: "Clinical trials show average weight loss of 15-20% of body weight over 12-18 months with GLP-1 medications combined with lifestyle changes.",
      },
    ],
    relatedConditions: ["high-blood-pressure", "high-cholesterol"],
  },
  "cold-and-flu": {
    name: "Cold and Flu",
    slug: "cold-and-flu",
    title: "Cold and Flu Treatment Online Australia | Medical Certificate | InstantMed",
    h1: "Cold and Flu — Get a Med Cert and Feel Better",
    description:
      "Got a cold or flu? Get a medical certificate for work and advice on treatment from Australian doctors.",
    heroSubhead: "Feeling absolutely rubbish? We can get you a med cert and help you feel better faster.",
    symptoms: ["Runny or blocked nose", "Sore throat", "Cough", "Fever and chills", "Body aches and fatigue"],
    howWeHelp: [
      "Describe your symptoms",
      "Get a medical certificate if needed",
      "Advice on symptom relief",
      "Know when to seek further help",
    ],
    pricing: { name: "Medical Certificate", price: "$19.95", description: "Valid for employers and universities" },
    ctaHref: "/medical-certificate/request",
    ctaText: "Get Med Cert",
    whenToSeeGP: [
      "High fever lasting more than 3 days",
      "Difficulty breathing",
      "Chest pain",
      "Symptoms worsening after 7 days",
      "Underlying health conditions",
    ],
    faqs: [
      {
        q: "Can you prescribe antibiotics for cold/flu?",
        a: "Colds and flu are caused by viruses, so antibiotics won&apos;t help. We can advise on symptom relief and prescribe if a bacterial infection develops.",
      },
      {
        q: "How long should I stay home?",
        a: "Generally until you&apos;re fever-free for 24 hours and symptoms are improving. The doctor can advise based on your specific situation.",
      },
    ],
    relatedConditions: ["sinus-infection", "hay-fever"],
  },
  "sinus-infection": {
    name: "Sinus Infection",
    slug: "sinus-infection",
    title: "Sinus Infection Treatment Online Australia | Sinusitis | InstantMed",
    h1: "Sinus Infection Treatment Online — Clear the Pressure",
    description:
      "Get sinus infection treatment online. Antibiotics and nasal sprays prescribed if appropriate by Australian doctors.",
    heroSubhead: "Head pounding, face aching, blocked up? Let&apos;s get you sorted.",
    symptoms: [
      "Pain and pressure around forehead, cheeks, eyes",
      "Blocked or runny nose",
      "Thick, discolored nasal discharge",
      "Reduced sense of smell",
      "Headache and fatigue",
    ],
    howWeHelp: [
      "Describe your symptoms and duration",
      "Doctor assesses if antibiotics needed",
      "Prescription issued if appropriate",
      "Advice on symptom relief",
    ],
    pricing: {
      name: "Sinus Consultation",
      price: "$29.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/prescriptions/request?condition=sinus",
    ctaText: "Get Sinus Treatment",
    whenToSeeGP: [
      "Symptoms lasting more than 10 days",
      "Severe headache",
      "High fever",
      "Swelling around eyes",
      "Recurrent sinus infections",
    ],
    faqs: [
      {
        q: "Do I need antibiotics?",
        a: "Most sinus infections are viral and resolve without antibiotics. If symptoms are severe or lasting more than 10 days, antibiotics may help.",
      },
    ],
    relatedConditions: ["cold-and-flu", "hay-fever"],
  },
  conjunctivitis: {
    name: "Conjunctivitis (Pink Eye)",
    slug: "conjunctivitis",
    title: "Conjunctivitis Treatment Online Australia | Pink Eye | InstantMed",
    h1: "Conjunctivitis Treatment Online — Clear Up Pink Eye",
    description:
      "Get conjunctivitis treatment online. Antibiotic eye drops prescribed if appropriate by Australian doctors.",
    heroSubhead: "Red, itchy, gunky eyes? We can help you see clearly again.",
    symptoms: [
      "Red or pink eyes",
      "Itchy or burning sensation",
      "Discharge or crusting",
      "Watery eyes",
      "Sensitivity to light",
    ],
    howWeHelp: [
      "Share photos and describe symptoms",
      "Doctor assesses type of conjunctivitis",
      "Eye drops prescribed if appropriate",
      "Advice on preventing spread",
    ],
    pricing: {
      name: "Eye Consultation",
      price: "$29.95",
      description: "Includes assessment and prescription if appropriate",
    },
    ctaHref: "/prescriptions/request?condition=conjunctivitis",
    ctaText: "Get Eye Treatment",
    whenToSeeGP: [
      "Severe pain",
      "Vision changes",
      "Sensitivity to light",
      "Symptoms not improving",
      "Contact lens wearer",
    ],
    faqs: [
      {
        q: "Is conjunctivitis contagious?",
        a: "Viral and bacterial conjunctivitis are very contagious. Allergic conjunctivitis is not. Good hygiene is essential.",
      },
      {
        q: "How long until it clears up?",
        a: "Viral conjunctivitis usually resolves in 1-2 weeks. Bacterial conjunctivitis often improves within 24-48 hours of starting antibiotic drops.",
      },
    ],
    relatedConditions: ["hay-fever"],
  },
  thrush: {
    name: "Thrush",
    slug: "thrush",
    title: "Thrush Treatment Online Australia | Candida | InstantMed",
    h1: "Thrush Treatment Online — Quick and Discreet",
    description:
      "Get thrush treatment online. Prescription antifungal medication for vaginal or oral thrush from Australian doctors.",
    heroSubhead: "Itching, burning, cottage cheese discharge? Let&apos;s get you comfortable again.",
    symptoms: [
      "Itching and irritation",
      "Thick white discharge",
      "Burning sensation",
      "Redness and swelling",
      "Pain during sex or urination",
    ],
    howWeHelp: [
      "Describe your symptoms confidentially",
      "Doctor confirms thrush diagnosis",
      "Antifungal treatment prescribed",
      "Advice on prevention",
    ],
    pricing: { name: "Thrush Consultation", price: "$29.95", description: "Includes assessment and prescription" },
    ctaHref: "/womens-health?condition=thrush",
    ctaText: "Get Thrush Treatment",
    whenToSeeGP: [
      "First time having thrush",
      "Recurrent thrush (4+ times per year)",
      "Symptoms not improving with treatment",
      "Pregnant",
      "Diabetic",
    ],
    faqs: [
      {
        q: "Can men get thrush?",
        a: "Yes, though less common. Men can experience itching, redness, and discharge. Treatment is similar.",
      },
      {
        q: "Why does my thrush keep coming back?",
        a: "Recurrent thrush may be related to antibiotic use, diabetes, or immune factors. See a GP for investigation if thrush occurs 4+ times per year.",
      },
    ],
    relatedConditions: ["uti", "contraception"],
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const condition = conditions[slug]
  if (!condition) return {}

  return {
    title: condition.title,
    description: condition.description,
    keywords: [
      `${condition.name} treatment online`,
      `${condition.name} online doctor australia`,
      `treat ${condition.name} online`,
    ],
    openGraph: {
      title: condition.title,
      description: condition.description,
      url: `https://instantmed.com.au/conditions/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/conditions/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(conditions).map((slug) => ({ slug }))
}

export default async function ConditionPage({ params }: PageProps) {
  const { slug } = await params
  const condition = conditions[slug]

  if (!condition) {
    notFound()
  }

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: condition.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }

  // Medical Condition Schema
  const conditionSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: condition.name,
    description: condition.description,
    signOrSymptom: condition.symptoms.map((s) => ({ "@type": "MedicalSignOrSymptom", name: s })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(conditionSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-[#00E2B5]/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">{condition.h1}</h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">{condition.heroSubhead}</p>
              <Link href={condition.ctaHref}>
                <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C] text-base px-8">
                  {condition.ctaText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                {condition.pricing.price} — {condition.pricing.description}
              </p>
            </div>
          </section>

          {/* Symptoms */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-[#00E2B5]" />
                Common Symptoms
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {condition.symptoms.map((symptom, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-[#00E2B5] shrink-0 mt-0.5" />
                    <span className="text-sm">{symptom}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How We Help */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">How InstantMed Helps</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {condition.howWeHelp.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-background border">
                    <div className="h-7 w-7 rounded-full bg-[#00E2B5]/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#00E2B5]">{i + 1}</span>
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#00E2B5]" />
                  <span>Usually under 1 hour</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#00E2B5]" />
                  <span>AHPRA-registered doctors</span>
                </div>
              </div>
            </div>
          </section>

          {/* When to See a GP */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                When to See a GP In Person
              </h2>
              <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800 mb-4">
                  We&apos;re great for straightforward cases, but some situations need in-person assessment:
                </p>
                <ul className="space-y-2">
                  {condition.whenToSeeGP.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {condition.faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-background border">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6">{condition.pricing.price} — reviewed by Australian doctors</p>
              <Link href={condition.ctaHref}>
                <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                  {condition.ctaText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Related Conditions */}
          {condition.relatedConditions.length > 0 && (
            <section className="px-4 py-8 border-t">
              <div className="mx-auto max-w-3xl">
                <p className="text-sm text-muted-foreground text-center">
                  Related:{" "}
                  {condition.relatedConditions.map((slug, i) => (
                    <span key={slug}>
                      <Link href={`/conditions/${slug}`} className="text-[#00E2B5] hover:underline">
                        {conditions[slug]?.name || slug}
                      </Link>
                      {i < condition.relatedConditions.length - 1 && " • "}
                    </span>
                  ))}
                </p>
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
