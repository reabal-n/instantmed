/**
 * SEO Pages Data Layer
 * 
 * Typed dataset for programmatic landing pages.
 * All content must be factual, compliant, and genuinely useful.
 * 
 * Page Types:
 * - ConditionPage: symptoms, when to see GP, how we help, disclaimers
 * - CertificatePage: certificate type (work/study/carer) with use cases
 * - BenefitPage: why choose online, why InstantMed, eligibility
 * - ResourcePage: FAQ, process guides, disclaimers, privacy
 */

// ============================================
// CONDITIONS PAGES
// ============================================

export interface ConditionPage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  heroText: string
  symptoms: string[]
  whenToSeeGP: string[] // Red flags: emergency situations
  whenWeCanHelp: string[] // What we can assess online
  howWeHelp: string[] // Our process steps
  disclaimers: string[]
  faqs: Array<{ q: string; a: string }>
  relatedConditions: string[]
  ctaText?: string
}

export const conditionPages: ConditionPage[] = [
  {
    slug: "cold-and-flu",
    name: "Cold and Flu",
    title: "Cold & Flu Symptoms | Medical Certificate & Advice | InstantMed",
    description:
      "Get a medical certificate for cold or flu without visiting a GP. Online doctor assessment in Australia. Advice on when to rest and recover.",
    h1: "Caught a cold or flu? We can help",
    heroText:
      "Feeling rough with a cold or flu? Get a medical certificate for work or uni, and clear advice on recovery — all from home.",
    symptoms: [
      "Sore throat and cough",
      "Runny or blocked nose",
      "Headache and body aches",
      "Fatigue and tiredness",
      "Low fever",
      "Sneezing",
    ],
    whenToSeeGP: [
      "High fever (>39°C) lasting >3 days",
      "Severe shortness of breath",
      "Chest pain",
      "Confusion or difficulty waking",
      "Symptoms not improving after 1 week",
      "Pregnant or immunocompromised",
    ],
    whenWeCanHelp: [
      "You have typical cold/flu symptoms and need a medical certificate",
      "You need advice on rest and recovery",
      "You want to know when it's safe to return to work",
    ],
    howWeHelp: [
      "Describe your symptoms and how long you've been unwell",
      "Our doctor assesses whether a medical certificate is appropriate",
      "Certificate issued and emailed within the hour",
    ],
    disclaimers: [
      "This is not a diagnosis. A medical certificate confirms you're unwell and unable to work — it's not treatment.",
      "If you have severe symptoms, go to an emergency department or call 000.",
      "If symptoms worsen, see a GP in person.",
    ],
    faqs: [
      {
        q: "Will a medical certificate from InstantMed be accepted by my employer?",
        a: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid. Employers must accept them.",
      },
      {
        q: "Can I get a certificate if I'm not actually sick?",
        a: "No. We only issue certificates for genuine illness. Doctors assess your symptoms and can decline if they don't match a medical need.",
      },
      {
        q: "Do you prescribe medicine for a cold?",
        a: "Most colds and flu don't need medication — rest is the best cure. If needed, our doctor may suggest over-the-counter options.",
      },
      {
        q: "What if I need a certificate for a day I was sick in the past?",
        a: "We can backdate certificates if reasonable. Explain when you were unwell and we'll assess.",
      },
    ],
    relatedConditions: ["gastro", "hay-fever"],
  },

  {
    slug: "gastro",
    name: "Gastroenteritis (Gastro)",
    title: "Gastro Symptoms | Medical Certificate | InstantMed",
    description:
      "Get a medical certificate for gastroenteritis. Online assessment for vomiting, diarrhoea, nausea. Valid for work and uni.",
    h1: "Gastro got you down? Get your certificate online",
    heroText:
      "Stomach bug causing problems? Get a medical certificate without leaving the bathroom, plus advice on staying hydrated.",
    symptoms: [
      "Nausea and vomiting",
      "Diarrhoea",
      "Abdominal cramps",
      "Fever (usually low)",
      "Loss of appetite",
      "Weakness and fatigue",
    ],
    whenToSeeGP: [
      "Severe dehydration (no urine output, dizziness when standing)",
      "Blood in stool or vomit",
      "Severe abdominal pain",
      "High fever (>39°C)",
      "Symptoms lasting >3 days",
      "Elderly, very young, or immunocompromised",
    ],
    whenWeCanHelp: [
      "You have typical gastro symptoms and need a medical certificate",
      "You need advice on hydration and when to return to work",
      "You want to know if you need to see someone in person",
    ],
    howWeHelp: [
      "Tell us your symptoms and how long you've been unwell",
      "Our doctor assesses if a certificate is appropriate",
      "Certificate issued immediately",
    ],
    disclaimers: [
      "Most gastro resolves with rest and fluids — see a GP if symptoms are severe or persist.",
      "A medical certificate is not treatment. It confirms you're unwell and can't work.",
      "Stay home to avoid spreading to others.",
    ],
    faqs: [
      {
        q: "When can I safely return to work after gastro?",
        a: "Usually after 24 hours with no vomiting or diarrhoea. Some workplaces (food, healthcare) have stricter rules — check with your employer.",
      },
      {
        q: "What should I eat or drink?",
        a: "Start with clear fluids (water, broth, electrolyte drinks). Once nausea improves, bland foods like toast and rice. Avoid dairy and fatty foods initially.",
      },
      {
        q: "Do I need antibiotics?",
        a: "Most gastro is viral and antibiotics won't help. If bacterial, a doctor would advise. Focus on hydration.",
      },
    ],
    relatedConditions: ["migraine"],
  },

  {
    slug: "migraine",
    name: "Migraine",
    title: "Migraine Treatment & Medical Certificate | Online Doctor | InstantMed",
    description:
      "Get migraine treatment and a medical certificate online. Australian doctors can prescribe relief. Same-day assessment.",
    h1: "Migraine too severe to work? We can help",
    heroText:
      "Debilitating migraine? Get a medical certificate and pain relief options without fighting to get a GP appointment.",
    symptoms: [
      "Severe throbbing headache (usually one side)",
      "Sensitivity to light and sound",
      "Nausea or vomiting",
      "Aura (flashing lights, blind spots) — in some people",
      "Lasts 4-72 hours",
      "Disabling — can't work or concentrate",
    ],
    whenToSeeGP: [
      "Worst headache of your life (sudden, severe)",
      "Headache with fever, stiff neck, confusion",
      "Headache after head injury",
      "Change in pattern or severity of migraines",
      "New migraine symptoms (nausea, vision changes)",
    ],
    whenWeCanHelp: [
      "You have a typical migraine and can't work",
      "You need a medical certificate for the day",
      "You want advice on migraine triggers and management",
    ],
    howWeHelp: [
      "Describe your migraine symptoms and frequency",
      "Our doctor assesses and can recommend pain relief options",
      "Medical certificate issued if appropriate",
    ],
    disclaimers: [
      "Severe, sudden headaches need urgent medical attention — call 000 or go to ED.",
      "This is not a diagnosis. Recurring migraines should be properly assessed by a GP in person.",
      "A medical certificate confirms you're unwell, not that you have migraine.",
    ],
    faqs: [
      {
        q: "Can you prescribe migraine medications?",
        a: "Yes, if appropriate. Depending on your history, we can prescribe triptans, anti-nausea meds, or other migraine treatments.",
      },
      {
        q: "What's the difference between a headache and a migraine?",
        a: "Migraines are severe, often one-sided, and disabling. They come with sensitivity to light/sound and sometimes nausea. Tension headaches are usually milder and generalized.",
      },
      {
        q: "How do I prevent migraines?",
        a: "Track triggers (stress, certain foods, sleep loss). If you get frequent migraines, see a GP for preventive treatment options.",
      },
    ],
    relatedConditions: ["anxiety"],
  },

  {
    slug: "back-pain",
    name: "Back Pain",
    title: "Back Pain | Medical Certificate & Treatment Options | InstantMed",
    description:
      "Get a medical certificate for back pain. Online assessment and advice on pain management. When to see a physio or GP.",
    h1: "Back pain keeping you from work?",
    heroText:
      "Struggling with back pain? Get a medical certificate and clear guidance on what to do next — all without leaving home.",
    symptoms: [
      "Lower back pain (most common)",
      "Pain radiating down the leg",
      "Stiffness and reduced movement",
      "Muscle spasm",
      "Worse with certain movements",
      "Occasional sharp pain or dull ache",
    ],
    whenToSeeGP: [
      "Severe pain after trauma or accident",
      "Pain with numbness/tingling in legs or genital area",
      "Loss of bladder or bowel control",
      "Unexplained weight loss",
      "Pain at night or at rest",
      "Fever or recent infection",
    ],
    whenWeCanHelp: [
      "You have mechanical back pain and can't work",
      "You need a medical certificate",
      "You want advice on pain management and recovery",
    ],
    howWeHelp: [
      "Describe your back pain, when it started, what makes it better/worse",
      "Our doctor assesses and advises on next steps",
      "Medical certificate issued if appropriate",
    ],
    disclaimers: [
      "Severe back pain with leg numbness or weakness needs urgent assessment — go to ED or call 000.",
      "A medical certificate confirms you can't work — it's not treatment.",
      "Most back pain improves with movement and appropriate treatment. See a GP or physio for ongoing care.",
    ],
    faqs: [
      {
        q: "When can I return to work after back pain?",
        a: "Depends on the cause and severity. Some people can do desk work quickly; manual work takes longer. Your GP or physio will advise.",
      },
      {
        q: "Should I see a physio or a doctor?",
        a: "Both can help. A GP confirms it's mechanical back pain and rules out serious causes. A physio provides exercises and hands-on treatment.",
      },
      {
        q: "Is bed rest good for back pain?",
        a: "No. Prolonged bed rest delays recovery. Movement (gently) actually helps. Stay active within pain limits.",
      },
    ],
    relatedConditions: ["migraine"],
  },

  {
    slug: "hay-fever",
    name: "Hay Fever (Allergic Rhinitis)",
    title: "Hay Fever Treatment & Relief | Medical Certificate | InstantMed",
    description:
      "Get hay fever relief online. Antihistamines and medical certificates. Seasonal allergies disrupting work? We can help.",
    h1: "Hay fever making you miserable? We can help",
    heroText:
      "Allergies ruining your day? Get treatment options and a medical certificate if you need to work from home.",
    symptoms: [
      "Sneezing",
      "Itchy, watery eyes",
      "Runny or blocked nose",
      "Itchy nose and throat",
      "Fatigue from poor sleep",
      "Headache",
    ],
    whenToSeeGP: [
      "Severe symptoms not responding to antihistamines",
      "Symptoms with fever (might be infection, not allergy)",
      "Wheezing or shortness of breath",
      "Severe eye symptoms",
    ],
    whenWeCanHelp: [
      "You have hay fever and need antihistamine advice",
      "You need a medical certificate for severe hay fever affecting work",
      "You want to know what treatments are available",
    ],
    howWeHelp: [
      "Tell us your allergy symptoms and what time of year",
      "Our doctor recommends treatment options",
      "Prescription antihistamines can be issued if appropriate",
    ],
    disclaimers: [
      "Hay fever is usually mild — most people manage with over-the-counter antihistamines.",
      "If symptoms are severe or include wheezing, see a GP in person.",
      "A medical certificate is only issued if symptoms are genuinely disabling.",
    ],
    faqs: [
      {
        q: "What's the difference between allergies and a cold?",
        a: "Allergies: itchy eyes and throat, clear discharge, no fever. Colds: sore throat, maybe fever, thick mucus. Allergies last weeks; colds a few days.",
      },
      {
        q: "Can you prescribe hay fever medication?",
        a: "Yes. Depending on your preference, we can recommend or prescribe antihistamines (tablets or nasal sprays).",
      },
      {
        q: "Will antihistamines make me drowsy?",
        a: "Older antihistamines (like promethazine) can. Modern ones (like cetirizine, loratadine) are non-drowsy for most people.",
      },
    ],
    relatedConditions: ["cold-and-flu"],
  },

  {
    slug: "thrush",
    name: "Thrush (Yeast Infection)",
    title: "Thrush Treatment Online | Medical Certificate | InstantMed",
    description:
      "Get thrush treatment online discreetly. Prescription antifungal creams. No awkward conversations.",
    h1: "Thrush? Get treatment discreetly",
    heroText:
      "Uncomfortable yeast infection? Get prescription antifungal treatment online, quickly and without embarrassment.",
    symptoms: [
      "Itching and burning",
      "White, thick discharge (vaginal or oral)",
      "Redness and swelling",
      "Pain during intercourse",
      "Burning when urinating",
    ],
    whenToSeeGP: [
      "First time symptoms — need proper diagnosis",
      "Recurrent thrush (>4 times per year)",
      "Symptoms in a man",
      "Severe symptoms",
      "Pregnant or breastfeeding",
    ],
    whenWeCanHelp: [
      "You've had thrush before and recognize the symptoms",
      "You need a medical certificate",
      "You need prescription antifungal treatment",
    ],
    howWeHelp: [
      "Describe your symptoms",
      "Our doctor assesses and prescribes treatment",
      "eScript sent to your phone via SMS",
    ],
    disclaimers: [
      "If this is your first episode or symptoms are unusual, see a GP in person to confirm diagnosis.",
      "Recurring thrush may indicate other issues (diabetes, immune problems) — discuss with a GP.",
    ],
    faqs: [
      {
        q: "How quickly does thrush treatment work?",
        a: "Most creams work within 3-5 days. Tablets within 1 week. Take the full course even if symptoms improve.",
      },
      {
        q: "Can I pass thrush to my partner?",
        a: "Yes, it can be transmitted sexually. Your partner may also need treatment. Avoid sex until both are treated.",
      },
      {
        q: "What causes thrush?",
        a: "It's a normal fungus (Candida) that grows excessively due to disrupted bacterial balance. Antibiotics, pregnancy, diabetes, and poor hygiene increase risk.",
      },
    ],
    relatedConditions: ["uti"],
  },

  {
    slug: "anxiety",
    name: "Anxiety & Stress",
    title: "Anxiety Assessment & Medical Certificate | InstantMed",
    description:
      "Anxiety affecting work? Get a medical certificate and advice on managing stress. Online doctor assessment.",
    h1: "Anxiety too much to cope with work today?",
    heroText:
      "Overwhelmed by stress or anxiety? Get a medical certificate and clear next steps for support — all confidentially online.",
    symptoms: [
      "Racing heartbeat",
      "Shortness of breath",
      "Chest tightness",
      "Difficulty concentrating",
      "Restlessness and irritability",
      "Muscle tension",
      "Sleep disturbance",
    ],
    whenToSeeGP: [
      "Severe anxiety lasting weeks",
      "Panic attacks with chest pain",
      "Thoughts of harming yourself",
      "Anxiety affecting work or relationships significantly",
      "Want to explore ongoing treatment (therapy, medication)",
    ],
    whenWeCanHelp: [
      "You're having an anxious day and need to stay home",
      "You need a medical certificate",
      "You want guidance on managing anxiety",
    ],
    howWeHelp: [
      "Describe your anxiety and what triggered it",
      "Our doctor assesses and advises",
      "Medical certificate issued if appropriate",
      "Referral to mental health support if needed",
    ],
    disclaimers: [
      "If you're having thoughts of self-harm, call Lifeline: 13 11 14 (free, 24/7).",
      "A medical certificate is not treatment. Ongoing anxiety needs proper mental health care.",
      "We can provide short-term support; for long-term help, discuss with a GP or psychologist.",
    ],
    faqs: [
      {
        q: "Can you prescribe anxiety medication?",
        a: "For acute anxiety, sometimes. For ongoing anxiety, you'll need to see a GP in person for proper assessment and long-term management.",
      },
      {
        q: "Is it normal to feel anxious about work?",
        a: "Mild anxiety is normal. But if it's persistent or disabling, that's worth discussing with a GP or psychologist.",
      },
      {
        q: "What can I do right now to feel less anxious?",
        a: "Deep breathing, grounding techniques (5-4-3-2-1 method), movement, and talking to someone you trust. If severe, reach out to Lifeline.",
      },
    ],
    relatedConditions: ["migraine"],
  },

  {
    slug: "insomnia",
    name: "Insomnia & Sleep Problems",
    title: "Sleep Problems | Medical Certificate & Advice | InstantMed",
    description:
      "Sleep-deprived and can't work? Get a medical certificate. Online assessment of insomnia and fatigue.",
    h1: "Too tired to work? Let's figure out what's going on",
    heroText:
      "Brutal lack of sleep affecting your ability to work? Get a medical certificate and advice on getting better rest.",
    symptoms: [
      "Difficulty falling asleep",
      "Waking during the night",
      "Waking too early",
      "Not feeling rested",
      "Daytime fatigue",
      "Difficulty concentrating",
    ],
    whenToSeeGP: [
      "Insomnia lasting weeks or months",
      "Snoring (possible sleep apnea)",
      "Want long-term sleep improvement",
      "Sleep problems linked to pain or mood",
    ],
    whenWeCanHelp: [
      "You had a terrible night and can't function at work",
      "You need a medical certificate",
      "You want advice on sleep hygiene",
    ],
    howWeHelp: [
      "Describe your sleep and what's affecting it",
      "Our doctor assesses and advises",
      "Medical certificate issued if appropriate",
    ],
    disclaimers: [
      "A medical certificate confirms you can't work — it's not sleep treatment.",
      "Chronic insomnia needs ongoing care. See a GP for proper assessment and cognitive behavioural therapy for insomnia (CBTi).",
    ],
    faqs: [
      {
        q: "Can you prescribe sleeping tablets?",
        a: "Not usually. Sleeping tablets are usually short-term only and can create dependency. A GP will discuss better options like CBTi.",
      },
      {
        q: "What's the best way to sleep better?",
        a: "Consistent sleep schedule, dark cool room, no screens 1 hour before bed, exercise during the day, avoid caffeine late afternoon.",
      },
    ],
    relatedConditions: ["anxiety"],
  },

  {
    slug: "headache",
    name: "Tension Headache",
    title: "Tension Headache | Medical Certificate | InstantMed",
    description:
      "Tension headache affecting work? Get a medical certificate and pain management advice online.",
    h1: "Persistent headache keeping you down?",
    heroText:
      "Tension headache making it impossible to concentrate? Get a medical certificate and guidance on relief.",
    symptoms: [
      "Generalized head pain (both sides)",
      "Tight, pressing sensation",
      "Worse with stress or poor posture",
      "Not usually one-sided",
      "No nausea or light sensitivity",
    ],
    whenToSeeGP: [
      "Sudden severe headache (worst of your life)",
      "Headache with fever, stiff neck, confusion",
      "Frequent tension headaches (weeks/months)",
      "Change in headache pattern",
    ],
    whenWeCanHelp: [
      "You have a tension headache today and can't work",
      "You need a medical certificate",
      "You want advice on managing headaches",
    ],
    howWeHelp: [
      "Tell us about your headache",
      "Our doctor advises on relief",
      "Medical certificate if appropriate",
    ],
    disclaimers: [
      "Sudden severe headaches need urgent attention — go to ED or call 000.",
      "Frequent headaches should be assessed by a GP in person.",
    ],
    faqs: [
      {
        q: "What's the difference between a tension headache and a migraine?",
        a: "Tension: mild-moderate, both sides, pressing. Migraine: severe, one-sided, with nausea/light sensitivity. Migraines disable you; tension headaches don't always.",
      },
      {
        q: "What over-the-counter pain relief works?",
        a: "Paracetamol or ibuprofen. Take with water and rest in a dark, quiet room. Avoid regular use (can cause rebound headaches).",
      },
    ],
    relatedConditions: ["stress-exhaustion"],
  },

  {
    slug: "stress-exhaustion",
    name: "Stress & Exhaustion",
    title: "Stress & Exhaustion | Medical Certificate | InstantMed",
    description:
      "Burned out and unable to work? Get a medical certificate. Online assessment of stress and fatigue.",
    h1: "Running on empty? We understand",
    heroText:
      "Stress and exhaustion making work impossible? Get a medical certificate and guidance on recovery.",
    symptoms: [
      "Persistent tiredness",
      "Difficulty concentrating",
      "Irritability",
      "Loss of motivation",
      "Physical symptoms (headaches, tension)",
      "Sleep problems",
    ],
    whenToSeeGP: [
      "Stress lasting weeks or months",
      "Thoughts of harming yourself",
      "Complete inability to function",
      "Want ongoing mental health support",
    ],
    whenWeCanHelp: [
      "You're overwhelmed and need a day off",
      "You need a medical certificate",
      "You want initial guidance",
    ],
    howWeHelp: [
      "Describe your stress and exhaustion",
      "Our doctor assesses",
      "Medical certificate issued if appropriate",
    ],
    disclaimers: [
      "If you're having thoughts of self-harm, call Lifeline: 13 11 14.",
      "Ongoing stress needs proper support. See a GP or psychologist for long-term help.",
    ],
    faqs: [
      {
        q: "Is stress a real medical reason to take time off work?",
        a: "Yes. If stress is severe enough that you can't work, it's a legitimate medical issue. See a GP for proper support.",
      },
      {
        q: "Will I be fired for taking stress leave?",
        a: "No. In Australia, employers must make reasonable adjustments for health issues, including mental health. There are protections.",
      },
    ],
    relatedConditions: ["anxiety", "insomnia"],
  },

  {
    slug: "uti",
    name: "UTI Symptoms",
    title: "UTI Symptoms & Treatment | Medical Certificate | InstantMed",
    description:
      "Burning when you pee? Get UTI treatment online. Prescription antibiotics from Australian doctors. Safe, discreet.",
    h1: "UTI symptoms? Get treatment fast",
    heroText:
      "Uncomfortable urinary tract infection? Get prescription antibiotics and a medical certificate without the awkwardness.",
    symptoms: [
      "Burning or stinging when urinating",
      "Frequent urge to urinate",
      "Cloudy or dark urine",
      "Strong-smelling urine",
      "Lower abdominal pain",
      "Pressure or discomfort in lower abdomen",
    ],
    whenToSeeGP: [
      "Blood in urine",
      "High fever or chills",
      "Severe back pain (might be kidney infection)",
      "Pregnant or might be pregnant",
      "Recurrent UTIs (3+ per year)",
      "Symptoms not improving after 2-3 days",
    ],
    whenWeCanHelp: [
      "You have typical UTI symptoms",
      "You need a medical certificate",
      "You need prescription antibiotics",
    ],
    howWeHelp: [
      "Describe your symptoms",
      "Our doctor assesses if antibiotics are appropriate",
      "eScript sent to your phone via SMS",
    ],
    disclaimers: [
      "If you have fever with back pain, see a GP immediately — might be kidney infection.",
      "Complete the full course of antibiotics even if you feel better.",
    ],
    faqs: [
      {
        q: "Can you prescribe antibiotics for a UTI?",
        a: "Yes, if your symptoms match a UTI and there are no red flags. Most UTIs are treated with standard antibiotics.",
      },
      {
        q: "How quickly will antibiotics work?",
        a: "Most people feel relief within 24-48 hours. Complete the full course (usually 5-7 days).",
      },
      {
        q: "How can I prevent UTIs?",
        a: "Stay hydrated, urinate after sex, wipe front to back, and avoid irritants. If recurrent, discuss prevention strategies with a GP.",
      },
    ],
    relatedConditions: ["thrush"],
  },

  {
    slug: "acne",
    name: "Acne",
    title: "Acne Treatment Online | Prescription Skincare | InstantMed",
    description:
      "Acne affecting your confidence? Get prescription treatment online. Retinoids, antibiotics, and skincare advice.",
    h1: "Acne getting you down? Prescription help available",
    heroText:
      "Tried everything over-the-counter? Get prescription-strength acne treatment online from an Australian doctor.",
    symptoms: [
      "Pimples, blackheads, whiteheads",
      "Red, inflamed skin",
      "Painful cysts or nodules",
      "Scarring from previous breakouts",
      "Acne on face, chest, or back",
    ],
    whenToSeeGP: [
      "Severe cystic acne (nodules, scarring)",
      "Acne resistant to multiple treatments",
      "Considering isotretinoin (Roaccutane)",
      "Acne linked to hormonal issues",
    ],
    whenWeCanHelp: [
      "You have mild-moderate acne and want prescription options",
      "You need a medical certificate",
      "You want skincare advice",
    ],
    howWeHelp: [
      "Share your acne history and what you've tried",
      "Our doctor recommends or prescribes treatment",
      "eScript sent to your phone via SMS if appropriate",
    ],
    disclaimers: [
      "Isotretinoin (Roaccutane) requires specialist supervision — we can refer if appropriate.",
      "Most acne treatments take 6-12 weeks to show results.",
    ],
    faqs: [
      {
        q: "What acne treatments can you prescribe?",
        a: "Topical retinoids (tretinoin, adapalene), benzoyl peroxide combinations, topical antibiotics, and oral antibiotics for moderate cases.",
      },
      {
        q: "Can you prescribe Roaccutane?",
        a: "No. Isotretinoin requires specialist review and regular blood tests. We can refer you to a dermatologist.",
      },
      {
        q: "Will my acne come back when I stop treatment?",
        a: "Depends on the cause. Some people maintain results with skincare; others need ongoing low-dose treatment.",
      },
    ],
    relatedConditions: ["eczema"],
  },

  {
    slug: "eczema",
    name: "Eczema",
    title: "Eczema Treatment Online | Prescription Creams | InstantMed",
    description:
      "Eczema flare-up? Get prescription steroid creams online. Dermatitis relief from an Australian doctor.",
    h1: "Itchy, irritated skin? Relief is available",
    heroText:
      "Eczema flare-up making work impossible? Get prescription creams and clear management advice online.",
    symptoms: [
      "Intense itching",
      "Dry, sensitive skin",
      "Red or inflamed patches",
      "Small raised bumps",
      "Cracked, swollen, or crusted skin",
      "Raw, swollen skin from scratching",
    ],
    whenToSeeGP: [
      "Severe eczema not responding to treatment",
      "Signs of infection (oozing, crusting, fever)",
      "Want long-term management plan",
      "Consider biologic treatments for severe cases",
    ],
    whenWeCanHelp: [
      "You have an eczema flare and need a medical certificate",
      "You need prescription steroid cream",
      "You want advice on managing triggers",
    ],
    howWeHelp: [
      "Describe your eczema and affected areas",
      "Our doctor prescribes appropriate cream strength",
      "eScript sent to your phone via SMS",
    ],
    disclaimers: [
      "Steroid creams are effective but should be used correctly — follow instructions to avoid overuse.",
      "Infected eczema needs prompt treatment — see a GP if signs of infection.",
    ],
    faqs: [
      {
        q: "What strength steroid cream do I need?",
        a: "Depends on severity and location. Face needs mild cream; body can use stronger. Doctor advises.",
      },
      {
        q: "Can I use steroids long-term?",
        a: "Short-term yes. Long-term steroid use requires monitoring. Work with a GP on maintenance strategies.",
      },
      {
        q: "What triggers eczema?",
        a: "Common triggers: soap, stress, allergens, dust mites, certain fabrics. Identifying yours helps prevention.",
      },
    ],
    relatedConditions: ["acne"],
  },

  {
    slug: "dizziness",
    name: "Dizziness & Vertigo",
    title: "Dizziness Treatment | Medical Certificate | InstantMed",
    description:
      "Dizziness or vertigo making work unsafe? Get a medical certificate. Online assessment of dizziness.",
    h1: "Room spinning? Get assessed online",
    heroText:
      "Vertigo or dizziness making work dangerous? Get a medical certificate and guidance on next steps.",
    symptoms: [
      "Spinning sensation (vertigo)",
      "Lightheadedness",
      "Feeling unbalanced",
      "Nausea with dizziness",
      "Difficulty walking straight",
      "Blurred vision",
    ],
    whenToSeeGP: [
      "Sudden severe dizziness",
      "Dizziness with hearing loss",
      "Dizziness with severe headache",
      "Frequent episodes (needs proper diagnosis)",
      "Concerned about driving safety",
    ],
    whenWeCanHelp: [
      "You're too dizzy to work safely",
      "You need a medical certificate",
      "You want initial guidance",
    ],
    howWeHelp: [
      "Describe your dizziness and when it started",
      "Our doctor assesses",
      "Medical certificate if appropriate",
    ],
    disclaimers: [
      "If dizziness comes with chest pain or severe headache, go to ED or call 000.",
      "Don't drive if dizzy — safety risk to yourself and others.",
    ],
    faqs: [
      {
        q: "Is dizziness serious?",
        a: "Usually not, but it varies. BPPV (benign positional vertigo) is common and treatable. Sometimes it needs further investigation.",
      },
      {
        q: "When is dizziness an emergency?",
        a: "If sudden with chest pain, severe headache, vision changes, or speech difficulty — go to ED or call 000.",
      },
    ],
    relatedConditions: ["headache"],
  },

  {
    slug: "food-poisoning",
    name: "Food Poisoning",
    title: "Food Poisoning | Medical Certificate | InstantMed",
    description:
      "Food poisoning making work impossible? Get a medical certificate. Nausea, vomiting, diarrhoea assessment.",
    h1: "Bad food? We can help",
    heroText:
      "Food poisoning got you down? Get a medical certificate and advice on recovery.",
    symptoms: [
      "Nausea and vomiting",
      "Diarrhoea",
      "Abdominal cramping",
      "Stomach pain",
      "Fever (sometimes)",
      "Fatigue",
    ],
    whenToSeeGP: [
      "Severe dehydration",
      "Blood in stool or vomit",
      "Symptoms lasting >3 days",
      "Suspected serious food poisoning (e.g., shellfish toxin)",
    ],
    whenWeCanHelp: [
      "You have food poisoning and can't work",
      "You need a medical certificate",
      "You want hydration advice",
    ],
    howWeHelp: [
      "Describe your symptoms and suspected food",
      "Our doctor assesses",
      "Medical certificate if appropriate",
    ],
    disclaimers: [
      "Most food poisoning resolves with rest and fluids.",
      "Stay home to avoid spreading to others.",
    ],
    faqs: [
      {
        q: "When can I return to work?",
        a: "After 24 hours with no vomiting/diarrhoea. Food handlers may need stricter clearance.",
      },
      {
        q: "Should I report food poisoning?",
        a: "If confident of the source, tell the restaurant. If serious (multiple people), consider reporting to local health authority.",
      },
    ],
    relatedConditions: ["gastro"],
  },

  {
    slug: "sore-throat",
    name: "Sore Throat",
    title: "Sore Throat Treatment | Medical Certificate | InstantMed",
    description:
      "Painful sore throat? Get a medical certificate. Online assessment of throat pain and infection.",
    h1: "Throat pain making work miserable?",
    heroText:
      "Sore throat affecting your ability to work? Get a medical certificate and advice on relief.",
    symptoms: [
      "Pain when swallowing",
      "Scratchy or raw throat",
      "Redness (if you can see)",
      "Swollen tonsils",
      "Hoarse voice",
      "Sometimes with fever",
    ],
    whenToSeeGP: [
      "Severe pain or difficulty swallowing",
      "High fever with sore throat",
      "Swollen throat closing airway",
      "Concerns about strep throat",
    ],
    whenWeCanHelp: [
      "You have a sore throat and can't work",
      "You need a medical certificate",
      "You want advice on self-care",
    ],
    howWeHelp: [
      "Describe your throat pain and symptoms",
      "Our doctor assesses",
      "Medical certificate if appropriate",
    ],
    disclaimers: [
      "Most sore throats are viral — antibiotics don't help.",
      "If throat swelling affects breathing, seek urgent help.",
    ],
    faqs: [
      {
        q: "Do I need antibiotics for a sore throat?",
        a: "Only if it's bacterial (strep). Most sore throats are viral. Your doctor will advise.",
      },
      {
        q: "What helps a sore throat?",
        a: "Warm drinks, throat lozenges, paracetamol, rest. Honey and lemon can soothe.",
      },
    ],
    relatedConditions: ["cold-and-flu"],
  },
]

