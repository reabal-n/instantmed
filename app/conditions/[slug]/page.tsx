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
  FileText,
  Star,
  Users,
  Zap
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"

// Comprehensive condition data for SEO landing pages
const conditions: Record<string, {
  name: string
  slug: string
  description: string
  searchIntent: string
  symptoms: string[]
  whenToSeek: string[]
  whenEmergency: string[]
  canWeHelp: {
    yes: string[]
    no: string[]
  }
  commonQuestions: Array<{ q: string; a: string }>
  relatedConditions: string[]
  serviceType: "med-cert" | "consult" | "both"
  ctaText: string
  ctaHref: string
  stats: {
    avgTime: string
    satisfaction: string
  }
}> = {
  "cold-and-flu": {
    name: "Cold & Flu",
    slug: "cold-and-flu",
    description: "Common viral infections affecting the respiratory system, causing symptoms like runny nose, sore throat, cough, and fatigue.",
    searchIntent: "People searching for cold and flu often need a medical certificate for work or advice on managing symptoms.",
    symptoms: [
      "Runny or blocked nose",
      "Sore throat",
      "Cough (dry or productive)",
      "Headache",
      "Body aches and muscle pain",
      "Fatigue and tiredness",
      "Mild fever",
      "Sneezing"
    ],
    whenToSeek: [
      "Symptoms lasting more than 10 days",
      "High fever (over 39°C) lasting more than 3 days",
      "Symptoms that improve then suddenly worsen",
      "You have underlying health conditions",
      "You need a medical certificate for work or study"
    ],
    whenEmergency: [
      "Difficulty breathing or shortness of breath",
      "Chest pain or pressure",
      "Confusion or altered consciousness",
      "Severe or persistent vomiting",
      "Symptoms in infants under 3 months"
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for time off work or study",
        "Advice on symptom management",
        "Assessment of whether you need further care",
        "Guidance on when to return to work"
      ],
      no: [
        "Antiviral medications (these need to be started within 48 hours and require specific assessment)",
        "Antibiotics (colds and flu are viral, antibiotics don't help)",
        "Treatment if you're experiencing emergency symptoms"
      ]
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for cold and flu?",
        a: "Yes. If you're unwell with cold or flu symptoms and need time off work or study, our doctors can assess your situation and provide a valid medical certificate if appropriate."
      },
      {
        q: "How long should I stay home with the flu?",
        a: "Generally, you should stay home until you've been fever-free for at least 24 hours without using fever-reducing medication. Most people are contagious for 5-7 days after symptoms start."
      },
      {
        q: "Do I need antibiotics for cold and flu?",
        a: "No. Colds and flu are caused by viruses, and antibiotics only work against bacteria. Taking antibiotics for viral infections doesn't help and can contribute to antibiotic resistance."
      },
      {
        q: "When should I see a doctor in person?",
        a: "If you have difficulty breathing, chest pain, confusion, or symptoms that suddenly worsen after improving, seek in-person medical care immediately."
      }
    ],
    relatedConditions: ["sore-throat", "cough", "fever", "headache"],
    serviceType: "both",
    ctaText: "Get a medical certificate",
    ctaHref: "/request?service=med-cert&condition=cold-flu",
    stats: {
      avgTime: "45 mins",
      satisfaction: "4.9/5"
    }
  },
  "gastro": {
    name: "Gastroenteritis",
    slug: "gastro",
    description: "An infection of the stomach and intestines causing vomiting, diarrhea, and stomach cramps. Often called 'gastro' or 'stomach flu'.",
    searchIntent: "People with gastro often need a medical certificate and advice on managing symptoms and preventing dehydration.",
    symptoms: [
      "Nausea and vomiting",
      "Watery diarrhea",
      "Stomach cramps and pain",
      "Low-grade fever",
      "Headache",
      "Muscle aches",
      "Loss of appetite",
      "Fatigue"
    ],
    whenToSeek: [
      "Symptoms lasting more than 2-3 days",
      "Signs of dehydration (dark urine, dizziness, dry mouth)",
      "Unable to keep fluids down for 24 hours",
      "Blood in vomit or stool",
      "You need a medical certificate for work"
    ],
    whenEmergency: [
      "Severe dehydration (confusion, rapid heartbeat, no urination)",
      "Blood in vomit or stool",
      "Severe abdominal pain",
      "High fever over 39°C",
      "Symptoms in very young children or elderly"
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for gastro-related absences",
        "Advice on rehydration and symptom management",
        "Assessment of severity",
        "Guidance on food handlers returning to work"
      ],
      no: [
        "IV fluids for severe dehydration",
        "Treatment for bloody diarrhea (requires in-person assessment)",
        "Care for vulnerable patients with severe symptoms"
      ]
    },
    commonQuestions: [
      {
        q: "How long should I stay home with gastro?",
        a: "You should stay home until 48 hours after your last episode of vomiting or diarrhea. This is especially important if you work with food, healthcare, or childcare."
      },
      {
        q: "Can I get a medical certificate for gastro?",
        a: "Yes. Gastroenteritis is a legitimate reason for a medical certificate. Our doctors can provide one after assessing your symptoms."
      },
      {
        q: "What should I eat and drink with gastro?",
        a: "Focus on clear fluids like water, oral rehydration solutions, and clear broths. Avoid dairy, caffeine, and fatty foods until symptoms resolve. Gradually reintroduce bland foods."
      },
      {
        q: "Is gastro contagious?",
        a: "Yes, very. It spreads through contaminated food, water, and contact with infected people. Good hand hygiene is essential to prevent spreading it to others."
      }
    ],
    relatedConditions: ["food-poisoning", "stomach-pain", "nausea"],
    serviceType: "both",
    ctaText: "Get assessed now",
    ctaHref: "/request?service=med-cert&condition=gastro",
    stats: {
      avgTime: "40 mins",
      satisfaction: "4.8/5"
    }
  },
  "back-pain": {
    name: "Back Pain",
    slug: "back-pain",
    description: "Pain in the upper, middle, or lower back that can range from a dull ache to sharp, debilitating pain. One of the most common reasons for missed work.",
    searchIntent: "People with back pain often need medical certificates, advice on management, and to understand if their condition requires further investigation.",
    symptoms: [
      "Dull, aching pain in the back",
      "Sharp or stabbing pain",
      "Muscle stiffness",
      "Pain that radiates down the leg",
      "Difficulty standing or sitting",
      "Limited range of motion",
      "Muscle spasms"
    ],
    whenToSeek: [
      "Pain lasting more than a few weeks",
      "Pain that doesn't improve with rest",
      "Pain interfering with sleep or daily activities",
      "Numbness or tingling in legs",
      "You need a medical certificate for work"
    ],
    whenEmergency: [
      "Loss of bladder or bowel control",
      "Numbness in the groin or inner thighs",
      "Weakness in both legs",
      "Back pain after a fall or injury",
      "Back pain with fever"
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for back pain",
        "Initial assessment and advice",
        "Guidance on self-management strategies",
        "Referrals for imaging if appropriate"
      ],
      no: [
        "Physical examination (some back conditions need this)",
        "Treatment for suspected serious spinal conditions",
        "Procedures like injections or surgery"
      ]
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for back pain?",
        a: "Yes. Back pain is a common and legitimate reason for time off work. Our doctors can assess your situation and provide a certificate if appropriate."
      },
      {
        q: "Should I rest or stay active with back pain?",
        a: "Current evidence suggests staying moderately active is better than complete bed rest for most back pain. Gentle movement and avoiding aggravating activities is usually recommended."
      },
      {
        q: "When does back pain need imaging?",
        a: "Most back pain doesn't need imaging initially. Scans are typically recommended if pain persists beyond 6 weeks, or if there are 'red flag' symptoms suggesting a serious cause."
      },
      {
        q: "How long does back pain usually last?",
        a: "Most episodes of acute back pain improve within 2-4 weeks. However, some people experience recurring or chronic back pain that may need ongoing management."
      }
    ],
    relatedConditions: ["sciatica", "muscle-strain", "neck-pain"],
    serviceType: "both",
    ctaText: "Get a medical certificate",
    ctaHref: "/request?service=med-cert&condition=back-pain",
    stats: {
      avgTime: "50 mins",
      satisfaction: "4.8/5"
    }
  },
  "migraine": {
    name: "Migraine",
    slug: "migraine",
    description: "A neurological condition causing intense, throbbing headaches often accompanied by nausea, sensitivity to light and sound, and visual disturbances.",
    searchIntent: "People with migraines often need medical certificates, ongoing management advice, and to understand their treatment options.",
    symptoms: [
      "Intense throbbing headache (often one-sided)",
      "Nausea and vomiting",
      "Sensitivity to light (photophobia)",
      "Sensitivity to sound (phonophobia)",
      "Visual disturbances (aura)",
      "Dizziness",
      "Fatigue before and after attack"
    ],
    whenToSeek: [
      "Migraines becoming more frequent",
      "Current medications not working",
      "Migraines affecting work or quality of life",
      "New or different headache pattern",
      "You need a medical certificate"
    ],
    whenEmergency: [
      "Sudden, severe headache ('thunderclap')",
      "Headache with fever and stiff neck",
      "Headache after head injury",
      "Headache with confusion or weakness",
      "First migraine over age 50"
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for migraine attacks",
        "Review of current migraine management",
        "Discussion of preventive options",
        "Referral recommendations if needed"
      ],
      no: [
        "Emergency assessment for new severe headaches",
        "Specialist procedures like Botox injections",
        "In-person neurological examination"
      ]
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for a migraine?",
        a: "Yes. Migraines can be debilitating and are a valid reason for a medical certificate. Our doctors understand that migraines can make work impossible."
      },
      {
        q: "How can I prevent migraines?",
        a: "Common strategies include identifying and avoiding triggers, maintaining regular sleep and meal patterns, staying hydrated, and in some cases, preventive medications."
      },
      {
        q: "What triggers migraines?",
        a: "Common triggers include stress, lack of sleep, certain foods (aged cheese, alcohol, processed foods), hormonal changes, bright lights, and weather changes."
      },
      {
        q: "When should I consider preventive medication?",
        a: "Preventive medication is typically considered if you have 4 or more migraine days per month, if migraines significantly impact your life, or if acute treatments aren't working well."
      }
    ],
    relatedConditions: ["headache", "tension-headache", "cluster-headache"],
    serviceType: "both",
    ctaText: "Speak with a doctor",
    ctaHref: "/request?service=consult&condition=migraine",
    stats: {
      avgTime: "55 mins",
      satisfaction: "4.9/5"
    }
  },
  "anxiety": {
    name: "Anxiety",
    slug: "anxiety",
    description: "A mental health condition involving excessive worry, nervousness, and physical symptoms. Can significantly impact daily life and work performance.",
    searchIntent: "People experiencing anxiety often need support, medical certificates for mental health days, and guidance on management options.",
    symptoms: [
      "Excessive worry or fear",
      "Restlessness or feeling on edge",
      "Difficulty concentrating",
      "Sleep problems",
      "Rapid heartbeat",
      "Sweating or trembling",
      "Fatigue",
      "Muscle tension"
    ],
    whenToSeek: [
      "Anxiety interfering with daily activities",
      "Physical symptoms like chest pain or breathlessness",
      "Difficulty sleeping due to worry",
      "Avoiding situations due to anxiety",
      "You need a mental health day"
    ],
    whenEmergency: [
      "Thoughts of self-harm or suicide",
      "Severe panic attack with chest pain",
      "Unable to function at all",
      "Feeling completely out of control"
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for mental health days",
        "Initial assessment and support",
        "Discussion of management strategies",
        "Referrals to mental health professionals"
      ],
      no: [
        "Ongoing psychological therapy",
        "Crisis intervention",
        "Assessment for severe or complex mental health conditions"
      ]
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for anxiety?",
        a: "Yes. Mental health is just as valid a reason for a medical certificate as physical illness. Our doctors take anxiety seriously and can provide certificates when needed."
      },
      {
        q: "What's the difference between normal worry and anxiety disorder?",
        a: "While everyone worries sometimes, anxiety disorder involves excessive worry that's difficult to control and interferes with daily life for an extended period."
      },
      {
        q: "What are the treatment options for anxiety?",
        a: "Treatment typically includes psychological therapies (like CBT), lifestyle changes, and sometimes medication. The best approach depends on severity and personal preference."
      },
      {
        q: "How can I manage anxiety day-to-day?",
        a: "Strategies include regular exercise, adequate sleep, limiting caffeine and alcohol, breathing exercises, and mindfulness. Professional support can teach you more techniques."
      }
    ],
    relatedConditions: ["stress", "panic-attacks", "depression", "insomnia"],
    serviceType: "both",
    ctaText: "Get support today",
    ctaHref: "/request?service=consult&condition=anxiety",
    stats: {
      avgTime: "60 mins",
      satisfaction: "4.9/5"
    }
  },
  "uti": {
    name: "Urinary Tract Infection (UTI)",
    slug: "uti",
    description: "An infection in any part of the urinary system, most commonly affecting the bladder. More common in women and can cause painful, frequent urination.",
    searchIntent: "People with UTI symptoms often need quick treatment to relieve symptoms and prevent the infection from worsening.",
    symptoms: [
      "Burning sensation when urinating",
      "Frequent urge to urinate",
      "Passing small amounts of urine",
      "Cloudy or strong-smelling urine",
      "Blood in urine",
      "Pelvic pain (women)",
      "Lower abdominal discomfort"
    ],
    whenToSeek: [
      "Symptoms of a UTI (burning, frequency)",
      "Previous UTIs and recognise the symptoms",
      "Mild to moderate symptoms",
      "Need treatment to continue working"
    ],
    whenEmergency: [
      "High fever with chills",
      "Severe back or side pain",
      "Nausea and vomiting",
      "Blood in urine with fever",
      "UTI symptoms during pregnancy"
    ],
    canWeHelp: {
      yes: [
        "Assessment of uncomplicated UTI symptoms",
        "Treatment for straightforward UTIs in women",
        "Medical certificates if needed",
        "Advice on prevention"
      ],
      no: [
        "UTIs in men (these need further investigation)",
        "Complicated or recurrent UTIs",
        "UTIs during pregnancy",
        "UTIs with fever or back pain"
      ]
    },
    commonQuestions: [
      {
        q: "Can I get UTI treatment online?",
        a: "For uncomplicated UTIs in women with typical symptoms, yes. Our doctors can assess your situation and provide appropriate treatment if suitable for telehealth."
      },
      {
        q: "How quickly does UTI treatment work?",
        a: "Most people start feeling better within 1-2 days of starting treatment. It's important to complete the full course even if you feel better."
      },
      {
        q: "How can I prevent UTIs?",
        a: "Stay hydrated, urinate when you need to, wipe front to back, urinate after intercourse, and avoid irritating products in the genital area."
      },
      {
        q: "When is a UTI serious?",
        a: "A UTI is serious if you develop fever, back pain, nausea, or if you're pregnant. These could indicate a kidney infection and need urgent care."
      }
    ],
    relatedConditions: ["kidney-infection", "cystitis"],
    serviceType: "consult",
    ctaText: "Get assessed now",
    ctaHref: "/request?service=consult&condition=uti",
    stats: {
      avgTime: "35 mins",
      satisfaction: "4.9/5"
    }
  },
  "skin-rash": {
    name: "Skin Rash",
    slug: "skin-rash",
    description: "Changes in the skin's appearance including redness, bumps, itching, or scaling. Can have many causes from allergies to infections.",
    searchIntent: "People with skin rashes want to know what's causing it, if it's contagious, and whether they need treatment.",
    symptoms: [
      "Red or discolored patches",
      "Itching or burning",
      "Bumps or blisters",
      "Dry, scaly skin",
      "Swelling",
      "Warmth in affected area",
      "Spreading of the rash"
    ],
    whenToSeek: [
      "Rash that's spreading or worsening",
      "Rash with itching affecting sleep or work",
      "Rash that isn't improving with over-the-counter treatments",
      "Need to know if it's contagious for work purposes"
    ],
    whenEmergency: [
      "Rash with difficulty breathing or swelling of face/throat",
      "Rash with high fever",
      "Rapidly spreading rash with blistering",
      "Rash after starting a new medication"
    ],
    canWeHelp: {
      yes: [
        "Assessment of common rashes via photos",
        "Treatment recommendations for eczema, mild allergic reactions",
        "Medical certificates if rash affects work",
        "Referral recommendations if needed"
      ],
      no: [
        "Rashes requiring biopsy or skin scraping",
        "Complex or unusual rashes",
        "Rashes with systemic symptoms"
      ]
    },
    commonQuestions: [
      {
        q: "Can you diagnose a rash online?",
        a: "Many common rashes can be assessed via clear photos and your description of symptoms. However, some rashes do need in-person examination."
      },
      {
        q: "Is my rash contagious?",
        a: "It depends on the cause. Fungal infections and some viral rashes are contagious, while eczema and allergic reactions are not. A doctor can help determine this."
      },
      {
        q: "Should I cover a rash or let it breathe?",
        a: "This depends on the type of rash. Generally, keeping the area clean and dry is important. Avoid scratching and use gentle, fragrance-free products."
      },
      {
        q: "When should I worry about a rash?",
        a: "Seek urgent care if the rash is accompanied by fever, difficulty breathing, facial swelling, or if it's spreading rapidly with blistering."
      }
    ],
    relatedConditions: ["eczema", "hives", "allergic-reaction"],
    serviceType: "consult",
    ctaText: "Get your rash assessed",
    ctaHref: "/request?service=consult&condition=skin-rash",
    stats: {
      avgTime: "45 mins",
      satisfaction: "4.7/5"
    }
  },
  "insomnia": {
    name: "Insomnia & Sleep Problems",
    slug: "insomnia",
    description: "Difficulty falling asleep, staying asleep, or waking up too early. Can significantly impact energy, mood, health, and work performance.",
    searchIntent: "People with sleep problems want to understand causes, get help with management, and may need medical certificates due to fatigue.",
    symptoms: [
      "Difficulty falling asleep",
      "Waking during the night",
      "Waking too early",
      "Not feeling rested after sleep",
      "Daytime tiredness or fatigue",
      "Difficulty concentrating",
      "Irritability or mood changes"
    ],
    whenToSeek: [
      "Sleep problems lasting more than a few weeks",
      "Fatigue affecting work or driving safety",
      "Sleep issues causing mood problems",
      "You've tried sleep hygiene with no improvement"
    ],
    whenEmergency: [
      "Severe depression or thoughts of self-harm",
      "Breathing stops during sleep (witnessed apnea)",
      "Unable to function due to fatigue"
    ],
    canWeHelp: {
      yes: [
        "Assessment of sleep problems",
        "Discussion of sleep hygiene strategies",
        "Medical certificates for fatigue-related absences",
        "Referral for sleep studies if appropriate"
      ],
      no: [
        "In-lab sleep studies",
        "Treatment for sleep apnea (needs specialist)",
        "Long-term sleeping medication management"
      ]
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for insomnia?",
        a: "Yes, if your sleep problems are significantly affecting your ability to work safely or effectively, this can be a valid reason for a medical certificate."
      },
      {
        q: "What's good sleep hygiene?",
        a: "Key strategies include consistent sleep/wake times, a dark and cool bedroom, limiting screens before bed, avoiding caffeine after midday, and regular exercise (but not too close to bedtime)."
      },
      {
        q: "Should I take sleeping tablets?",
        a: "Sleeping tablets are generally a short-term solution. They can help break a cycle of poor sleep but aren't ideal for long-term use. Other approaches are usually tried first."
      },
      {
        q: "Could my insomnia be caused by something else?",
        a: "Yes, many conditions can cause sleep problems including anxiety, depression, sleep apnea, chronic pain, and certain medications. Identifying the underlying cause is important."
      }
    ],
    relatedConditions: ["anxiety", "fatigue", "stress", "depression"],
    serviceType: "both",
    ctaText: "Speak with a doctor",
    ctaHref: "/request?service=consult&condition=insomnia",
    stats: {
      avgTime: "55 mins",
      satisfaction: "4.8/5"
    }
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const condition = conditions[slug]
  if (!condition) return {}

  const title = `${condition.name} | Online Doctor Assessment | InstantMed`
  const description = `${condition.description} Get assessed by an Australian doctor online. Medical certificates available. Fast, confidential telehealth.`

  return {
    title,
    description,
    keywords: [
      `${condition.name.toLowerCase()} medical certificate`,
      `${condition.name.toLowerCase()} doctor online`,
      `${condition.name.toLowerCase()} telehealth`,
      `${condition.name.toLowerCase()} treatment`,
      `${condition.name.toLowerCase()} symptoms`,
    ],
    openGraph: {
      title: `${condition.name} - Online Doctor Assessment | InstantMed`,
      description: `Get professional medical advice for ${condition.name.toLowerCase()}. Australian doctors available now.`,
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

  // Transform FAQs for schema
  const faqSchemaData = condition.commonQuestions.map(faq => ({
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
          { name: "Conditions", url: "https://instantmed.com.au/conditions" },
          { name: condition.name, url: `https://instantmed.com.au/conditions/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Conditions", href: "/conditions" },
                  { label: condition.name }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero Section */}
          <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="mx-auto max-w-4xl">
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AHPRA Registered Doctors</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Avg. {condition.stats.avgTime} response</span>
                </div>
              </div>

              {/* Main heading */}
              <h1 className="text-4xl sm:text-5xl font-bold text-center text-foreground mb-6 tracking-tight">
                {condition.name}
              </h1>

              <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-8 leading-relaxed">
                {condition.description}
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button asChild size="lg" className="h-14 px-8 text-base font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  From $19.95 · No appointment needed
                </p>
              </div>

              {/* Social proof */}
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <span>AHPRA-registered doctors</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Response in ~{condition.stats.avgTime}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Symptoms Section */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Common Symptoms of {condition.name}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {condition.symptoms.map((symptom, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-4 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-white/50 dark:border-white/10"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{symptom}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Can We Help Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                How We Can Help
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* What we can help with */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    What we can help with
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.yes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What needs in-person care */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    What needs in-person care
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.no.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* When to Seek Help */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* When to see a doctor */}
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    When to see a doctor
                  </h2>
                  <ul className="space-y-3">
                    {condition.whenToSeek.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary">{i + 1}</span>
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Emergency warning */}
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Seek emergency care if
                  </h2>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <ul className="space-y-3">
                      {condition.whenEmergency.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Call 000 or go to your nearest emergency department
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Common Questions About {condition.name}
              </h2>

              <div className="space-y-4">
                {condition.commonQuestions.map((faq, i) => (
                  <div 
                    key={i}
                    className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl p-6"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="px-4 py-20 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to get help?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our Australian-registered doctors are available now. Most consultations completed within an hour.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="h-14 px-10 text-base font-semibold rounded-full shadow-lg shadow-primary/25">
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>

              {/* Trust signals */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Valid certificates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>~{condition.stats.avgTime} response</span>
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
