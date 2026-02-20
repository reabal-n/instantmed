import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  Clock, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Stethoscope,
  Star,
  ThermometerSun,
  Activity
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"

// Symptom checker SEO pages - what could be causing your symptom
const symptoms: Record<string, {
  name: string
  slug: string
  description: string
  possibleCauses: Array<{
    name: string
    likelihood: "common" | "less-common" | "rare"
    description: string
    whenToSuspect: string[]
  }>
  selfCareAdvice: string[]
  whenToSeeDoctor: string[]
  emergencySigns: string[]
  relatedSymptoms: string[]
  faqs: Array<{ q: string; a: string }>
  serviceRecommendation: {
    type: "med-cert" | "consult" | "both"
    text: string
    href: string
  }
}> = {
  "sore-throat": {
    name: "Sore Throat",
    slug: "sore-throat",
    description: "Pain, scratchiness, or irritation in the throat that often worsens when swallowing. One of the most common reasons people seek medical advice.",
    possibleCauses: [
      {
        name: "Viral infection (common cold, flu)",
        likelihood: "common",
        description: "The most common cause of sore throats. Usually accompanied by other cold symptoms.",
        whenToSuspect: ["Runny nose", "Cough", "Mild fever", "Body aches", "Gradual onset"]
      },
      {
        name: "Bacterial infection (strep throat)",
        likelihood: "less-common",
        description: "A bacterial infection that may require antibiotic treatment.",
        whenToSuspect: ["Sudden onset", "Severe pain", "High fever", "Swollen glands", "No cough", "White patches on tonsils"]
      },
      {
        name: "Allergies or irritants",
        likelihood: "common",
        description: "Environmental factors like dry air, pollution, or allergens.",
        whenToSuspect: ["Seasonal pattern", "Itchy eyes", "Post-nasal drip", "No fever"]
      },
      {
        name: "Acid reflux (GORD)",
        likelihood: "less-common",
        description: "Stomach acid irritating the throat, especially at night.",
        whenToSuspect: ["Worse in morning", "Heartburn", "Hoarse voice", "Frequent throat clearing"]
      },
      {
        name: "Tonsillitis",
        likelihood: "less-common",
        description: "Infection and inflammation of the tonsils.",
        whenToSuspect: ["Visibly swollen tonsils", "Difficulty swallowing", "Bad breath", "Fever"]
      }
    ],
    selfCareAdvice: [
      "Rest your voice and get plenty of sleep",
      "Stay hydrated with water and warm drinks",
      "Gargle with warm salt water (half teaspoon in a glass)",
      "Use throat lozenges or hard candy",
      "Try honey in warm water or tea (not for children under 1)",
      "Use a humidifier if the air is dry",
      "Avoid smoking and secondhand smoke"
    ],
    whenToSeeDoctor: [
      "Severe sore throat lasting more than a week",
      "Difficulty swallowing or breathing",
      "High fever (over 38.5°C)",
      "Swollen glands in your neck",
      "Rash accompanying the sore throat",
      "Blood in saliva or phlegm",
      "Recurring sore throats",
      "You need a medical certificate for work"
    ],
    emergencySigns: [
      "Severe difficulty breathing or swallowing",
      "Drooling due to inability to swallow",
      "Muffled voice with high fever",
      "Swelling in the neck or tongue",
      "Stiff neck with high fever"
    ],
    relatedSymptoms: ["cough", "fever", "headache", "runny-nose"],
    faqs: [
      {
        q: "Can I get a medical certificate for a sore throat?",
        a: "Yes. If your sore throat is affecting your ability to work, especially if combined with other symptoms like fever or difficulty swallowing, you can get a medical certificate."
      },
      {
        q: "Do I need antibiotics for a sore throat?",
        a: "Most sore throats are viral and don't need antibiotics. Antibiotics are only helpful for bacterial infections like strep throat. A doctor can help determine if you need them."
      },
      {
        q: "How long does a sore throat usually last?",
        a: "Viral sore throats typically improve within 5-7 days. If it lasts longer than a week or is severe, it's worth getting checked."
      },
      {
        q: "Is a sore throat contagious?",
        a: "If caused by a viral or bacterial infection, yes. Good hand hygiene and avoiding close contact can help prevent spreading it."
      }
    ],
    serviceRecommendation: {
      type: "both",
      text: "Get assessed by a doctor",
      href: "/request?service=consult&symptom=sore-throat"
    }
  },
  "headache": {
    name: "Headache",
    slug: "headache",
    description: "Pain in any region of the head, ranging from sharp to dull, that may occur with other symptoms. One of the most common health complaints.",
    possibleCauses: [
      {
        name: "Tension headache",
        likelihood: "common",
        description: "The most common type, often described as a tight band around the head.",
        whenToSuspect: ["Dull, aching pain", "Tightness across forehead or sides", "Tender scalp or neck muscles", "Often related to stress"]
      },
      {
        name: "Migraine",
        likelihood: "common",
        description: "Intense, throbbing headache often with nausea and sensitivity to light.",
        whenToSuspect: ["Throbbing on one side", "Nausea or vomiting", "Sensitivity to light/sound", "Visual disturbances", "Lasts hours to days"]
      },
      {
        name: "Dehydration or hunger",
        likelihood: "common",
        description: "Simple causes that are easily fixed.",
        whenToSuspect: ["Haven't eaten or drunk enough", "Dark urine", "Feels better after eating/drinking"]
      },
      {
        name: "Sinus headache",
        likelihood: "less-common",
        description: "Caused by inflammation in the sinuses.",
        whenToSuspect: ["Pain around cheeks, forehead, nose", "Nasal congestion", "Facial pressure", "Worse bending forward"]
      },
      {
        name: "Medication overuse headache",
        likelihood: "less-common",
        description: "Caused by taking pain relief too frequently.",
        whenToSuspect: ["Taking painkillers more than 2-3 days per week", "Headache returns when medication wears off"]
      }
    ],
    selfCareAdvice: [
      "Rest in a quiet, dark room",
      "Stay hydrated and don't skip meals",
      "Apply a cold or warm compress to your head or neck",
      "Try over-the-counter pain relief (paracetamol or ibuprofen)",
      "Practice relaxation techniques",
      "Limit screen time and take regular breaks",
      "Maintain regular sleep patterns"
    ],
    whenToSeeDoctor: [
      "Headaches becoming more frequent or severe",
      "Headache patterns have changed",
      "Headache interfering with daily life",
      "Needing pain relief more than twice a week",
      "Headache after head injury",
      "Headache with fever and stiff neck",
      "You need time off work due to headaches"
    ],
    emergencySigns: [
      "Sudden, severe headache ('worst headache of your life')",
      "Headache with confusion or difficulty speaking",
      "Headache with vision changes or weakness",
      "Headache with high fever and stiff neck",
      "Headache after a head injury"
    ],
    relatedSymptoms: ["migraine", "neck-pain", "fatigue", "nausea"],
    faqs: [
      {
        q: "When should I worry about a headache?",
        a: "Seek immediate care for sudden severe headaches, headaches with neurological symptoms (confusion, weakness, vision changes), or headaches with fever and stiff neck."
      },
      {
        q: "Can I get a medical certificate for a headache?",
        a: "Yes, particularly for migraines or severe headaches that prevent you from working safely. Our doctors understand that some headaches are debilitating."
      },
      {
        q: "How do I know if it's a migraine?",
        a: "Migraines are typically throbbing, often on one side, and come with nausea, sensitivity to light/sound, or visual disturbances. They usually last 4-72 hours."
      },
      {
        q: "Is it safe to take painkillers for headaches?",
        a: "Occasional use is fine, but taking pain relief more than 2-3 days per week can actually cause more headaches. If you're relying on them frequently, see a doctor."
      }
    ],
    serviceRecommendation: {
      type: "both",
      text: "Speak with a doctor",
      href: "/request?service=consult&symptom=headache"
    }
  },
  "fatigue": {
    name: "Fatigue & Tiredness",
    slug: "fatigue",
    description: "Persistent tiredness or exhaustion that doesn't improve with rest. Can significantly impact work, relationships, and quality of life.",
    possibleCauses: [
      {
        name: "Poor sleep quality",
        likelihood: "common",
        description: "Not getting enough quality sleep, regardless of hours in bed.",
        whenToSuspect: ["Trouble falling or staying asleep", "Waking unrefreshed", "Snoring or breathing pauses"]
      },
      {
        name: "Stress and mental health",
        likelihood: "common",
        description: "Anxiety, depression, and chronic stress are major causes of fatigue.",
        whenToSuspect: ["Feeling overwhelmed", "Low mood", "Difficulty concentrating", "Loss of interest in activities"]
      },
      {
        name: "Lifestyle factors",
        likelihood: "common",
        description: "Diet, exercise, caffeine, and alcohol can all affect energy levels.",
        whenToSuspect: ["Poor diet", "Sedentary lifestyle", "High caffeine or alcohol intake", "Irregular schedule"]
      },
      {
        name: "Anaemia (low iron)",
        likelihood: "less-common",
        description: "Low red blood cells or haemoglobin affecting oxygen delivery.",
        whenToSuspect: ["Pale skin", "Shortness of breath", "Heart palpitations", "Heavy periods (women)"]
      },
      {
        name: "Thyroid problems",
        likelihood: "less-common",
        description: "Underactive thyroid (hypothyroidism) commonly causes fatigue.",
        whenToSuspect: ["Weight gain", "Feeling cold", "Dry skin", "Constipation", "Slow heart rate"]
      },
      {
        name: "Diabetes",
        likelihood: "less-common",
        description: "High blood sugar can cause persistent tiredness.",
        whenToSuspect: ["Increased thirst", "Frequent urination", "Unexplained weight loss", "Blurred vision"]
      }
    ],
    selfCareAdvice: [
      "Aim for 7-9 hours of quality sleep each night",
      "Maintain a consistent sleep schedule",
      "Exercise regularly (but not too close to bedtime)",
      "Eat a balanced diet with regular meals",
      "Limit caffeine, especially after midday",
      "Reduce alcohol consumption",
      "Manage stress through relaxation techniques",
      "Stay hydrated throughout the day"
    ],
    whenToSeeDoctor: [
      "Fatigue lasting more than 2-3 weeks",
      "Fatigue affecting your ability to work or function",
      "Fatigue with unexplained weight changes",
      "Fatigue with other symptoms (fever, pain, etc.)",
      "You need a medical certificate due to fatigue"
    ],
    emergencySigns: [
      "Sudden severe fatigue with chest pain or shortness of breath",
      "Fatigue with confusion or altered consciousness",
      "Fatigue with thoughts of self-harm"
    ],
    relatedSymptoms: ["insomnia", "headache", "muscle-aches", "low-mood"],
    faqs: [
      {
        q: "Can I get a medical certificate for fatigue?",
        a: "Yes, if your fatigue is significantly affecting your ability to work safely or effectively. This might be while underlying causes are being investigated."
      },
      {
        q: "What tests might I need for fatigue?",
        a: "Common tests include full blood count (for anaemia), thyroid function, blood sugar, and sometimes vitamin levels (B12, vitamin D). Your doctor will advise based on your symptoms."
      },
      {
        q: "Is fatigue always a sign of something serious?",
        a: "No, fatigue is very common and often related to lifestyle factors, stress, or minor illnesses. However, persistent unexplained fatigue should be investigated."
      },
      {
        q: "How long does it take to recover from fatigue?",
        a: "It depends on the cause. Lifestyle-related fatigue may improve within weeks of making changes. Medical causes may take longer depending on treatment."
      }
    ],
    serviceRecommendation: {
      type: "both",
      text: "Get assessed by a doctor",
      href: "/request?service=consult&symptom=fatigue"
    }
  },
  "cough": {
    name: "Cough",
    slug: "cough",
    description: "A reflex that helps clear your airways. Can be dry or productive (with mucus), and acute (short-term) or chronic (lasting weeks).",
    possibleCauses: [
      {
        name: "Viral upper respiratory infection",
        likelihood: "common",
        description: "The most common cause, usually with cold or flu symptoms.",
        whenToSuspect: ["Cold symptoms", "Runny nose", "Sore throat", "Mild fever", "Improves within 2-3 weeks"]
      },
      {
        name: "Post-nasal drip",
        likelihood: "common",
        description: "Mucus dripping down the back of the throat from sinuses or allergies.",
        whenToSuspect: ["Frequent throat clearing", "Worse at night", "Nasal congestion", "Allergies"]
      },
      {
        name: "Asthma",
        likelihood: "less-common",
        description: "Airway inflammation causing cough, often worse at night or with exercise.",
        whenToSuspect: ["Wheezing", "Shortness of breath", "Chest tightness", "Worse with exercise or cold air"]
      },
      {
        name: "Acid reflux (GORD)",
        likelihood: "less-common",
        description: "Stomach acid irritating the airways.",
        whenToSuspect: ["Worse after eating or lying down", "Heartburn", "Hoarse voice", "No infection symptoms"]
      },
      {
        name: "Medication side effect",
        likelihood: "less-common",
        description: "Some blood pressure medications (ACE inhibitors) cause a dry cough.",
        whenToSuspect: ["Started after new medication", "Dry, persistent cough", "No other cause found"]
      }
    ],
    selfCareAdvice: [
      "Stay hydrated with water and warm drinks",
      "Honey in warm water can soothe (not for children under 1)",
      "Use a humidifier if air is dry",
      "Avoid irritants like smoke and strong fumes",
      "Try throat lozenges",
      "Sleep with your head slightly elevated",
      "Rest and avoid overexerting yourself"
    ],
    whenToSeeDoctor: [
      "Cough lasting more than 3 weeks",
      "Coughing up blood or rust-colored mucus",
      "Shortness of breath or wheezing",
      "Chest pain when coughing",
      "Unexplained weight loss",
      "Persistent fever",
      "You need a medical certificate for work"
    ],
    emergencySigns: [
      "Severe difficulty breathing",
      "Coughing up large amounts of blood",
      "Chest pain with shortness of breath",
      "Blue lips or fingertips",
      "Confusion or drowsiness"
    ],
    relatedSymptoms: ["sore-throat", "cold-and-flu", "shortness-of-breath", "chest-pain"],
    faqs: [
      {
        q: "When is a cough serious?",
        a: "Seek medical advice for coughs lasting more than 3 weeks, coughing up blood, significant shortness of breath, or if you have underlying lung conditions."
      },
      {
        q: "Can I get a medical certificate for a cough?",
        a: "Yes, particularly if your cough is severe, contagious, or preventing you from working effectively. A doctor can assess if time off is appropriate."
      },
      {
        q: "Do I need antibiotics for a cough?",
        a: "Most coughs are viral and don't need antibiotics. Antibiotics are only helpful if there's a bacterial infection, which your doctor can assess."
      },
      {
        q: "Why is my cough worse at night?",
        a: "Common reasons include post-nasal drip (worse lying down), acid reflux, asthma (often worse at night), and dry air in bedrooms."
      }
    ],
    serviceRecommendation: {
      type: "both",
      text: "Get your cough assessed",
      href: "/request?service=consult&symptom=cough"
    }
  },
  "fever": {
    name: "Fever",
    slug: "fever",
    description: "A body temperature above 38°C (100.4°F). Usually a sign your body is fighting an infection. Common and usually not serious in adults.",
    possibleCauses: [
      {
        name: "Viral infections (cold, flu, COVID)",
        likelihood: "common",
        description: "The most common cause of fever in adults.",
        whenToSuspect: ["Cold/flu symptoms", "Body aches", "Fatigue", "Respiratory symptoms"]
      },
      {
        name: "Bacterial infections",
        likelihood: "less-common",
        description: "Various bacterial infections can cause fever.",
        whenToSuspect: ["Localised symptoms (UTI, skin infection)", "High or persistent fever", "Getting worse over time"]
      },
      {
        name: "COVID-19",
        likelihood: "less-common",
        description: "Fever is a common symptom of COVID-19.",
        whenToSuspect: ["Known exposure", "Loss of taste/smell", "Cough", "Shortness of breath"]
      },
      {
        name: "Inflammatory conditions",
        likelihood: "rare",
        description: "Some inflammatory or autoimmune conditions cause recurrent fevers.",
        whenToSuspect: ["Recurring fevers", "Joint pain", "Rashes", "No infection found"]
      }
    ],
    selfCareAdvice: [
      "Rest and get plenty of sleep",
      "Stay well hydrated with water, clear broths, and electrolyte drinks",
      "Take paracetamol or ibuprofen to reduce fever and discomfort",
      "Wear light clothing and use light bedding",
      "Keep the room at a comfortable temperature",
      "Monitor your temperature regularly"
    ],
    whenToSeeDoctor: [
      "Fever lasting more than 3 days",
      "Temperature above 39.5°C (103°F)",
      "Fever with severe headache or neck stiffness",
      "Fever with rash",
      "Fever with difficulty breathing",
      "Fever with pain when urinating",
      "You need a medical certificate"
    ],
    emergencySigns: [
      "Fever with stiff neck and severe headache",
      "Fever with confusion or altered consciousness",
      "Fever with difficulty breathing",
      "Fever with a widespread rash",
      "Fever after recent surgery or hospitalisation"
    ],
    relatedSymptoms: ["cold-and-flu", "headache", "body-aches", "cough"],
    faqs: [
      {
        q: "What temperature is a fever?",
        a: "A fever is generally considered a temperature of 38°C (100.4°F) or above. Normal body temperature varies slightly throughout the day."
      },
      {
        q: "Should I always try to bring down a fever?",
        a: "Not necessarily. Fever is your body's way of fighting infection. However, if you're uncomfortable or the fever is high, paracetamol or ibuprofen can help."
      },
      {
        q: "Can I get a medical certificate for a fever?",
        a: "Yes. Having a fever is a clear sign you're unwell and potentially contagious. It's a valid reason for a medical certificate."
      },
      {
        q: "When is a fever dangerous?",
        a: "In adults, seek urgent care for temperatures above 39.5°C, fever with severe symptoms (stiff neck, confusion, rash), or fever lasting more than 3 days."
      }
    ],
    serviceRecommendation: {
      type: "both",
      text: "Get assessed now",
      href: "/request?service=consult&symptom=fever"
    }
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const symptom = symptoms[slug]
  if (!symptom) return {}

  const title = `${symptom.name} | Causes, When to See a Doctor | InstantMed`
  const description = `${symptom.description} Learn about possible causes, self-care tips, and when you should see a doctor. Get assessed online by Australian doctors.`

  return {
    title,
    description,
    keywords: [
      `${symptom.name.toLowerCase()} causes`,
      `${symptom.name.toLowerCase()} when to see doctor`,
      `${symptom.name.toLowerCase()} treatment`,
      `${symptom.name.toLowerCase()} symptoms`,
      `what causes ${symptom.name.toLowerCase()}`,
    ],
    openGraph: {
      title: `${symptom.name} - Causes & When to See a Doctor | InstantMed`,
      description: `Understand your ${symptom.name.toLowerCase()} symptoms. Learn possible causes and when to seek medical advice.`,
      url: `https://instantmed.com.au/symptoms/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/symptoms/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(symptoms).map((slug) => ({ slug }))
}

export default async function SymptomPage({ params }: PageProps) {
  const { slug } = await params
  const symptom = symptoms[slug]

  if (!symptom) {
    notFound()
  }

  // Transform FAQs for schema
  const faqSchemaData = symptom.faqs.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      {/* SEO Structured Data */}
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Symptom Checker", url: "https://instantmed.com.au/symptoms" },
          { name: symptom.name, url: `https://instantmed.com.au/symptoms/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-white/50 dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6 bg-white/80 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Symptoms", href: "/symptoms" },
                  { label: symptom.name }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero Section */}
          <section className="relative px-4 py-8 sm:py-12 bg-white/80 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ThermometerSun className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                    {symptom.name}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {symptom.description}
                  </p>
                </div>
              </div>

              {/* Quick CTA */}
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <Button asChild size="lg" className="rounded-full">
                  <Link href={symptom.serviceRecommendation.href}>
                    {symptom.serviceRecommendation.text}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Australian doctors · Response in ~45 mins
                </span>
              </div>
            </div>
          </section>

          {/* Possible Causes Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                What Could Be Causing Your {symptom.name}?
              </h2>
              <p className="text-muted-foreground mb-8">
                There are several possible causes. Here are the most common ones:
              </p>

              <div className="space-y-6">
                {symptom.possibleCauses.map((cause, i) => (
                  <div 
                    key={i}
                    className="bg-white/80 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-lg text-foreground">{cause.name}</h3>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        cause.likelihood === 'common' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : cause.likelihood === 'less-common'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-white/60 text-slate-700 dark:bg-white/10 dark:text-slate-400'
                      }`}>
                        {cause.likelihood === 'common' ? 'Common' : cause.likelihood === 'less-common' ? 'Less common' : 'Rare'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">{cause.description}</p>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">You might suspect this if you have:</p>
                      <div className="flex flex-wrap gap-2">
                        {cause.whenToSuspect.map((sign, j) => (
                          <span 
                            key={j}
                            className="text-sm px-3 py-1 bg-white/60 dark:bg-white/10 rounded-full text-muted-foreground"
                          >
                            {sign}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Important:</strong> This information is for general guidance only and should not be used to self-diagnose. 
                  A doctor can properly assess your symptoms and provide appropriate advice.
                </p>
              </div>
            </div>
          </section>

          {/* Self-Care Advice */}
          <section className="px-4 py-16 bg-white/80 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Self-Care Tips for {symptom.name}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {symptom.selfCareAdvice.map((tip, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-4 bg-white/60 dark:bg-white/5 rounded-xl"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* When to See a Doctor */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* See a doctor */}
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    See a Doctor If
                  </h2>
                  <div className="space-y-3">
                    {symptom.whenToSeeDoctor.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-foreground">
                        <Activity className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <Button asChild className="mt-6 rounded-full">
                    <Link href={symptom.serviceRecommendation.href}>
                      {symptom.serviceRecommendation.text}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Emergency signs */}
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Seek Emergency Care If
                  </h2>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-5">
                    <div className="space-y-3">
                      {symptom.emergencySigns.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                        Call 000 or go to Emergency immediately
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 py-16 bg-white/80 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {symptom.faqs.map((faq, i) => (
                  <div 
                    key={i}
                    className="bg-white/60 dark:bg-white/5 rounded-xl p-6"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-4 py-20 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Concerned About Your Symptoms?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our Australian-registered doctors can assess your symptoms and provide advice, treatment, or medical certificates if needed.
              </p>

              <Button asChild size="lg" className="h-14 px-10 rounded-full">
                <Link href={symptom.serviceRecommendation.href}>
                  {symptom.serviceRecommendation.text}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Response in ~45 mins</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