// ============================================
// CERTIFICATE TYPE PAGES
// ============================================

export interface CertificatePage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  heroText: string
  useCases: string[]
  howToUse: string[]
  backdatingInfo: string
  disclaimers: string[]
  faqs: Array<{ q: string; a: string }>
}

export const certificatePages: CertificatePage[] = [
  {
    slug: "work-medical-certificate",
    name: "Work Medical Certificate",
    title: "Work Medical Certificate Online | Australia | InstantMed",
    description:
      "Get a medical certificate for work in under an hour. Valid for all employers. No waiting rooms.",
    h1: "Medical certificate for work — fast and valid",
    heroText:
      "Unwell and need to tell your boss? Get a legitimate medical certificate issued by an AHPRA-registered Australian doctor.",
    useCases: [
      "You're sick and can't go to work",
      "Your workplace requires a certificate",
      "You need to document medical leave",
      "You want to protect your employment",
    ],
    howToUse: [
      "Answer questions about your symptoms (2 minutes)",
      "Doctor reviews and assesses",
      "Certificate sent to your email",
      "Forward to your employer or HR",
    ],
    backdatingInfo:
      "We can backdate certificates if reasonable. Example: if you were sick yesterday but couldn't get to a doctor, we can issue it for that date. Explain the situation when you submit.",
    disclaimers: [
      "Certificates must be for genuine illness — employers and doctors have a duty to detect fraud.",
      "If you falsely claim illness, you could lose your job or face other consequences.",
      "A medical certificate is proof you're unwell, not a diagnosis or treatment.",
    ],
    faqs: [
      {
        q: "Will my employer accept an InstantMed certificate?",
        a: "Yes, absolutely. Our certificates are issued by registered Australian doctors and are legally valid. Employers must accept them.",
      },
      {
        q: "What information is on the certificate?",
        a: "Date(s), your name, doctor details, confirmation that you're unfit for work. No diagnosis is included — we keep it confidential.",
      },
      {
        q: "Can I get a backdated certificate?",
        a: "Yes, if reasonable. E.g., if you were sick yesterday and are too unwell to see a doctor today, we can issue for yesterday. Explain when you submit.",
      },
      {
        q: "My employer only accepts 3-day certificates — can you issue those?",
        a: "Yes. If you're unwell for multiple days, we can issue a certificate covering that period. You don't need a new one each day.",
      },
      {
        q: "What if I need more than the certificate covers?",
        a: "If you're sick for longer, see a GP in person for extended leave documentation. We handle same-day situations.",
      },
    ],
  },

  {
    slug: "study-medical-certificate",
    name: "Study/School Medical Certificate",
    title: "Medical Certificate for Uni & School | InstantMed",
    description:
      "Get a medical certificate for university or school. Special consideration, exam absences, assignment extensions.",
    h1: "Medical certificate for study — university and school",
    heroText:
      "Sick during exams or assessments? Get a medical certificate for special consideration or extension.",
    useCases: [
      "You're ill during an exam and need to reschedule",
      "You need special consideration for assignments",
      "You missed classes and need documentation",
      "You're requesting an extension on deadlines",
    ],
    howToUse: [
      "Complete our online form",
      "Doctor reviews your situation",
      "Certificate issued with your specific dates",
      "Submit to your university/school",
    ],
    backdatingInfo:
      "We can backdate certificates for the day(s) you were unwell. Example: if you missed Tuesday's exam because you were sick, we can issue a certificate for Tuesday.",
    disclaimers: [
      "Universities and schools have their own policies on medical certificates — check yours.",
      "A certificate is proof of illness, not a guarantee of special consideration — your institution decides.",
      "Provide your certificate as soon as possible after missing an assessment.",
    ],
    faqs: [
      {
        q: "Do universities accept InstantMed certificates?",
        a: "Most do. Check your university's policy on online medical certificates. If uncertain, ask your student services.",
      },
      {
        q: "Can I get special consideration without a certificate?",
        a: "Varies by institution. Many require a certificate for exam postponement or deadline extension.",
      },
      {
        q: "How long does the certificate take?",
        a: "Usually within an hour. Get it submitted quickly to your institution.",
      },
      {
        q: "My exam was yesterday — can I still get a certificate?",
        a: "Yes, we can backdate. But submit it quickly — most institutions have deadlines for claims.",
      },
    ],
  },

  {
    slug: "carer-leave-certificate",
    name: "Carer's Leave Medical Certificate",
    title: "Carer's Leave Medical Certificate | InstantMed",
    description:
      "Medical certificate for carer's leave. Care for family member or dependant. Valid for all Australian employers.",
    h1: "Medical certificate for carer's leave",
    heroText:
      "Need to care for a sick family member? Get a medical certificate to document carer's leave from work.",
    useCases: [
      "Your child or family member is ill and needs care",
      "You need to take time off work to care for someone",
      "Your employer requires a certificate for carer's leave",
      "You're using annual/carer's leave and need documentation",
    ],
    howToUse: [
      "Tell us who you're caring for and their situation",
      "Doctor assesses and issues a certificate",
      "Certificate confirms the person needed care",
      "Forward to your employer",
    ],
    backdatingInfo:
      "We can issue certificates for dates you were caring for someone. Example: your child was ill Monday–Wednesday; we can issue a certificate covering those dates.",
    disclaimers: [
      "Carer's leave is an employment right in Australia — your employer must allow it.",
      "A medical certificate documents that care was needed, not the carer's own illness.",
      "Keep the certificate for your records.",
    ],
    faqs: [
      {
        q: "Is carer's leave paid?",
        a: "Yes, in most cases. You typically use your personal/carer's leave entitlement. Check your employment agreement.",
      },
      {
        q: "How many days of carer's leave am I entitled to?",
        a: "Usually 10 days per year in Australia. Check your award or employment contract.",
      },
      {
        q: "Do I need a certificate for carer's leave?",
        a: "It depends on your employer. Some require certificates; others don't. Check your policy.",
      },
      {
        q: "Can I use carer's leave to care for myself if I'm sick?",
        a: "No — that's personal/sick leave. Carer's leave is for caring for others.",
      },
    ],
  },
]

