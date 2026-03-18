/**
 * Condition pages data - SEO landing pages for health conditions
 * Single source of truth for app/conditions/[slug]
 */

export interface ConditionData {
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
}

export const conditionsData: Record<string, ConditionData> = {
  "cold-and-flu": {
    name: "Cold & Flu",
    slug: "cold-and-flu",
    description:
      "Common viral infections affecting the respiratory system, causing symptoms like runny nose, sore throat, cough, and fatigue.",
    searchIntent:
      "People searching for cold and flu often need a medical certificate for work or advice on managing symptoms.",
    symptoms: [
      "Runny or blocked nose",
      "Sore throat",
      "Cough (dry or productive)",
      "Headache",
      "Body aches and muscle pain",
      "Fatigue and tiredness",
      "Mild fever",
      "Sneezing",
    ],
    whenToSeek: [
      "Symptoms lasting more than 10 days",
      "High fever (over 39°C) lasting more than 3 days",
      "Symptoms that improve then suddenly worsen",
      "You have underlying health conditions",
      "You need a medical certificate for work or study",
    ],
    whenEmergency: [
      "Difficulty breathing or shortness of breath",
      "Chest pain or pressure",
      "Confusion or altered consciousness",
      "Severe or persistent vomiting",
      "Symptoms in infants under 3 months",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for time off work or study",
        "Advice on symptom management",
        "Assessment of whether you need further care",
        "Guidance on when to return to work",
      ],
      no: [
        "Antiviral medications (these need to be started within 48 hours and require specific assessment)",
        "Antibiotics (colds and flu are viral, antibiotics don't help)",
        "Treatment if you're experiencing emergency symptoms",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for cold and flu?",
        a: "Yes. If you're unwell with cold or flu symptoms and need time off work or study, our doctors can assess your situation and provide a valid medical certificate if appropriate.",
      },
      {
        q: "How long should I stay home with the flu?",
        a: "Generally, you should stay home until you've been fever-free for at least 24 hours without using fever-reducing medication. Most people are contagious for 5-7 days after symptoms start.",
      },
      {
        q: "Do I need antibiotics for cold and flu?",
        a: "No. Colds and flu are caused by viruses, and antibiotics only work against bacteria. Taking antibiotics for viral infections doesn't help and can contribute to antibiotic resistance.",
      },
      {
        q: "When should I see a doctor in person?",
        a: "If you have difficulty breathing, chest pain, confusion, or symptoms that suddenly worsen after improving, seek in-person medical care immediately.",
      },
    ],
    relatedConditions: ["sore-throat", "cough", "fever", "headache"],
    serviceType: "both",
    ctaText: "Get a medical certificate",
    ctaHref: "/request?service=med-cert&condition=cold-flu",
    stats: { avgTime: "45 mins", satisfaction: "4.9/5" },
  },
  gastro: {
    name: "Gastroenteritis",
    slug: "gastro",
    description:
      "An infection of the stomach and intestines causing vomiting, diarrhea, and stomach cramps. Often called 'gastro' or 'stomach flu'.",
    searchIntent:
      "People with gastro often need a medical certificate and advice on managing symptoms and preventing dehydration.",
    symptoms: [
      "Nausea and vomiting",
      "Watery diarrhea",
      "Stomach cramps and pain",
      "Low-grade fever",
      "Headache",
      "Muscle aches",
      "Loss of appetite",
      "Fatigue",
    ],
    whenToSeek: [
      "Symptoms lasting more than 2-3 days",
      "Signs of dehydration (dark urine, dizziness, dry mouth)",
      "Unable to keep fluids down for 24 hours",
      "Blood in vomit or stool",
      "You need a medical certificate for work",
    ],
    whenEmergency: [
      "Severe dehydration (confusion, rapid heartbeat, no urination)",
      "Blood in vomit or stool",
      "Severe abdominal pain",
      "High fever over 39°C",
      "Symptoms in very young children or elderly",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for gastro-related absences",
        "Advice on rehydration and symptom management",
        "Assessment of severity",
        "Guidance on food handlers returning to work",
      ],
      no: [
        "IV fluids for severe dehydration",
        "Treatment for bloody diarrhea (requires in-person assessment)",
        "Care for vulnerable patients with severe symptoms",
      ],
    },
    commonQuestions: [
      {
        q: "How long should I stay home with gastro?",
        a: "You should stay home until 48 hours after your last episode of vomiting or diarrhea. This is especially important if you work with food, healthcare, or childcare.",
      },
      {
        q: "Can I get a medical certificate for gastro?",
        a: "Yes. Gastroenteritis is a legitimate reason for a medical certificate. Our doctors can provide one after assessing your symptoms.",
      },
      {
        q: "What should I eat and drink with gastro?",
        a: "Focus on clear fluids like water, oral rehydration solutions, and clear broths. Avoid dairy, caffeine, and fatty foods until symptoms resolve. Gradually reintroduce bland foods.",
      },
      {
        q: "Is gastro contagious?",
        a: "Yes, very. It spreads through contaminated food, water, and contact with infected people. Good hand hygiene is essential to prevent spreading it to others.",
      },
    ],
    relatedConditions: ["food-poisoning", "stomach-pain", "nausea"],
    serviceType: "both",
    ctaText: "Get assessed now",
    ctaHref: "/request?service=med-cert&condition=gastro",
    stats: { avgTime: "40 mins", satisfaction: "4.8/5" },
  },
  "back-pain": {
    name: "Back Pain",
    slug: "back-pain",
    description:
      "Pain in the upper, middle, or lower back that can range from a dull ache to sharp, debilitating pain. One of the most common reasons for missed work.",
    searchIntent:
      "People with back pain often need medical certificates, advice on management, and to understand if their condition requires further investigation.",
    symptoms: [
      "Dull, aching pain in the back",
      "Sharp or stabbing pain",
      "Muscle stiffness",
      "Pain that radiates down the leg",
      "Difficulty standing or sitting",
      "Limited range of motion",
      "Muscle spasms",
    ],
    whenToSeek: [
      "Pain lasting more than a few weeks",
      "Pain that doesn't improve with rest",
      "Pain interfering with sleep or daily activities",
      "Numbness or tingling in legs",
      "You need a medical certificate for work",
    ],
    whenEmergency: [
      "Loss of bladder or bowel control",
      "Numbness in the groin or inner thighs",
      "Weakness in both legs",
      "Back pain after a fall or injury",
      "Back pain with fever",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for back pain",
        "Initial assessment and advice",
        "Guidance on self-management strategies",
        "Referrals for imaging if appropriate",
      ],
      no: [
        "Physical examination (some back conditions need this)",
        "Treatment for suspected serious spinal conditions",
        "Procedures like injections or surgery",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for back pain?",
        a: "Yes. Back pain is a common and legitimate reason for time off work. Our doctors can assess your situation and provide a certificate if appropriate.",
      },
      {
        q: "Should I rest or stay active with back pain?",
        a: "Current evidence suggests staying moderately active is better than complete bed rest for most back pain. Gentle movement and avoiding aggravating activities is usually recommended.",
      },
      {
        q: "When does back pain need imaging?",
        a: "Most back pain doesn't need imaging initially. Scans are typically recommended if pain persists beyond 6 weeks, or if there are 'red flag' symptoms suggesting a serious cause.",
      },
      {
        q: "How long does back pain usually last?",
        a: "Most episodes of acute back pain improve within 2-4 weeks. However, some people experience recurring or chronic back pain that may need ongoing management.",
      },
    ],
    relatedConditions: ["sciatica", "muscle-strain", "neck-pain"],
    serviceType: "both",
    ctaText: "Get a medical certificate",
    ctaHref: "/request?service=med-cert&condition=back-pain",
    stats: { avgTime: "50 mins", satisfaction: "4.8/5" },
  },
  migraine: {
    name: "Migraine",
    slug: "migraine",
    description:
      "A neurological condition causing intense, throbbing headaches often accompanied by nausea, sensitivity to light and sound, and visual disturbances.",
    searchIntent:
      "People with migraines often need medical certificates, ongoing management advice, and to understand their treatment options.",
    symptoms: [
      "Intense throbbing headache (often one-sided)",
      "Nausea and vomiting",
      "Sensitivity to light (photophobia)",
      "Sensitivity to sound (phonophobia)",
      "Visual disturbances (aura)",
      "Dizziness",
      "Fatigue before and after attack",
    ],
    whenToSeek: [
      "Migraines becoming more frequent",
      "Current medications not working",
      "Migraines affecting work or quality of life",
      "New or different headache pattern",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Sudden, severe headache ('thunderclap')",
      "Headache with fever and stiff neck",
      "Headache after head injury",
      "Headache with confusion or weakness",
      "First migraine over age 50",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for migraine attacks",
        "Review of current migraine management",
        "Discussion of preventive options",
        "Referral recommendations if needed",
      ],
      no: [
        "Emergency assessment for new severe headaches",
        "Specialist procedures like Botox injections",
        "In-person neurological examination",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for a migraine?",
        a: "Yes. Migraines can be debilitating and are a valid reason for a medical certificate. Our doctors understand that migraines can make work impossible.",
      },
      {
        q: "How can I prevent migraines?",
        a: "Common strategies include identifying and avoiding triggers, maintaining regular sleep and meal patterns, staying hydrated, and in some cases, preventive medications.",
      },
      {
        q: "What triggers migraines?",
        a: "Common triggers include stress, lack of sleep, certain foods (aged cheese, alcohol, processed foods), hormonal changes, bright lights, and weather changes.",
      },
      {
        q: "When should I consider preventive medication?",
        a: "Preventive medication is typically considered if you have 4 or more migraine days per month, if migraines significantly impact your life, or if acute treatments aren't working well.",
      },
    ],
    relatedConditions: ["headache", "tension-headache", "cluster-headache"],
    serviceType: "both",
    ctaText: "Speak with a doctor",
    ctaHref: "/request?service=consult&condition=migraine",
    stats: { avgTime: "55 mins", satisfaction: "4.9/5" },
  },
  anxiety: {
    name: "Anxiety",
    slug: "anxiety",
    description:
      "A mental health condition involving excessive worry, nervousness, and physical symptoms. Can significantly impact daily life and work performance.",
    searchIntent:
      "People experiencing anxiety often need support, medical certificates for mental health days, and guidance on management options.",
    symptoms: [
      "Excessive worry or fear",
      "Restlessness or feeling on edge",
      "Difficulty concentrating",
      "Sleep problems",
      "Rapid heartbeat",
      "Sweating or trembling",
      "Fatigue",
      "Muscle tension",
    ],
    whenToSeek: [
      "Anxiety interfering with daily activities",
      "Physical symptoms like chest pain or breathlessness",
      "Difficulty sleeping due to worry",
      "Avoiding situations due to anxiety",
      "You need a mental health day",
    ],
    whenEmergency: [
      "Thoughts of self-harm or suicide",
      "Severe panic attack with chest pain",
      "Unable to function at all",
      "Feeling completely out of control",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for mental health days",
        "Initial assessment and support",
        "Discussion of management strategies",
        "Referrals to mental health professionals",
      ],
      no: [
        "Ongoing psychological therapy",
        "Crisis intervention",
        "Assessment for severe or complex mental health conditions",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for anxiety?",
        a: "Yes. Mental health is just as valid a reason for a medical certificate as physical illness. Our doctors take anxiety seriously and can provide certificates when needed.",
      },
      {
        q: "What's the difference between normal worry and anxiety disorder?",
        a: "While everyone worries sometimes, anxiety disorder involves excessive worry that's difficult to control and interferes with daily life for an extended period.",
      },
      {
        q: "What are the treatment options for anxiety?",
        a: "Treatment typically includes psychological therapies (like CBT), lifestyle changes, and sometimes medication. The best approach depends on severity and personal preference.",
      },
      {
        q: "How can I manage anxiety day-to-day?",
        a: "Strategies include regular exercise, adequate sleep, limiting caffeine and alcohol, breathing exercises, and mindfulness. Professional support can teach you more techniques.",
      },
    ],
    relatedConditions: ["stress", "panic-attacks", "depression", "insomnia"],
    serviceType: "both",
    ctaText: "Get support today",
    ctaHref: "/request?service=consult&condition=anxiety",
    stats: { avgTime: "60 mins", satisfaction: "4.9/5" },
  },
  uti: {
    name: "Urinary Tract Infection (UTI)",
    slug: "uti",
    description:
      "An infection in any part of the urinary system, most commonly affecting the bladder. More common in women and can cause painful, frequent urination.",
    searchIntent:
      "People with UTI symptoms often need quick treatment to relieve symptoms and prevent the infection from worsening.",
    symptoms: [
      "Burning sensation when urinating",
      "Frequent urge to urinate",
      "Passing small amounts of urine",
      "Cloudy or strong-smelling urine",
      "Blood in urine",
      "Pelvic pain (women)",
      "Lower abdominal discomfort",
    ],
    whenToSeek: [
      "Symptoms of a UTI (burning, frequency)",
      "Previous UTIs and recognise the symptoms",
      "Mild to moderate symptoms",
      "Need treatment to continue working",
    ],
    whenEmergency: [
      "High fever with chills",
      "Severe back or side pain",
      "Nausea and vomiting",
      "Blood in urine with fever",
      "UTI symptoms during pregnancy",
    ],
    canWeHelp: {
      yes: [
        "Assessment of uncomplicated UTI symptoms",
        "Treatment for straightforward UTIs in women",
        "Medical certificates if needed",
        "Advice on prevention",
      ],
      no: [
        "UTIs in men (these need further investigation)",
        "Complicated or recurrent UTIs",
        "UTIs during pregnancy",
        "UTIs with fever or back pain",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get UTI treatment online?",
        a: "For uncomplicated UTIs in women with typical symptoms, yes. Our doctors can assess your situation and provide appropriate treatment if suitable for telehealth.",
      },
      {
        q: "How quickly does UTI treatment work?",
        a: "Most people start feeling better within 1-2 days of starting treatment. It's important to complete the full course even if you feel better.",
      },
      {
        q: "How can I prevent UTIs?",
        a: "Stay hydrated, urinate when you need to, wipe front to back, urinate after intercourse, and avoid irritating products in the genital area.",
      },
      {
        q: "When is a UTI serious?",
        a: "A UTI is serious if you develop fever, back pain, nausea, or if you're pregnant. These could indicate a kidney infection and need urgent care.",
      },
    ],
    relatedConditions: ["kidney-infection", "cystitis"],
    serviceType: "consult",
    ctaText: "Get assessed now",
    ctaHref: "/request?service=consult&condition=uti",
    stats: { avgTime: "35 mins", satisfaction: "4.9/5" },
  },
  "skin-rash": {
    name: "Skin Rash",
    slug: "skin-rash",
    description:
      "Changes in the skin's appearance including redness, bumps, itching, or scaling. Can have many causes from allergies to infections.",
    searchIntent:
      "People with skin rashes want to know what's causing it, if it's contagious, and whether they need treatment.",
    symptoms: [
      "Red or discolored patches",
      "Itching or burning",
      "Bumps or blisters",
      "Dry, scaly skin",
      "Swelling",
      "Warmth in affected area",
      "Spreading of the rash",
    ],
    whenToSeek: [
      "Rash that's spreading or worsening",
      "Rash with itching affecting sleep or work",
      "Rash that isn't improving with over-the-counter treatments",
      "Need to know if it's contagious for work purposes",
    ],
    whenEmergency: [
      "Rash with difficulty breathing or swelling of face/throat",
      "Rash with high fever",
      "Rapidly spreading rash with blistering",
      "Rash after starting a new medication",
    ],
    canWeHelp: {
      yes: [
        "Assessment of common rashes via photos",
        "Treatment recommendations for eczema, mild allergic reactions",
        "Medical certificates if rash affects work",
        "Referral recommendations if needed",
      ],
      no: [
        "Rashes requiring biopsy or skin scraping",
        "Complex or unusual rashes",
        "Rashes with systemic symptoms",
      ],
    },
    commonQuestions: [
      {
        q: "Can you diagnose a rash online?",
        a: "Many common rashes can be assessed via clear photos and your description of symptoms. However, some rashes do need in-person examination.",
      },
      {
        q: "Is my rash contagious?",
        a: "It depends on the cause. Fungal infections and some viral rashes are contagious, while eczema and allergic reactions are not. A doctor can help determine this.",
      },
      {
        q: "Should I cover a rash or let it breathe?",
        a: "This depends on the type of rash. Generally, keeping the area clean and dry is important. Avoid scratching and use gentle, fragrance-free products.",
      },
      {
        q: "When should I worry about a rash?",
        a: "Seek urgent care if the rash is accompanied by fever, difficulty breathing, facial swelling, or if it's spreading rapidly with blistering.",
      },
    ],
    relatedConditions: ["eczema", "hives", "allergic-reaction"],
    serviceType: "consult",
    ctaText: "Get your rash assessed",
    ctaHref: "/request?service=consult&condition=skin-rash",
    stats: { avgTime: "45 mins", satisfaction: "4.7/5" },
  },
  insomnia: {
    name: "Insomnia & Sleep Problems",
    slug: "insomnia",
    description:
      "Difficulty falling asleep, staying asleep, or waking up too early. Can significantly impact energy, mood, health, and work performance.",
    searchIntent:
      "People with sleep problems want to understand causes, get help with management, and may need medical certificates due to fatigue.",
    symptoms: [
      "Difficulty falling asleep",
      "Waking during the night",
      "Waking too early",
      "Not feeling rested after sleep",
      "Daytime tiredness or fatigue",
      "Difficulty concentrating",
      "Irritability or mood changes",
    ],
    whenToSeek: [
      "Sleep problems lasting more than a few weeks",
      "Fatigue affecting work or driving safety",
      "Sleep issues causing mood problems",
      "You've tried sleep hygiene with no improvement",
    ],
    whenEmergency: [
      "Severe depression or thoughts of self-harm",
      "Breathing stops during sleep (witnessed apnea)",
      "Unable to function due to fatigue",
    ],
    canWeHelp: {
      yes: [
        "Assessment of sleep problems",
        "Discussion of sleep hygiene strategies",
        "Medical certificates for fatigue-related absences",
        "Referral for sleep studies if appropriate",
      ],
      no: [
        "In-lab sleep studies",
        "Treatment for sleep apnea (needs specialist)",
        "Long-term sleeping medication management",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for insomnia?",
        a: "Yes, if your sleep problems are significantly affecting your ability to work safely or effectively, this can be a valid reason for a medical certificate.",
      },
      {
        q: "What's good sleep hygiene?",
        a: "Key strategies include consistent sleep/wake times, a dark and cool bedroom, limiting screens before bed, avoiding caffeine after midday, and regular exercise (but not too close to bedtime).",
      },
      {
        q: "Should I take sleeping tablets?",
        a: "Sleeping tablets are generally a short-term solution. They can help break a cycle of poor sleep but aren't ideal for long-term use. Other approaches are usually tried first.",
      },
      {
        q: "Could my insomnia be caused by something else?",
        a: "Yes, many conditions can cause sleep problems including anxiety, depression, sleep apnea, chronic pain, and certain medications. Identifying the underlying cause is important.",
      },
    ],
    relatedConditions: ["anxiety", "fatigue", "stress", "depression"],
    serviceType: "both",
    ctaText: "Speak with a doctor",
    ctaHref: "/request?service=consult&condition=insomnia",
    stats: { avgTime: "55 mins", satisfaction: "4.8/5" },
  },
  // --- NEW CONDITIONS (Phase 2a expansion) ---
  "hay-fever": {
    name: "Hay Fever (Allergic Rhinitis)",
    slug: "hay-fever",
    description:
      "An allergic reaction to airborne particles like pollen, causing sneezing, runny nose, itchy eyes, and congestion. Affects around 1 in 5 Australians.",
    searchIntent:
      "People with hay fever often need relief from symptoms and medical certificates when allergies severely affect work or study.",
    symptoms: [
      "Sneezing",
      "Runny or blocked nose",
      "Itchy, watery eyes",
      "Itchy throat or ears",
      "Post-nasal drip",
      "Fatigue",
      "Reduced sense of smell",
    ],
    whenToSeek: [
      "Symptoms not controlled by over-the-counter treatments",
      "Allergies affecting work or study",
      "Asthma worsening during allergy season",
      "You need a medical certificate for allergy-related absence",
    ],
    whenEmergency: [
      "Severe difficulty breathing",
      "Swelling of face, lips, or throat",
      "Anaphylaxis (rare with hay fever)",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates when allergies severely affect ability to work",
        "Discussion of treatment options (antihistamines, nasal sprays)",
        "Referral for allergy testing if needed",
        "Advice on managing symptoms",
      ],
      no: [
        "Allergy testing (requires in-person or specialist)",
        "Immunotherapy (allergy shots) — requires specialist",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for hay fever?",
        a: "Yes, if your allergies are severely affecting your ability to work (e.g. severe symptoms, need for rest, medication side effects), our doctors can provide a certificate.",
      },
      {
        q: "What's the best treatment for hay fever?",
        a: "Antihistamines, corticosteroid nasal sprays, and avoiding triggers are first-line. Your doctor can recommend the best option for your symptoms.",
      },
      {
        q: "When is hay fever season in Australia?",
        a: "It varies by region. Spring (September-November) is peak for grass pollen. Some areas have year-round allergens.",
      },
      {
        q: "Can hay fever cause fatigue?",
        a: "Yes — poor sleep from congestion, inflammation, and medication can all contribute to fatigue during allergy season.",
      },
    ],
    relatedConditions: ["cold-and-flu", "sinusitis", "asthma"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=hay-fever",
    stats: { avgTime: "45 mins", satisfaction: "4.8/5" },
  },
  sinusitis: {
    name: "Sinusitis",
    slug: "sinusitis",
    description:
      "Inflammation of the sinuses, usually from infection or allergies. Causes facial pressure, congestion, and headache.",
    searchIntent:
      "People with sinusitis need relief from symptoms and sometimes medical certificates when it affects work.",
    symptoms: [
      "Facial pressure or pain",
      "Blocked or runny nose",
      "Reduced sense of smell",
      "Headache (worse when bending forward)",
      "Thick yellow or green mucus",
      "Cough (especially at night)",
      "Fatigue",
    ],
    whenToSeek: [
      "Symptoms lasting more than 10 days",
      "Symptoms that improve then worsen",
      "Severe facial pain or headache",
      "High fever",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Severe headache with stiff neck",
      "Swelling around eyes",
      "Confusion or vision changes",
      "Difficulty breathing",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for sinusitis-related absence",
        "Assessment of whether antibiotics are needed",
        "Advice on decongestants and nasal irrigation",
        "Referral if symptoms persist",
      ],
      no: [
        "Sinus procedures or imaging",
        "Treatment for chronic or recurrent sinusitis (may need ENT)",
      ],
    },
    commonQuestions: [
      {
        q: "Do I need antibiotics for sinusitis?",
        a: "Most sinusitis is viral and doesn't need antibiotics. Bacterial sinusitis may need them if symptoms persist beyond 10 days or worsen. A doctor can assess.",
      },
      {
        q: "Can I get a medical certificate for sinusitis?",
        a: "Yes. Sinusitis can cause significant discomfort and affect concentration. Our doctors can provide a certificate if appropriate.",
      },
      {
        q: "What helps sinus pressure?",
        a: "Steam, saline nasal irrigation, decongestants, and pain relief can help. Avoid flying when congested — it can worsen sinus pressure.",
      },
      {
        q: "How long does sinusitis last?",
        a: "Acute sinusitis usually improves within 2-3 weeks. Chronic sinusitis lasts 12+ weeks and may need specialist referral.",
      },
    ],
    relatedConditions: ["cold-and-flu", "hay-fever", "headache"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=sinusitis",
    stats: { avgTime: "45 mins", satisfaction: "4.8/5" },
  },
  conjunctivitis: {
    name: "Conjunctivitis (Pink Eye)",
    slug: "conjunctivitis",
    description:
      "Inflammation of the conjunctiva (eye lining), causing redness, itching, and discharge. Can be viral, bacterial, or allergic.",
    searchIntent:
      "People with pink eye want to know if it's contagious, how to treat it, and whether they need time off work.",
    symptoms: [
      "Red or pink eyes",
      "Itchy or gritty sensation",
      "Watery or sticky discharge",
      "Swollen eyelids",
      "Sensitivity to light",
      "Blurred vision (usually mild)",
    ],
    whenToSeek: [
      "Eye pain or severe discomfort",
      "Vision changes",
      "Symptoms not improving after a few days",
      "Wearing contact lenses",
      "You need a medical certificate (contagious for work)",
    ],
    whenEmergency: [
      "Severe eye pain",
      "Sudden vision loss",
      "Chemical splash in eye",
      "Deep eye injury",
    ],
    canWeHelp: {
      yes: [
        "Assessment of conjunctivitis type (viral vs bacterial)",
        "Treatment recommendations",
        "Medical certificates when contagious (e.g. childcare, healthcare workers)",
        "Advice on when to return to work",
      ],
      no: [
        "Eye examination with equipment",
        "Treatment for severe or complicated eye conditions",
      ],
    },
    commonQuestions: [
      {
        q: "Is pink eye contagious?",
        a: "Viral and bacterial conjunctivitis are contagious. Allergic conjunctivitis is not. Good hand hygiene and avoiding touching eyes helps prevent spread.",
      },
      {
        q: "How long should I stay home with pink eye?",
        a: "For bacterial conjunctivitis, until 24 hours after starting antibiotics. For viral, while symptoms are severe. Some workplaces (childcare, healthcare) have stricter rules.",
      },
      {
        q: "Do I need antibiotics for pink eye?",
        a: "Bacterial conjunctivitis often improves with antibiotic drops. Viral conjunctivitis doesn't need antibiotics — it resolves on its own.",
      },
      {
        q: "Can I get a medical certificate for pink eye?",
        a: "Yes, especially if you work in childcare, healthcare, or food service where contagious eye infections may require time off.",
      },
    ],
    relatedConditions: ["hay-fever", "cold-and-flu", "skin-rash"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=conjunctivitis",
    stats: { avgTime: "40 mins", satisfaction: "4.8/5" },
  },
  vertigo: {
    name: "Vertigo & Dizziness",
    slug: "vertigo",
    description:
      "A sensation of spinning or loss of balance. Can be caused by inner ear problems, migraines, or other conditions.",
    searchIntent:
      "People with vertigo need to understand the cause and may need medical certificates when it affects work or driving.",
    symptoms: [
      "Spinning sensation",
      "Loss of balance",
      "Nausea or vomiting",
      "Nystagmus (involuntary eye movement)",
      "Sweating",
      "Hearing changes (in some types)",
    ],
    whenToSeek: [
      "First episode of vertigo",
      "Vertigo with hearing loss",
      "Vertigo lasting more than a few days",
      "Recurring episodes",
      "You need a medical certificate (unsafe to drive/work)",
    ],
    whenEmergency: [
      "Vertigo with sudden severe headache",
      "Difficulty speaking or swallowing",
      "Weakness or numbness",
      "Double vision",
      "Chest pain",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates when vertigo affects work or driving",
        "Discussion of common causes (BPPV, vestibular neuritis)",
        "Advice on vestibular exercises",
        "Referral for further assessment if needed",
      ],
      no: [
        "Physical examination (Epley manoeuvre for BPPV)",
        "Hearing tests",
        "Imaging for stroke assessment",
      ],
    },
    commonQuestions: [
      {
        q: "What causes vertigo?",
        a: "Common causes include benign paroxysmal positional vertigo (BPPV), vestibular neuritis, Meniere's disease, and migraines. A doctor can help narrow it down.",
      },
      {
        q: "Can I get a medical certificate for vertigo?",
        a: "Yes. Vertigo can make driving and many jobs unsafe. Our doctors can provide a certificate if you need time off.",
      },
      {
        q: "How long does vertigo last?",
        a: "BPPV episodes can last seconds to minutes. Vestibular neuritis may last days to weeks. Recovery varies by cause.",
      },
      {
        q: "Should I drive with vertigo?",
        a: "No. Vertigo can cause sudden loss of balance and is dangerous when driving. Wait until symptoms fully resolve.",
      },
    ],
    relatedConditions: ["migraine", "anxiety", "ear-infection"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=vertigo",
    stats: { avgTime: "50 mins", satisfaction: "4.8/5" },
  },
  shingles: {
    name: "Shingles (Herpes Zoster)",
    slug: "shingles",
    description:
      "A painful rash caused by reactivation of the chickenpox virus. Usually appears as a band of blisters on one side of the body.",
    searchIntent:
      "People with shingles need prompt treatment (antivirals work best within 72 hours) and medical certificates for recovery.",
    symptoms: [
      "Pain, burning, or tingling (often before rash)",
      "Red rash with blisters",
      "Rash in a band on one side of body",
      "Itching",
      "Fever and fatigue",
      "Headache",
    ],
    whenToSeek: [
      "Rash on face (especially near eyes)",
      "Rash within 72 hours (antivirals most effective)",
      "Severe pain",
      "Weakened immune system",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Rash near or in the eye",
      "Rash on face with facial weakness",
      "Severe headache with rash",
      "Confusion or difficulty breathing",
    ],
    canWeHelp: {
      yes: [
        "Assessment and antiviral prescription (if within 72 hours)",
        "Pain management advice",
        "Medical certificates for recovery period",
        "Referral if rash is near eye",
      ],
      no: [
        "In-person examination if rash location unclear",
        "Treatment for eye involvement (needs urgent ophthalmology)",
      ],
    },
    commonQuestions: [
      {
        q: "How quickly do I need treatment for shingles?",
        a: "Antivirals are most effective when started within 72 hours of rash appearing. Earlier is better.",
      },
      {
        q: "Can I get a medical certificate for shingles?",
        a: "Yes. Shingles can be very painful and contagious to those who haven't had chickenpox. Recovery typically takes 2-4 weeks.",
      },
      {
        q: "Is shingles contagious?",
        a: "The rash can spread chickenpox to people who haven't had it. Avoid contact with pregnant women, newborns, and immunocompromised people until blisters crust over.",
      },
      {
        q: "Can I get shingles more than once?",
        a: "Yes, though it's less common. The shingles vaccine reduces the risk of recurrence.",
      },
    ],
    relatedConditions: ["skin-rash", "chickenpox", "nerve-pain"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=shingles",
    stats: { avgTime: "45 mins", satisfaction: "4.9/5" },
  },
  gout: {
    name: "Gout",
    slug: "gout",
    description:
      "A form of arthritis caused by uric acid crystals in joints. Often affects the big toe, causing sudden severe pain and swelling.",
    searchIntent:
      "People with gout need pain relief and may need medical certificates during acute attacks.",
    symptoms: [
      "Sudden severe joint pain",
      "Swelling and redness",
      "Most commonly affects big toe",
      "Warmth in affected joint",
      "Limited movement",
      "Pain often starts at night",
    ],
    whenToSeek: [
      "First attack of gout (need diagnosis)",
      "Recurrent attacks",
      "Attacks not responding to treatment",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Fever with joint pain",
      "Multiple joints affected suddenly",
      "Severe pain with signs of infection",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates during acute gout attacks",
        "Discussion of treatment options",
        "Advice on lifestyle modifications",
        "Referral for ongoing management if needed",
      ],
      no: [
        "Joint aspiration (fluid removal for diagnosis)",
        "Long-term uric acid management (may need rheumatology)",
      ],
    },
    commonQuestions: [
      {
        q: "What triggers a gout attack?",
        a: "Common triggers include alcohol (especially beer), red meat, seafood, dehydration, and certain medications. Stress and illness can also trigger attacks.",
      },
      {
        q: "Can I get a medical certificate for gout?",
        a: "Yes. Acute gout can be extremely painful and make walking or standing impossible. Our doctors can provide a certificate.",
      },
      {
        q: "How long does a gout attack last?",
        a: "Without treatment, 5-7 days. With treatment, symptoms often improve within 24-48 hours.",
      },
      {
        q: "What should I avoid with gout?",
        a: "Limit alcohol, red meat, organ meats, and seafood. Stay well hydrated. Some people find certain foods trigger their attacks.",
      },
    ],
    relatedConditions: ["arthritis", "back-pain", "joint-pain"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=gout",
    stats: { avgTime: "45 mins", satisfaction: "4.8/5" },
  },
  eczema: {
    name: "Eczema (Atopic Dermatitis)",
    slug: "eczema",
    description:
      "A chronic skin condition causing dry, itchy, inflamed skin. Often runs in families and can flare with triggers.",
    searchIntent:
      "People with eczema want treatment for flares and sometimes medical certificates when it affects work.",
    symptoms: [
      "Dry, itchy skin",
      "Red or brown patches",
      "Thickened, cracked skin",
      "Small raised bumps",
      "Raw, sensitive skin from scratching",
      "Flare-ups that come and go",
    ],
    whenToSeek: [
      "Eczema not controlled by moisturisers",
      "Signs of infection (oozing, crusting, fever)",
      "Severe itching affecting sleep or work",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Widespread infected eczema",
      "Eczema with high fever",
      "Severe allergic reaction to treatment",
    ],
    canWeHelp: {
      yes: [
        "Treatment for eczema flares (topical steroids, etc.)",
        "Medical certificates when eczema affects work",
        "Advice on moisturisers and triggers",
        "Referral to dermatologist if needed",
      ],
      no: [
        "Patch testing for allergens",
        "Biologic treatments (require specialist)",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get eczema treatment online?",
        a: "Yes. For flares, our doctors can prescribe topical treatments. For severe or complex eczema, a dermatologist may be needed.",
      },
      {
        q: "What triggers eczema flares?",
        a: "Common triggers include dry air, irritants (soaps, detergents), stress, allergens, and certain fabrics. Keeping skin moisturised helps.",
      },
      {
        q: "Is eczema contagious?",
        a: "No. Eczema is not contagious. However, scratched skin can become infected, and infections can spread.",
      },
      {
        q: "Can I get a medical certificate for eczema?",
        a: "Yes, if severe eczema is affecting your ability to work (e.g. hands affected, sleep deprivation, infection).",
      },
    ],
    relatedConditions: ["skin-rash", "hay-fever", "allergies"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=eczema",
    stats: { avgTime: "45 mins", satisfaction: "4.7/5" },
  },
  ibs: {
    name: "Irritable Bowel Syndrome (IBS)",
    slug: "ibs",
    description:
      "A common digestive disorder causing abdominal pain, bloating, and changes in bowel habits. Not dangerous but can significantly affect quality of life.",
    searchIntent:
      "People with IBS want management strategies and sometimes medical certificates when symptoms are severe.",
    symptoms: [
      "Abdominal pain or cramping",
      "Bloating",
      "Diarrhoea or constipation (or alternating)",
      "Mucus in stool",
      "Feeling of incomplete bowel movement",
      "Symptoms often worse with stress or certain foods",
    ],
    whenToSeek: [
      "New or changing bowel habits",
      "Weight loss",
      "Blood in stool",
      "Symptoms not responding to dietary changes",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Severe abdominal pain",
      "Persistent vomiting",
      "Blood in stool with fever",
      "Signs of dehydration",
    ],
    canWeHelp: {
      yes: [
        "Discussion of IBS management strategies",
        "Medical certificates when symptoms severely affect work",
        "Advice on low-FODMAP diet and triggers",
        "Referral for further investigation if needed",
      ],
      no: [
        "Colonoscopy or other procedures",
        "Diagnosis of IBS (requires ruling out other conditions)",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for IBS?",
        a: "Yes, if your symptoms are severely affecting your ability to work. IBS can cause significant discomfort and urgency.",
      },
      {
        q: "What foods trigger IBS?",
        a: "Common triggers include dairy, wheat, onions, garlic, and high-FODMAP foods. A low-FODMAP diet can help identify triggers.",
      },
      {
        q: "Is IBS serious?",
        a: "IBS doesn't cause permanent damage or increase cancer risk, but it can significantly affect quality of life. New symptoms should be checked to rule out other conditions.",
      },
      {
        q: "Can stress cause IBS flares?",
        a: "Yes. Stress is a common trigger for IBS symptoms. Stress management techniques can help.",
      },
    ],
    relatedConditions: ["gastro", "acid-reflux", "anxiety"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=ibs",
    stats: { avgTime: "50 mins", satisfaction: "4.8/5" },
  },
  "acid-reflux": {
    name: "Acid Reflux (GORD)",
    slug: "acid-reflux",
    description:
      "Stomach acid flowing back into the oesophagus, causing heartburn, regurgitation, and sometimes throat or chest symptoms.",
    searchIntent:
      "People with reflux want relief and to understand when they need further investigation.",
    symptoms: [
      "Heartburn (burning behind breastbone)",
      "Regurgitation of acid or food",
      "Chest pain (can mimic heart attack)",
      "Difficulty swallowing",
      "Chronic cough or hoarseness",
      "Worse after eating or lying down",
    ],
    whenToSeek: [
      "Symptoms not controlled by antacids",
      "Difficulty swallowing",
      "Unintended weight loss",
      "Symptoms several times a week",
      "You need ongoing medication",
    ],
    whenEmergency: [
      "Severe chest pain (rule out heart attack)",
      "Vomiting blood",
      "Black or tarry stools",
      "Severe difficulty swallowing",
    ],
    canWeHelp: {
      yes: [
        "Prescription for reflux medication (PPIs, etc.)",
        "Advice on lifestyle modifications",
        "Discussion of when to see a specialist",
        "Medical certificates if reflux severely affects work",
      ],
      no: [
        "Endoscopy",
        "Surgical treatment",
      ],
    },
    commonQuestions: [
      {
        q: "When should I worry about acid reflux?",
        a: "Seek urgent care for chest pain (rule out heart), vomiting blood, or difficulty swallowing. See a doctor if symptoms are frequent or not controlled.",
      },
      {
        q: "Can I get reflux medication online?",
        a: "Yes. Our doctors can prescribe proton pump inhibitors and other reflux medications for appropriate cases.",
      },
      {
        q: "What lifestyle changes help reflux?",
        a: "Eat smaller meals, avoid lying down after eating, elevate head of bed, limit alcohol and caffeine, lose weight if overweight.",
      },
      {
        q: "Is long-term PPI use safe?",
        a: "PPIs are generally safe but long-term use may have risks. Use the lowest effective dose. Discuss with your doctor if you've been on them for years.",
      },
    ],
    relatedConditions: ["ibs", "chest-pain", "cough"],
    serviceType: "consult",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=acid-reflux",
    stats: { avgTime: "45 mins", satisfaction: "4.8/5" },
  },
  "period-pain": {
    name: "Period Pain (Dysmenorrhoea)",
    slug: "period-pain",
    description:
      "Cramping and discomfort during menstruation. Can be primary (normal) or secondary (from conditions like endometriosis).",
    searchIntent:
      "People with period pain want relief and sometimes medical certificates when it affects work.",
    symptoms: [
      "Cramping in lower abdomen",
      "Back pain",
      "Headache",
      "Fatigue",
      "Nausea",
      "Pain before or during period",
    ],
    whenToSeek: [
      "Severe pain not helped by over-the-counter pain relief",
      "Pain with heavy bleeding",
      "Pain between periods",
      "New or worsening pain",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Severe pain with fever",
      "Fainting or severe dizziness",
      "Pain with pregnancy possibility",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for period-related absence",
        "Discussion of pain relief options",
        "Contraceptive options that can reduce period pain",
        "Referral if underlying condition suspected",
      ],
      no: [
        "Pelvic examination",
        "Ultrasound or other imaging",
        "Treatment for endometriosis (needs specialist)",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for period pain?",
        a: "Yes. Severe period pain is a valid reason for a medical certificate. Our doctors understand it can be debilitating.",
      },
      {
        q: "When is period pain not normal?",
        a: "See a doctor if pain is severe, doesn't respond to pain relief, occurs between periods, or is accompanied by heavy bleeding.",
      },
      {
        q: "Can the pill help period pain?",
        a: "Yes. Hormonal contraceptives can reduce period pain for many people. Our doctors can discuss options.",
      },
      {
        q: "Could I have endometriosis?",
        a: "Endometriosis can cause severe period pain. If pain is debilitating or you have other symptoms, a doctor can discuss referral for assessment.",
      },
    ],
    relatedConditions: ["anxiety", "fatigue", "migraine"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=period-pain",
    stats: { avgTime: "50 mins", satisfaction: "4.8/5" },
  },
  "food-poisoning": {
    name: "Food Poisoning",
    slug: "food-poisoning",
    description:
      "Illness from contaminated food, causing vomiting, diarrhoea, and stomach cramps. Usually resolves within a few days.",
    searchIntent:
      "People with food poisoning need a medical certificate and advice on recovery.",
    symptoms: [
      "Nausea and vomiting",
      "Diarrhoea",
      "Stomach cramps",
      "Fever",
      "Fatigue",
      "Loss of appetite",
    ],
    whenToSeek: [
      "Symptoms lasting more than 3 days",
      "Signs of dehydration",
      "Blood in stool",
      "High fever",
      "You need a medical certificate (especially food handlers)",
    ],
    whenEmergency: [
      "Severe dehydration",
      "Blood in vomit or stool",
      "Confusion",
      "Unable to keep fluids down",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for food poisoning (critical for food handlers)",
        "Advice on rehydration",
        "Assessment of severity",
        "Guidance on when to return to work",
      ],
      no: [
        "Stool testing (usually not needed)",
        "IV fluids for severe dehydration",
      ],
    },
    commonQuestions: [
      {
        q: "How long should I stay home with food poisoning?",
        a: "Food handlers must stay home 48 hours after last symptoms. Others should stay home until well enough to work.",
      },
      {
        q: "Can I get a medical certificate for food poisoning?",
        a: "Yes. Food poisoning is a legitimate reason, and food handlers have strict return-to-work requirements.",
      },
      {
        q: "Do I need antibiotics for food poisoning?",
        a: "Most food poisoning is viral and doesn't need antibiotics. Bacterial causes may need them — a doctor can assess.",
      },
      {
        q: "What should I eat after food poisoning?",
        a: "Start with clear fluids, then bland foods (toast, rice, bananas). Avoid dairy, fatty foods, and alcohol until recovered.",
      },
    ],
    relatedConditions: ["gastro", "nausea", "dehydration"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=med-cert&condition=gastro",
    stats: { avgTime: "40 mins", satisfaction: "4.8/5" },
  },
  stress: {
    name: "Stress",
    slug: "stress",
    description:
      "Physical and emotional tension from demands or challenges. Chronic stress can affect health, sleep, and work performance.",
    searchIntent:
      "People under stress may need medical certificates for stress leave and advice on management.",
    symptoms: [
      "Feeling overwhelmed",
      "Irritability",
      "Fatigue",
      "Sleep problems",
      "Headaches",
      "Muscle tension",
      "Difficulty concentrating",
    ],
    whenToSeek: [
      "Stress affecting work or relationships",
      "Physical symptoms (chest pain, etc.)",
      "Difficulty coping",
      "You need a mental health day or stress leave certificate",
    ],
    whenEmergency: [
      "Thoughts of self-harm",
      "Severe chest pain",
      "Unable to function at all",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for stress leave",
        "Discussion of stress management strategies",
        "Referral to psychologist or counsellor",
        "Advice on when to seek further support",
      ],
      no: [
        "Ongoing psychological therapy",
        "WorkCover or compensation claims (may need specific forms)",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for stress?",
        a: "Yes. Stress and burnout are valid reasons for a medical certificate. Our doctors can provide certificates for stress leave when appropriate.",
      },
      {
        q: "What's the difference between stress and anxiety?",
        a: "Stress is a response to external demands. Anxiety is excessive worry that persists. They often overlap and can be treated similarly.",
      },
      {
        q: "How many days can I get for stress leave?",
        a: "It depends on your situation. Doctors assess based on your needs. Initial certificates are often 1-3 days; longer periods may need follow-up.",
      },
      {
        q: "Will my employer know it's for stress?",
        a: "Medical certificates typically don't specify the diagnosis. They state you're unfit for work. Your employer doesn't need to know the reason.",
      },
    ],
    relatedConditions: ["anxiety", "insomnia", "burnout"],
    serviceType: "both",
    ctaText: "Get support",
    ctaHref: "/request?service=consult&condition=anxiety",
    stats: { avgTime: "55 mins", satisfaction: "4.9/5" },
  },
  burnout: {
    name: "Burnout",
    slug: "burnout",
    description:
      "A state of physical and emotional exhaustion from prolonged stress, often work-related. Includes feelings of cynicism and reduced accomplishment.",
    searchIntent:
      "People experiencing burnout need medical certificates and support to recover.",
    symptoms: [
      "Exhaustion (physical and emotional)",
      "Cynicism or detachment from work",
      "Reduced performance",
      "Difficulty concentrating",
      "Sleep disturbances",
      "Physical symptoms (headaches, illness)",
    ],
    whenToSeek: [
      "Unable to cope with work demands",
      "Physical or mental health declining",
      "Need time off to recover",
      "You need a medical certificate for extended leave",
    ],
    whenEmergency: [
      "Thoughts of self-harm",
      "Severe depression",
      "Unable to care for yourself",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for burnout recovery",
        "Discussion of recovery strategies",
        "Referral to psychologist",
        "Advice on returning to work gradually",
      ],
      no: [
        "Ongoing therapy",
        "Workplace mediation",
        "WorkCover claims",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for burnout?",
        a: "Yes. Burnout is a recognised condition. Our doctors can provide certificates for recovery time when appropriate.",
      },
      {
        q: "How long does it take to recover from burnout?",
        a: "Recovery varies. Some need weeks, others months. Rest, boundaries, and sometimes professional support help.",
      },
      {
        q: "Is burnout the same as depression?",
        a: "They overlap but are different. Burnout is work-related exhaustion. Depression is a broader mental health condition. Both need attention.",
      },
      {
        q: "Should I tell my employer it's burnout?",
        a: "You don't have to. Medical certificates don't specify diagnosis. You can say you're unwell. Some choose to discuss with HR for support.",
      },
    ],
    relatedConditions: ["stress", "anxiety", "depression"],
    serviceType: "both",
    ctaText: "Get support",
    ctaHref: "/request?service=consult&condition=anxiety",
    stats: { avgTime: "55 mins", satisfaction: "4.9/5" },
  },
}

export function getConditionBySlug(slug: string): ConditionData | undefined {
  return conditionsData[slug]
}

export function getAllConditionSlugs(): string[] {
  return Object.keys(conditionsData)
}
