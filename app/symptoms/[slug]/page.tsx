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
  },
  "burning-when-urinating": {
    name: "Burning When Urinating",
    slug: "burning-when-urinating",
    description: "Burning, stinging, or pain when you urinate (dysuria) is one of the most common urinary symptoms. Often caused by a UTI, but can have other causes.",
    possibleCauses: [
      {
        name: "Urinary tract infection (UTI)",
        likelihood: "common",
        description: "The most common cause in women. Bacterial infection of the bladder or urethra.",
        whenToSuspect: ["Frequent urination", "Urgency", "Cloudy or strong-smelling urine", "Lower abdominal discomfort"]
      },
      {
        name: "Bladder infection (cystitis)",
        likelihood: "common",
        description: "Inflammation of the bladder, often bacterial.",
        whenToSuspect: ["Same as UTI", "Blood in urine in some cases"]
      },
      {
        name: "Vaginal infection or irritation",
        likelihood: "common",
        description: "Inflammation or infection affecting the urinary opening.",
        whenToSuspect: ["Discharge", "Itching", "Irritation from products"]
      },
      {
        name: "Sexually transmitted infection",
        likelihood: "less-common",
        description: "Chlamydia or gonorrhea can cause burning when urinating.",
        whenToSuspect: ["Recent unprotected sex", "Discharge", "Pain during sex"]
      },
      {
        name: "Kidney stones",
        likelihood: "less-common",
        description: "Stones passing through the urinary tract cause severe pain.",
        whenToSuspect: ["Severe flank pain", "Blood in urine", "Pain comes in waves"]
      }
    ],
    selfCareAdvice: [
      "Drink plenty of water (2-3 litres per day)",
      "Urinate frequently, don't hold it in",
      "Avoid irritating products (bubble bath, harsh soaps)",
      "Urinate after sexual activity",
      "Cranberry products may help prevent UTIs (weak evidence)"
    ],
    whenToSeeDoctor: [
      "Symptoms last more than 2 days",
      "You're male (less common, needs assessment)",
      "Pregnant or might be pregnant",
      "Blood in your urine",
      "Recurrent UTIs (3+ per year)",
      "Pain during sex or unusual discharge"
    ],
    emergencySigns: [
      "High fever (>38.5°C) with chills",
      "Severe back pain or flank pain",
      "Vomiting and unable to keep fluids down",
      "Complete inability to urinate",
      "Confusion or feeling very unwell"
    ],
    relatedSymptoms: ["frequent-urination", "uti", "abdominal-pain"],
    faqs: [
      { q: "Is burning when urinating always a UTI?", a: "No — while UTI is the most common cause in women, other causes include STIs, vaginal irritation, kidney stones, or prostatitis in men. If symptoms don't improve with treatment, further investigation is needed." },
      { q: "Can I treat a UTI without antibiotics?", a: "Simple UTIs typically need antibiotics to clear the infection. Drinking lots of water may help symptoms but won't eliminate the bacteria. Untreated UTIs can spread to kidneys." },
      { q: "When should I see a doctor in person?", a: "See a GP in person if you have fever/chills, blood in urine, severe back pain, vomiting, are pregnant, are male, or have recurrent UTIs." },
      { q: "How quickly should burning improve with treatment?", a: "With appropriate antibiotics for a UTI, most people feel relief within 24-48 hours. If symptoms worsen or don't improve after 2 days, contact your doctor." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get UTI treatment online",
      href: "/request?service=consult&condition=uti"
    }
  },
  "hair-thinning": {
    name: "Hair Thinning",
    slug: "hair-thinning",
    description: "Hair thinning affects about 50% of men by age 50 and many women. Several treatments can slow or reverse hair loss if started early.",
    possibleCauses: [
      {
        name: "Androgenetic alopecia (pattern baldness)",
        likelihood: "common",
        description: "Genetic sensitivity to hormones. Most common cause of hair loss.",
        whenToSuspect: ["Receding hairline (men)", "Thinning at crown", "Widening part (women)", "Family history"]
      },
      {
        name: "Stress (telogen effluvium)",
        likelihood: "common",
        description: "Hair enters shedding phase 2-3 months after stressful event.",
        whenToSuspect: ["Major stress 2-3 months ago", "Sudden shedding", "Usually regrows"]
      },
      {
        name: "Hormonal changes",
        likelihood: "common",
        description: "Menopause, PCOS, thyroid problems can cause thinning.",
        whenToSuspect: ["Women after menopause", "Irregular periods", "Weight changes"]
      },
      {
        name: "Iron deficiency",
        likelihood: "less-common",
        description: "Low iron or ferritin can cause hair loss.",
        whenToSuspect: ["Heavy periods", "Pale skin", "Fatigue"]
      },
      {
        name: "Thyroid problems",
        likelihood: "less-common",
        description: "Both underactive and overactive thyroid can cause thinning.",
        whenToSuspect: ["Weight changes", "Feeling cold", "Dry skin", "Fatigue"]
      }
    ],
    selfCareAdvice: [
      "Gentle hair care — avoid tight hairstyles and excessive heat",
      "Balanced diet with adequate protein and iron",
      "Manage stress through exercise, sleep, relaxation",
      "Avoid smoking — worsens hair loss",
      "Be patient — hair grows slowly (~1cm per month)"
    ],
    whenToSeeDoctor: [
      "Sudden or patchy hair loss",
      "Hair loss with other symptoms (fatigue, weight changes)",
      "Scalp problems (itching, redness, scaling)",
      "Rapid hair loss or facial hair growth (women)",
      "Hair loss affecting your mental health"
    ],
    emergencySigns: [
      "Rapid extensive hair loss",
      "Hair loss with severe scalp pain or discharge",
      "Hair loss with signs of infection"
    ],
    relatedSymptoms: ["fatigue", "stress"],
    faqs: [
      { q: "At what age does hair loss start?", a: "Male pattern baldness can start in the early 20s but is more common from 30s onward. Women typically notice thinning after menopause." },
      { q: "Is hair loss reversible?", a: "It depends on the cause. Androgenetic alopecia can be slowed or partially reversed with treatment, especially if caught early. Stress-related loss usually regrows within 6-9 months." },
      { q: "Do hair loss treatments work?", a: "Yes — clinically proven treatments can help slow hair loss and promote regrowth. Results take 6-12 months. Treatment must be continued to maintain benefits." },
      { q: "Can stress cause hair loss?", a: "Yes — severe stress can cause telogen effluvium, where lots of hair enters the shedding phase at once. This usually happens 2-3 months after the stressful event and regrows within 6-9 months." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get hair loss treatment",
      href: "/request?service=consult"
    }
  },
  "chest-pain": {
    name: "Chest Pain",
    slug: "chest-pain",
    description: "Chest pain can indicate a heart attack or other serious conditions. Many cases are not life-threatening. Knowing the warning signs helps you decide when to seek emergency care.",
    possibleCauses: [
      {
        name: "Anxiety or panic attack",
        likelihood: "common",
        description: "Sharp, stabbing pain that comes and goes. Often stress-related.",
        whenToSuspect: ["Sharp pain", "Comes and goes", "Worse when stressed", "No other cardiac symptoms"]
      },
      {
        name: "Acid reflux (GERD)",
        likelihood: "common",
        description: "Burning pain behind the breastbone, especially after eating.",
        whenToSuspect: ["Burning sensation", "Worse lying down", "After eating", "Responds to antacids"]
      },
      {
        name: "Muscle strain",
        likelihood: "common",
        description: "Chest wall muscle pain, tender to touch.",
        whenToSuspect: ["Tender to touch", "Worse with movement", "Recent physical activity"]
      },
      {
        name: "Costochondritis",
        likelihood: "less-common",
        description: "Inflammation of the rib cartilage.",
        whenToSuspect: ["Pain when breathing deeply", "Tender along breastbone", "No fever"]
      },
      {
        name: "Heart attack",
        likelihood: "rare",
        description: "Medical emergency. Pressure, tightness, or squeezing in chest.",
        whenToSuspect: ["Pressure lasting >5 min", "Spreads to arm/jaw", "Sweating", "Shortness of breath"]
      }
    ],
    selfCareAdvice: [
      "DO NOT self-treat if you think it might be cardiac — call 000",
      "For anxiety: Deep breathing, relaxation techniques",
      "For reflux: Antacids, avoid lying down after eating",
      "For muscle strain: Rest, ice, anti-inflammatories"
    ],
    whenToSeeDoctor: [
      "Recurring chest pain episodes",
      "Chest pain with reflux symptoms",
      "Chest wall tenderness (possible costochondritis)",
      "Persistent cough with chest discomfort",
      "History of anxiety with typical panic symptoms"
    ],
    emergencySigns: [
      "Pressure, tightness, or squeezing in chest",
      "Pain lasting >5 minutes or getting worse",
      "Pain spreading to arm, jaw, neck, or back",
      "Sweating, nausea, or shortness of breath",
      "Feeling like you might faint",
      "Any chest pain if you have heart disease risk factors"
    ],
    relatedSymptoms: ["shortness-of-breath", "anxiety", "heartburn"],
    faqs: [
      { q: "How do I know if chest pain is serious?", a: "Serious chest pain is typically heavy/pressure-like, lasts >5 minutes, comes with sweating/nausea/breathlessness, or spreads to arm/jaw. When in doubt, call 000." },
      { q: "Can anxiety cause chest pain?", a: "Yes — anxiety and panic attacks commonly cause chest pain. It's usually sharp, stabbing, comes and goes quickly. However, if you're not sure, get it checked." },
      { q: "What about heartburn vs heart attack?", a: "Heartburn causes burning pain, gets worse lying down or after eating, and responds to antacids. Heart attack pain is more pressure-like. If unsure, seek emergency care." },
      { q: "When can I see a GP instead of emergency?", a: "See a GP for mild pain that comes and goes, pain that's clearly muscular (tender to touch), or recurring reflux symptoms. Always err on the side of caution." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get follow-up care",
      href: "/request?service=consult"
    }
  },
  "frequent-urination": {
    name: "Frequent Urination",
    slug: "frequent-urination",
    description: "Needing to urinate more often than usual. Can be caused by UTIs, diabetes, prostate issues, anxiety, or simply drinking too much fluid.",
    possibleCauses: [
      {
        name: "Urinary tract infection",
        likelihood: "common",
        description: "Especially if accompanied by pain or burning.",
        whenToSuspect: ["Burning when urinating", "Urgency", "Cloudy urine", "Lower abdominal discomfort"]
      },
      {
        name: "Drinking too much fluid",
        likelihood: "common",
        description: "Especially caffeine, tea, alcohol.",
        whenToSuspect: ["High fluid intake", "Improves when reducing drinks", "No pain"]
      },
      {
        name: "Pregnancy",
        likelihood: "common",
        description: "Uterus presses on bladder.",
        whenToSuspect: ["Pregnant", "Early pregnancy symptom"]
      },
      {
        name: "Anxiety or stress",
        likelihood: "common",
        description: "Fight-or-flight response can increase urination.",
        whenToSuspect: ["Worse when anxious", "No infection symptoms"]
      },
      {
        name: "Type 2 diabetes",
        likelihood: "less-common",
        description: "High blood sugar causes frequent urination.",
        whenToSuspect: ["Excessive thirst", "Unexplained weight loss", "Fatigue"]
      },
      {
        name: "Prostate enlargement (men over 50)",
        likelihood: "less-common",
        description: "BPH can cause frequency and weak stream.",
        whenToSuspect: ["Weak stream", "Difficulty starting", "Men over 50"]
      }
    ],
    selfCareAdvice: [
      "Keep a bladder diary for 2-3 days",
      "Reduce caffeine and alcohol intake",
      "Avoid drinking large amounts before bed",
      "Practice bladder training",
      "Pelvic floor exercises (Kegels) can help"
    ],
    whenToSeeDoctor: [
      "Frequency is new and persistent",
      "Waking 2+ times per night to urinate",
      "Excessive thirst and urination together",
      "Weak urine stream or difficulty starting (men)",
      "Leaking urine",
      "Pain or discomfort"
    ],
    emergencySigns: [
      "Complete inability to urinate",
      "Severe pain with frequency",
      "Fever and back pain (possible kidney infection)",
      "Blood in urine with severe symptoms"
    ],
    relatedSymptoms: ["burning-when-urinating", "uti"],
    faqs: [
      { q: "Is frequent urination a sign of diabetes?", a: "It can be. If you're peeing frequently AND drinking a lot, feeling thirsty, losing weight, or feeling tired, get your blood sugar checked." },
      { q: "How often is too often to urinate?", a: "More than 8 times during the day or waking 2+ times at night is considered frequent. However, 'normal' varies." },
      { q: "Can anxiety cause frequent urination?", a: "Yes — anxiety activates your fight-or-flight response, which can increase urination. Treating the anxiety often helps." },
      { q: "When should I see a doctor?", a: "See a doctor if it's sudden and persistent, you have pain/burning, there's blood in urine, you're very thirsty, or it's disrupting your life." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get assessed online",
      href: "/request?service=consult&condition=uti"
    }
  },
  "nausea": {
    name: "Nausea",
    slug: "nausea",
    description: "Feeling sick to your stomach, often with an urge to vomit. Can have many causes from mild to serious.",
    possibleCauses: [
      { name: "Viral gastroenteritis", likelihood: "common", description: "Stomach bug causing nausea, often with vomiting.", whenToSuspect: ["Recent contact with sick person", "Diarrhoea", "Improves in 1-2 days"] },
      { name: "Motion sickness", likelihood: "common", description: "Nausea from travel or movement.", whenToSuspect: ["In car, boat, or plane", "Better when still"] },
      { name: "Pregnancy", likelihood: "common", description: "Morning sickness in early pregnancy.", whenToSuspect: ["Missed period", "Breast tenderness", "Fatigue"] },
      { name: "Medication side effect", likelihood: "common", description: "Many medications can cause nausea.", whenToSuspect: ["Started new medication", "Worse after taking dose"] },
      { name: "Acid reflux", likelihood: "less-common", description: "Stomach acid can cause nausea.", whenToSuspect: ["Heartburn", "Worse after eating"] },
      { name: "Migraine", likelihood: "less-common", description: "Nausea often accompanies migraines.", whenToSuspect: ["Headache", "Sensitivity to light"] }
    ],
    selfCareAdvice: ["Eat small, bland meals", "Stay hydrated with small sips", "Avoid strong smells", "Ginger may help", "Rest"],
    whenToSeeDoctor: ["Nausea lasting more than 2 days", "Unable to keep fluids down", "Signs of dehydration", "Nausea with abdominal pain", "You need a medical certificate"],
    emergencySigns: ["Severe abdominal pain", "Vomiting blood", "Confusion", "Signs of severe dehydration"],
    relatedSymptoms: ["gastro", "headache", "fatigue"],
    faqs: [
      { q: "Can I get a medical certificate for nausea?", a: "Yes. If nausea is preventing you from working safely (e.g. driving, operating machinery), our doctors can provide a certificate." },
      { q: "When is nausea serious?", a: "Seek urgent care for severe abdominal pain, vomiting blood, confusion, or inability to keep any fluids down for 24 hours." },
      { q: "What helps nausea?", a: "Small sips of water, bland foods, ginger, and avoiding triggers. Some medications can help — a doctor can advise." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" }
  },
  "dizziness": {
    name: "Dizziness",
    slug: "dizziness",
    description: "A feeling of lightheadedness, unsteadiness, or spinning. Can range from mild to disabling.",
    possibleCauses: [
      { name: "Benign paroxysmal positional vertigo (BPPV)", likelihood: "common", description: "Inner ear crystals cause brief spinning when you move.", whenToSuspect: ["Spinning when turning head", "Brief episodes", "No hearing loss"] },
      { name: "Dehydration or low blood pressure", likelihood: "common", description: "Not enough fluid or sudden position change.", whenToSuspect: ["Standing up quickly", "Hot day", "Haven't drunk enough"] },
      { name: "Viral infection", likelihood: "common", description: "Inner ear or general viral illness.", whenToSuspect: ["Recent cold or flu", "Lasts days to weeks"] },
      { name: "Anxiety", likelihood: "common", description: "Stress can cause lightheadedness.", whenToSuspect: ["Worse when stressed", "Hyperventilation"] },
      { name: "Medication side effect", likelihood: "less-common", description: "Some medications cause dizziness.", whenToSuspect: ["Started new medication", "Blood pressure medications"] }
    ],
    selfCareAdvice: ["Move slowly when standing", "Stay hydrated", "Avoid sudden head movements", "Sit or lie down if dizzy"],
    whenToSeeDoctor: ["First episode", "Recurring dizziness", "Dizziness with hearing loss", "You need a medical certificate (unsafe to drive)"],
    emergencySigns: ["Dizziness with chest pain", "Difficulty speaking", "Weakness or numbness", "Severe headache"],
    relatedSymptoms: ["vertigo", "fatigue", "anxiety"],
    faqs: [
      { q: "Can I get a medical certificate for dizziness?", a: "Yes. Dizziness can make driving and many jobs unsafe. Our doctors can provide a certificate." },
      { q: "What's the difference between dizziness and vertigo?", a: "Dizziness is a general term. Vertigo specifically means a spinning sensation. Both need assessment if persistent." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" }
  },
  "runny-nose": {
    name: "Runny Nose",
    slug: "runny-nose",
    description: "Excess mucus from the nose. Usually from colds, allergies, or irritants.",
    possibleCauses: [
      { name: "Common cold", likelihood: "common", description: "Viral infection.", whenToSuspect: ["Other cold symptoms", "Lasts 5-7 days"] },
      { name: "Hay fever", likelihood: "common", description: "Allergic reaction to pollen.", whenToSuspect: ["Seasonal", "Itchy eyes", "Sneezing"] },
      { name: "Flu", likelihood: "common", description: "Influenza virus.", whenToSuspect: ["Fever", "Body aches", "Fatigue"] },
      { name: "Sinusitis", likelihood: "less-common", description: "Sinus infection.", whenToSuspect: ["Facial pressure", "Thick mucus", "Lasts >10 days"] }
    ],
    selfCareAdvice: ["Use saline nasal spray", "Stay hydrated", "Rest", "Steam inhalation"],
    whenToSeeDoctor: ["Symptoms lasting >10 days", "Thick green mucus with fever", "You need a medical certificate"],
    emergencySigns: ["Severe difficulty breathing", "Swelling of face"],
    relatedSymptoms: ["sore-throat", "cough", "fever"],
    faqs: [
      { q: "Can I get a medical certificate for a runny nose?", a: "If combined with other cold/flu symptoms that prevent you from working, yes." },
      { q: "When does a runny nose need antibiotics?", a: "Most runny noses are viral. Antibiotics are only for bacterial sinusitis, which a doctor can assess." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=med-cert" }
  },
  "body-aches": {
    name: "Body Aches",
    slug: "body-aches",
    description: "General muscle pain and discomfort throughout the body. Often accompanies viral infections.",
    possibleCauses: [
      { name: "Flu or viral infection", likelihood: "common", description: "Body aches are classic flu symptoms.", whenToSuspect: ["Fever", "Fatigue", "Respiratory symptoms"] },
      { name: "COVID-19", likelihood: "common", description: "Body aches common with COVID.", whenToSuspect: ["Known exposure", "Other COVID symptoms"] },
      { name: "Overexertion", likelihood: "common", description: "Muscle soreness from exercise.", whenToSuspect: ["Recent intense exercise", "Improves with rest"] },
      { name: "Dehydration", likelihood: "less-common", description: "Can cause muscle cramps and aches.", whenToSuspect: ["Not drinking enough", "Dark urine"] }
    ],
    selfCareAdvice: ["Rest", "Stay hydrated", "Paracetamol or ibuprofen", "Gentle stretching"],
    whenToSeeDoctor: ["Body aches with high fever", "Severe pain", "Lasting more than a week", "You need a medical certificate"],
    emergencySigns: ["Stiff neck with fever", "Severe headache", "Confusion"],
    relatedSymptoms: ["fever", "fatigue", "headache"],
    faqs: [
      { q: "Can I get a medical certificate for body aches?", a: "Yes, especially when part of flu or viral illness that prevents you from working." },
      { q: "How long do flu body aches last?", a: "Usually 3-5 days. Rest and fluids help." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=med-cert" }
  },
  "shortness-of-breath": {
    name: "Shortness of Breath",
    slug: "shortness-of-breath",
    description: "Difficulty breathing or feeling like you can't get enough air. Can indicate serious conditions.",
    possibleCauses: [
      { name: "Anxiety or panic attack", likelihood: "common", description: "Hyperventilation from stress.", whenToSuspect: ["During stress", "Rapid breathing", "Tingling"] },
      { name: "Asthma", likelihood: "common", description: "Airway inflammation.", whenToSuspect: ["Wheezing", "Triggered by exercise or allergens"] },
      { name: "Respiratory infection", likelihood: "common", description: "Cold, flu, or chest infection.", whenToSuspect: ["Cough", "Fever", "Recent illness"] },
      { name: "Anaemia", likelihood: "less-common", description: "Low iron affecting oxygen delivery.", whenToSuspect: ["Fatigue", "Pale skin", "Heavy periods"] },
      { name: "Heart or lung problems", likelihood: "rare", description: "Requires urgent assessment.", whenToSuspect: ["Chest pain", "Swollen legs", "Worse when lying flat"] }
    ],
    selfCareAdvice: ["Sit upright", "Slow breathing", "Avoid triggers if asthma", "DO NOT ignore if severe"],
    whenToSeeDoctor: ["New or worsening breathlessness", "Breathlessness at rest", "With chest pain", "You need a medical certificate"],
    emergencySigns: ["Severe difficulty breathing", "Blue lips or fingertips", "Chest pain", "Unable to speak in full sentences"],
    relatedSymptoms: ["chest-pain", "cough", "anxiety"],
    faqs: [
      { q: "When is shortness of breath an emergency?", a: "Call 000 if severe, sudden, or with chest pain, blue lips, or inability to speak." },
      { q: "Can anxiety cause shortness of breath?", a: "Yes. Panic attacks often cause breathlessness. But new or unexplained breathlessness should be checked." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" }
  },
  "stomach-pain": {
    name: "Stomach Pain",
    slug: "stomach-pain",
    description: "Pain or discomfort in the abdomen. Can have many causes from mild to serious.",
    possibleCauses: [
      { name: "Gastroenteritis", likelihood: "common", description: "Stomach bug.", whenToSuspect: ["Nausea", "Diarrhoea or vomiting", "Cramping"] },
      { name: "Indigestion", likelihood: "common", description: "Overeating or fatty foods.", whenToSuspect: ["After eating", "Bloating", "Heartburn"] },
      { name: "Constipation", likelihood: "common", description: "Blocked bowel.", whenToSuspect: ["Haven't had bowel movement", "Bloating", "Straining"] },
      { name: "Irritable bowel syndrome", likelihood: "common", description: "Recurring abdominal discomfort.", whenToSuspect: ["Recurring", "Related to stress or food", "Bloating"] },
      { name: "Appendicitis", likelihood: "rare", description: "Medical emergency.", whenToSuspect: ["Pain starting near belly button", "Moving to right lower abdomen", "Fever"] }
    ],
    selfCareAdvice: ["Rest", "Sip water", "Avoid solid food if vomiting", "Heat pack may help cramps"],
    whenToSeeDoctor: ["Severe pain", "Pain lasting >24 hours", "Blood in stool or vomit", "You need a medical certificate"],
    emergencySigns: ["Severe sudden pain", "Rigid abdomen", "Vomiting blood", "Fainting"],
    relatedSymptoms: ["gastro", "nausea", "bloating"],
    faqs: [
      { q: "Can I get a medical certificate for stomach pain?", a: "Yes. Stomach pain from gastro or other causes can prevent you from working." },
      { q: "When is stomach pain serious?", a: "Seek urgent care for severe sudden pain, rigid abdomen, vomiting blood, or high fever." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" }
  },
  "neck-pain": {
    name: "Neck Pain",
    slug: "neck-pain",
    description: "Pain or stiffness in the neck. Often from posture, strain, or minor injury.",
    possibleCauses: [
      { name: "Muscle strain", likelihood: "common", description: "Poor posture or overuse.", whenToSuspect: ["Desk work", "Sleeping in odd position", "Tender muscles"] },
      { name: "Tension headache", likelihood: "common", description: "Neck and head tension.", whenToSuspect: ["Stress", "Tight muscles", "Headache"] },
      { name: "Whiplash", likelihood: "less-common", description: "Neck injury from sudden movement.", whenToSuspect: ["Recent car accident", "Fall"] },
      { name: "Pinched nerve", likelihood: "less-common", description: "Nerve compression.", whenToSuspect: ["Pain radiating to arm", "Numbness or tingling"] }
    ],
    selfCareAdvice: ["Gentle stretching", "Heat or ice", "Improve posture", "Pain relief"],
    whenToSeeDoctor: ["Pain after injury", "Numbness or weakness in arms", "Pain lasting >1 week", "You need a medical certificate"],
    emergencySigns: ["Neck pain with fever", "Severe headache", "Difficulty walking", "Loss of bladder control"],
    relatedSymptoms: ["headache", "back-pain", "shoulder-pain"],
    faqs: [
      { q: "Can I get a medical certificate for neck pain?", a: "Yes. Neck pain can prevent driving, computer work, or physical jobs." },
      { q: "When does neck pain need imaging?", a: "Most neck pain doesn't need scans. Imaging is considered if there are red flags or pain persists." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=med-cert" }
  },
  "bloating": {
    name: "Bloating",
    slug: "bloating",
    description: "Feeling of fullness or swelling in the abdomen. Often from gas, diet, or digestive issues.",
    possibleCauses: [
      { name: "Diet and eating habits", likelihood: "common", description: "Eating too fast, carbonated drinks, high-fibre foods.", whenToSuspect: ["After eating", "Certain foods trigger it"] },
      { name: "Irritable bowel syndrome", likelihood: "common", description: "Recurring bloating with other gut symptoms.", whenToSuspect: ["Recurring", "With constipation or diarrhoea"] },
      { name: "Constipation", likelihood: "common", description: "Stool buildup causes distension.", whenToSuspect: ["Infrequent bowel movements", "Straining"] },
      { name: "Food intolerance", likelihood: "less-common", description: "Lactose, gluten, or other intolerances.", whenToSuspect: ["After dairy or wheat", "Recurring pattern"] }
    ],
    selfCareAdvice: ["Eat slowly", "Avoid carbonated drinks", "Limit gas-producing foods", "Regular exercise"],
    whenToSeeDoctor: ["Persistent bloating", "Bloating with weight loss", "Severe pain", "You need a medical certificate"],
    emergencySigns: ["Severe abdominal pain", "Unable to pass gas or stool", "Vomiting"],
    relatedSymptoms: ["stomach-pain", "ibs", "gastro"],
    faqs: [
      { q: "When is bloating serious?", a: "See a doctor if bloating is persistent, accompanied by weight loss, or severe pain. Sudden severe bloating needs urgent assessment." },
      { q: "Can I get a medical certificate for bloating?", a: "If bloating with other symptoms (e.g. IBS flare) severely affects work, yes." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" }
  },
  "earache": {
    name: "Earache",
    slug: "earache",
    description: "Pain in or around the ear. Can be from ear infection, referred pain, or other causes.",
    possibleCauses: [
      { name: "Ear infection (otitis media)", likelihood: "common", description: "Middle ear infection, common in children.", whenToSuspect: ["Recent cold", "Fever", "Pulling at ear (children)"] },
      { name: "Swimmer's ear", likelihood: "common", description: "Outer ear canal infection.", whenToSuspect: ["Recent swimming", "Pain when touching ear"] },
      { name: "Referred pain", likelihood: "common", description: "Pain from throat or jaw.", whenToSuspect: ["Sore throat", "Jaw pain", "Dental issues"] },
      { name: "Eustachian tube blockage", likelihood: "common", description: "From cold or allergies.", whenToSuspect: ["Congestion", "Popping sensation", "Recent flight"] }
    ],
    selfCareAdvice: ["Pain relief", "Warm compress", "Stay upright", "Avoid water in ear if infection"],
    whenToSeeDoctor: ["Earache with fever", "Discharge from ear", "Hearing loss", "Pain lasting >2 days", "You need a medical certificate"],
    emergencySigns: ["Severe pain", "Facial weakness", "High fever with earache", "Swelling behind ear"],
    relatedSymptoms: ["sore-throat", "cold-and-flu", "sinusitis"],
    faqs: [
      { q: "Do I need antibiotics for an ear infection?", a: "Many ear infections are viral and resolve on their own. Antibiotics may be needed for bacterial infections — a doctor can assess." },
      { q: "Can I get a medical certificate for earache?", a: "Yes. Ear infections can be painful and affect concentration. Our doctors can provide a certificate." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" }
  },
  "itching": {
    name: "Itching (Pruritus)",
    slug: "itching",
    description: "Uncomfortable urge to scratch. Can be localised or generalised, from skin conditions or internal causes.",
    possibleCauses: [
      { name: "Dry skin", likelihood: "common", description: "Most common cause of itching.", whenToSuspect: ["Worse in winter", "Improves with moisturiser"] },
      { name: "Eczema", likelihood: "common", description: "Chronic itchy skin condition.", whenToSuspect: ["Recurring", "Dry patches", "Family history"] },
      { name: "Allergic reaction", likelihood: "common", description: "To products, plants, or food.", whenToSuspect: ["New product", "Rash", "Hives"] },
      { name: "Fungal infection", likelihood: "common", description: "Athlete's foot, jock itch, etc.", whenToSuspect: ["Red, scaly patches", "Between toes or in folds"] },
      { name: "Liver or kidney disease", likelihood: "rare", description: "Generalised itching.", whenToSuspect: ["Widespread", "No rash", "Other symptoms"] }
    ],
    selfCareAdvice: ["Moisturise regularly", "Avoid hot showers", "Use gentle soap", "Cool compress"],
    whenToSeeDoctor: ["Itching lasting >2 weeks", "Severe itching", "Itching with rash", "You need a medical certificate"],
    emergencySigns: ["Itching with difficulty breathing", "Swelling of face or throat", "Widespread hives"],
    relatedSymptoms: ["skin-rash", "eczema", "hives"],
    faqs: [
      { q: "When is itching serious?", a: "See a doctor if itching is severe, widespread without rash, or doesn't improve. Itching with breathing difficulty is an emergency." },
      { q: "Can I get a medical certificate for itching?", a: "If severe itching (e.g. from eczema flare) affects sleep or work, yes." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" }
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

      <div className="flex min-h-screen flex-col bg-background dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6 bg-card/80 dark:bg-white/5">
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
          <section className="relative px-4 py-8 sm:py-12 bg-card/80 dark:bg-white/5 border-b border-border dark:border-border">
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
                    className="bg-card/80 dark:bg-white/5 rounded-2xl border border-border dark:border-border p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-lg text-foreground">{cause.name}</h3>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        cause.likelihood === 'common' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : cause.likelihood === 'less-common'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-card/60 text-foreground dark:bg-white/10 dark:text-muted-foreground'
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
                            className="text-sm px-3 py-1 bg-card/60 dark:bg-white/10 rounded-full text-muted-foreground"
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
          <section className="px-4 py-16 bg-card/80 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Self-Care Tips for {symptom.name}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {symptom.selfCareAdvice.map((tip, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-4 bg-card/60 dark:bg-white/5 rounded-xl"
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
          <section className="px-4 py-16 bg-card/80 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {symptom.faqs.map((faq, i) => (
                  <div 
                    key={i}
                    className="bg-card/60 dark:bg-white/5 rounded-xl p-6"
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