// ============================================
// BENEFIT/WHY PAGES
// ============================================

export interface BenefitPage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  sections: Array<{
    title: string
    content: string
  }>
  faqs: Array<{ q: string; a: string }>
}

export const benefitPages: BenefitPage[] = [
  {
    slug: "why-online-medical-certificate",
    name: "Why Online Medical Certificates",
    title: "Why Choose Online Medical Certificates | InstantMed",
    description:
      "Skip the waiting room. Get a medical certificate in under an hour from home. Legal, valid, and Australian.",
    h1: "Why online medical certificates make sense",
    sections: [
      {
        title: "Speed",
        content:
          "Most requests are done within an hour. No 3-week GP wait, no phone tag, no sitting in a waiting room full of sick people. Get it done, get it sent.",
      },
      {
        title: "Convenience",
        content:
          "Do it from your couch at 2am if you want. No travel, no time off before time off. Fill in a form, doctor reviews, done.",
      },
      {
        title: "Legitimacy",
        content:
          "Our doctors are AHPRA-registered. Certificates are legally valid. Employers must accept them — same as a GP's.",
      },
      {
        title: "Affordability",
        content:
          "Flat $29 fee. No surprise costs, no doctor visit surcharge. Only pay if we can help.",
      },
      {
        title: "Privacy",
        content:
          "Portal-only. No video calls, no live discussion of embarrassing symptoms if you prefer. Just a form and a certificate.",
      },
    ],
    faqs: [
      {
        q: "Is an online medical certificate as valid as one from my GP?",
        a: "Completely. It's issued by a registered doctor and has the same legal standing. Employers must accept it.",
      },
      {
        q: "Will my GP know I used an online service?",
        a: "Only if you tell them or if they're in the same medical network. Your privacy is protected.",
      },
      {
        q: "What if I have a complicated situation?",
        a: "If something's unclear, our doctor may message you. If it needs a real GP conversation, we'll advise.",
      },
    ],
  },
]

// ============================================
// RESOURCE PAGES
// ============================================

export interface ResourcePage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  sections: Array<{
    title: string
    content: string
  }>
  faqs: Array<{ q: string; a: string }>
}

export const resourcePages: ResourcePage[] = [
  {
    slug: "faq-medical-eligibility",
    name: "Medical Certificate Eligibility FAQ",
    title: "Who Can Get a Medical Certificate Online | Eligibility FAQ | InstantMed",
    description:
      "Understand who's eligible for a medical certificate. Medical conditions, age, location, situation.",
    h1: "Medical certificate eligibility — common questions",
    sections: [
      {
        title: "Age & Residency",
        content:
          "You must be 18+ and resident in Australia to use our service. We're for Australian employers and institutions.",
      },
      {
        title: "Medical Conditions",
        content:
          "We can assess most acute conditions: cold, flu, gastro, migraine, back pain, etc. If your condition is complex or requires a physical exam, we may advise seeing a GP in person.",
      },
      {
        title: "Work Situation",
        content:
          "Any type of work. Full-time, part-time, casual, gig work. If your employer requires a certificate, we can provide one.",
      },
      {
        title: "Genuine Illness Only",
        content:
          "You must actually be unwell. Doctors assess whether symptoms match the need for leave. Falsifying is fraud and can result in dismissal.",
      },
    ],
    faqs: [
      {
        q: "Can I get a certificate if I'm not employed?",
        a: "Yes, but certificates are mainly for employment or study. If you need one for another reason, ask.",
      },
      {
        q: "What if I work for myself?",
        a: "You can still get a certificate to document medical leave. Some insurance or tax purposes may need it.",
      },
      {
        q: "Can I get a certificate for a pre-existing condition?",
        a: "Only if you're having an acute flare-up and can't work. Ongoing conditions are managed by your regular doctor.",
      },
      {
        q: "What if my condition doesn't match online assessment?",
        a: "We'll let you know and advise seeing a GP in person.",
      },
    ],
  },

  {
    slug: "medical-disclaimer",
    name: "Medical Disclaimer & Safety",
    title: "Medical Disclaimer | Important Information | InstantMed",
    description:
      "Important disclaimer: InstantMed provides certificates, not treatment. Emergencies need 000 or ED.",
    h1: "Important medical disclaimer",
    sections: [
      {
        title: "What We Are Not",
        content:
          "InstantMed issues medical certificates confirming you're unwell. We do not diagnose conditions, provide treatment, or replace your regular doctor.",
      },
      {
        title: "Emergencies",
        content:
          "If you're experiencing severe symptoms (chest pain, difficulty breathing, severe injury, thoughts of self-harm), call 000 or go to your nearest emergency department. Do not use this service.",
      },
      {
        title: "Medical Advice",
        content:
          "Our doctors provide basic guidance only. If you need detailed medical advice, treatment plans, or ongoing care, see a GP in person.",
      },
      {
        title: "Privacy & Confidentiality",
        content:
          "Your health information is encrypted, confidential, and only seen by the treating doctor. We do not share with employers, insurers, or anyone else.",
      },
    ],
    faqs: [
      {
        q: "Is InstantMed a substitute for a GP?",
        a: "No. We handle urgent certificate needs. For ongoing health issues, see your regular doctor.",
      },
      {
        q: "What if I need a diagnosis, not just a certificate?",
        a: "See a GP in person. We confirm you're unwell; we don't diagnose.",
      },
      {
        q: "Can I get a refund?",
        a: "If we can't help, you won't be charged the consultation fee. A small admin fee may apply.",
      },
    ],
  },
]

// ============================================
// VALIDATORS & HELPERS
// ============================================

export function getAllPages() {
  return {
    conditions: conditionPages,
    certificates: certificatePages,
    benefits: benefitPages,
    resources: resourcePages,
  }
}

export function getPageCount() {
  return {
    conditions: conditionPages.length,
    certificates: certificatePages.length,
    benefits: benefitPages.length,
    resources: resourcePages.length,
    total: conditionPages.length + certificatePages.length + benefitPages.length + resourcePages.length,
  }
}

export function getAllSlugs(pageType: 'conditions' | 'certificates' | 'benefits' | 'resources') {
  const pages = getAllPages()
  return pages[pageType].map((p: ConditionPage | CertificatePage | BenefitPage | ResourcePage) => p.slug)
}

export function getPageBySlug(slug: string, pageType: 'conditions' | 'certificates' | 'benefits' | 'resources') {
  const pages = getAllPages()
  return pages[pageType].find((p: ConditionPage | CertificatePage | BenefitPage | ResourcePage) => p.slug === slug)
}
