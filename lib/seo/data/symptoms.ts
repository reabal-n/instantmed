export interface SymptomData {
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
  /** Clinical triage perspective — how a GP thinks about this symptom */
  doctorPerspective?: string
  /** When this symptom typically warrants a medical certificate */
  certGuidance?: string
}

// Symptom checker SEO pages - what could be causing your symptom
export const symptoms: Record<string, SymptomData> = {
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
    },
    doctorPerspective: "When assessing a sore throat, the first question I ask myself is whether this is likely viral or bacterial — because the treatment is completely different. The majority of sore throats (around 70-80%) are viral and will resolve on their own. I use the modified Centor criteria to estimate the probability of strep throat: sudden onset, high fever, tonsillar exudate, swollen anterior cervical lymph nodes, and absence of cough each score a point. A score of 3 or more raises the probability enough to consider antibiotics. What I am most alert to is peritonsillar abscess (quinsy) — a unilateral swelling that causes difficulty opening the mouth, a muffled voice, and drooling. This requires urgent drainage. For most sore throats, effective pain management with paracetamol, ibuprofen, and salt water gargles is genuinely all that is needed.",
    certGuidance: "A sore throat severe enough to prevent speaking normally, swallowing, or concentrating warrants a medical certificate. Most people need 2-3 days. If you work in a customer-facing or phone-based role, voice rest may require slightly longer.",
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
    },
    doctorPerspective: "Headaches are incredibly common and almost always benign, but the clinical skill lies in recognising the rare dangerous headache. The red flags I screen for are: sudden onset 'thunderclap' headache (reaching maximum intensity within seconds — possible subarachnoid haemorrhage), headache with fever and neck stiffness (possible meningitis), headache after head injury, new headache in someone over 50, headache with visual changes or neurological symptoms, and headache that wakes you from sleep. If none of these are present, the headache is almost certainly a tension headache or migraine. Tension headaches feel like a band squeezing around the head. Migraines are typically one-sided, throbbing, and accompanied by nausea or light sensitivity. For chronic headaches, medication overuse is a paradoxically common cause — regular use of painkillers more than 10-15 days per month can create a cycle of rebound headaches.",
    certGuidance: "Severe headaches — particularly migraines with nausea, visual disturbances, or light sensitivity — legitimately prevent work. Most people need 1-2 days. If headaches are causing frequent absences, discuss preventive treatment with your GP.",
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
    },
    doctorPerspective: "Fatigue is one of the most challenging symptoms in medicine because it has so many possible causes. When someone tells me they are always tired, my approach is systematic: first, I assess lifestyle factors — sleep quality, work hours, stress, diet, exercise, alcohol, caffeine. These account for the majority of fatigue. Second, I consider medical causes that need screening: iron deficiency (very common in menstruating women), thyroid dysfunction, diabetes, vitamin D deficiency, sleep apnoea, depression, and chronic infections. Third, I ask about the pattern — is the fatigue constant or episodic? Does rest help? Is it physical exhaustion or mental fog? These distinctions guide investigation. Blood tests are often warranted to rule out treatable causes. The reassurance I give patients is that most causes of fatigue are identifiable and treatable.",
    certGuidance: "Fatigue severe enough to impair concentration, reaction time, or physical function is a legitimate reason for time off. If your work involves driving, operating machinery, or making safety-critical decisions, working while severely fatigued is genuinely dangerous.",
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
    },
    doctorPerspective: "A cough is the body's protective reflex — it clears the airways of mucus, irritants, and microbes. The clinical approach to cough depends entirely on duration. Acute cough (under 3 weeks) is almost always post-viral and requires no treatment beyond symptomatic relief — it resolves on its own. A cough that persists for 3-8 weeks after a respiratory infection is called a 'post-infectious cough' and is very common — the airways remain irritated and hyperreactive even though the infection has cleared. Chronic cough (over 8 weeks) warrants investigation: the three most common causes are asthma, postnasal drip (upper airway cough syndrome), and gastric reflux — often in combination. The most important red flag is coughing up blood (haemoptysis), which always needs investigation, as does a new persistent cough in a smoker or ex-smoker.",
    certGuidance: "A cough that disrupts sleep, causes vomiting, or makes it difficult to speak for sustained periods can warrant a certificate. Post-viral cough commonly persists for 2-3 weeks — this duration is normal and does not indicate something serious, but may still affect work capacity.",
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
    },
    doctorPerspective: "Fever is not a disease — it is the immune system's response to infection, and in most cases it is actually helpful. A temperature of 37.5-38.5°C in an otherwise well adult does not usually need treatment. Paracetamol and ibuprofen are for comfort, not to 'treat' the fever. What I assess when someone presents with fever is the clinical context: a fever with cold symptoms is almost certainly viral. A fever with a productive cough and breathlessness raises concern for pneumonia. A fever with urinary symptoms suggests UTI. Fever with rash, neck stiffness, or confusion requires urgent assessment. The height of the fever is less important than the overall clinical picture — a person with 38°C who looks unwell concerns me more than someone with 39°C who is drinking fluids and alert. In adults, fever rarely causes brain damage (that concern applies to very young children with febrile convulsions).",
    certGuidance: "A fever above 38°C typically warrants staying home — both for your recovery and to avoid spreading infection to colleagues. Most febrile illnesses resolve in 2-5 days. You should be fever-free for 24 hours without medication before returning to work.",
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
    },
    doctorPerspective: "Dysuria (burning on urination) in an otherwise healthy woman is UTI until proven otherwise — the positive predictive value of this symptom is over 90%. This is one of the most straightforward telehealth consultations: the symptom pattern (burning, frequency, urgency, sometimes blood in urine) is so characteristic that urine testing is not required before starting treatment in uncomplicated cases. In men, burning on urination is more complex — UTIs in men always warrant investigation as they suggest an underlying structural or functional issue. I also consider STI screening in sexually active patients with dysuria, particularly if there is urethral discharge. The key red flags I screen for are flank pain, fever, and rigors — these suggest the infection has reached the kidneys (pyelonephritis) and may need more aggressive treatment.",
    certGuidance: "A UTI can make concentration difficult and require frequent bathroom trips. Most people can work with mild symptoms, but severe burning, urgency, or associated fever warrants 1-2 days off. With antibiotics, significant relief usually comes within 24-48 hours.",
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
    },
    doctorPerspective: "Hair thinning is a sensitive topic and patients often delay seeking help. The most common cause by far is androgenetic alopecia (male or female pattern hair loss) — a genetic condition that responds well to treatment when started early. The key is early intervention: finasteride and minoxidil are most effective at preventing further loss rather than regrowing what has already gone. Other causes I consider include thyroid dysfunction, iron deficiency, stress-related telogen effluvium (which typically occurs 2-3 months after a significant stressor), autoimmune alopecia, and medication side effects. A thorough history usually identifies the pattern, and blood tests may be needed to rule out medical causes. Telehealth is well-suited for hair loss assessment because the diagnosis is largely visual and history-based.",
    certGuidance: "Hair thinning itself is unlikely to require a medical certificate, though the psychological impact (anxiety, depression) may. If hair loss is causing significant distress affecting your work or daily function, that is a legitimate reason to seek support.",
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
    },
    doctorPerspective: "Chest pain always warrants careful assessment, but it is important to know that the majority of chest pain in young, otherwise healthy adults is NOT cardiac. Musculoskeletal chest pain (from strained muscles, costochondritis, or poor posture), acid reflux, and anxiety-related chest tightness are far more common causes. However, I never dismiss chest pain without a proper assessment. The features that raise cardiac concern are: pain with exertion that resolves with rest, pain radiating to the jaw or left arm, pain with breathlessness and sweating, a family history of early heart disease, and age over 40 with risk factors. If you are experiencing any of these features, call 000 immediately — do not wait for a telehealth appointment. For non-urgent, recurrent chest discomfort without alarm features, telehealth can help identify the likely cause and guide next steps.",
    certGuidance: "Any chest pain that required emergency assessment legitimately warrants time off for recovery and follow-up. For musculoskeletal or reflux-related chest pain, a certificate is appropriate if symptoms are affecting your ability to work comfortably.",
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
    },
    doctorPerspective: "Frequent urination has a broad differential, and the clinical approach depends on whether it is accompanied by other symptoms. In women, the most common cause is UTI — frequency with burning and urgency. In men over 50, benign prostatic hyperplasia (BPH) is the leading cause. New-onset frequent urination with excessive thirst and weight loss raises immediate concern for diabetes and warrants a blood glucose test. Overactive bladder (urge incontinence) is another common cause that responds well to treatment. I also ask about fluid intake — many people drink excessive caffeine or water and mistake normal physiological output for a problem. Nocturia (waking at night to urinate) more than once is worth investigating, particularly in older adults.",
    certGuidance: "Frequent urination itself rarely prevents work but can be highly disruptive. If caused by a UTI, 1-2 days with treatment usually resolves urgency. Ensure easy bathroom access at work during recovery.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Nausea is a symptom, not a diagnosis, and it has dozens of possible causes. The clinical approach starts with context: sudden onset with vomiting and diarrhoea points to gastro or food poisoning. Nausea with a missed period — pregnancy test first. Nausea after starting a new medication — likely a side effect. Nausea worse after meals — consider reflux or gallbladder issues. Morning nausea with headache — check blood pressure and consider raised intracranial pressure if persistent. Isolated nausea with anxiety is also extremely common. The key red flags are nausea with severe abdominal pain, vomiting blood, black stools, or inability to keep any fluids down for 12 hours — these need urgent assessment.",
    certGuidance: "Persistent nausea that prevents eating, concentrating, or travelling safely to work is a valid reason for a certificate. Most nausea from viral causes resolves in 1-2 days.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Dizziness is a vague term that can mean different things to different people, so the first thing I clarify is what they actually feel. True vertigo (the room is spinning) suggests an inner ear or vestibular problem. Lightheadedness (feeling faint) suggests blood pressure, dehydration, or cardiac causes. Unsteadiness (feeling off-balance) may be neurological or musculoskeletal. BPPV is the most common vestibular cause and is highly treatable with the Epley manoeuvre. The key safety question is whether dizziness makes driving unsafe — if so, a medical certificate is not just appropriate, it is a duty-of-care issue.",
    certGuidance: "If dizziness makes driving or operating machinery unsafe, you must not work in those roles until the symptom resolves. A medical certificate is appropriate and important for safety. Most vestibular dizziness resolves within 1-2 weeks.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=med-cert" },
    doctorPerspective: "A runny nose on its own is rarely serious and usually indicates a viral cold or allergic rhinitis. The clinical question is whether it is infectious (clear initially, then thickening over days, with other cold symptoms) or allergic (clear, watery, with sneezing and itchy eyes, often seasonal). Green or yellow mucus does NOT automatically mean bacterial infection — it simply means the immune system is active. Bacterial sinusitis is considered if nasal symptoms persist beyond 10 days without improvement or if there is a 'double worsening' pattern.",
    certGuidance: "A runny nose alone is unlikely to warrant a certificate unless combined with other symptoms (fever, body aches, fatigue) that prevent work. As part of a cold or flu, 2-3 days is typical.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=med-cert" },
    doctorPerspective: "Generalised body aches most commonly accompany viral infections — influenza is the classic example, producing profound muscle pain alongside fever and fatigue. COVID-19 also frequently causes body aches. The mechanism is the immune system releasing cytokines that cause widespread inflammation. Body aches can also be caused by overexertion, dehydration, fibromyalgia, or autoimmune conditions. If body aches persist beyond 2 weeks without an obvious cause, blood tests may be warranted to check for underlying conditions.",
    certGuidance: "Body aches as part of flu or viral illness warrant 3-5 days off. The aches usually resolve as the infection clears. If body aches are so severe that you cannot perform physical tasks or concentrate, a certificate is appropriate.",
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
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Shortness of breath is a symptom I take seriously because the range of causes spans from harmless (anxiety-related hyperventilation) to life-threatening (pulmonary embolism, heart failure). The key clinical question is: is this acute (sudden onset) or chronic (gradual)? Sudden breathlessness in an otherwise well person needs urgent assessment — especially with chest pain, leg swelling, or recent immobilisation. Gradual breathlessness that worsens over weeks often points to asthma, anaemia, deconditioning, or early heart failure. Anxiety is a very common cause but should only be attributed after other causes are excluded. If you are unsure, err on the side of seeking help — breathing difficulty is always taken seriously.",
    certGuidance: "Any significant breathlessness affecting your ability to walk, climb stairs, or perform normal tasks warrants time off. If breathlessness required emergency assessment, follow-up rest is appropriate. Always discuss return to work with your treating doctor.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Abdominal pain is one of the broadest symptom categories in medicine — the abdomen contains dozens of organs, and the location, character, and timing of pain all provide diagnostic clues. Epigastric pain (upper centre) after meals suggests gastritis or reflux. Right lower quadrant pain with fever raises concern for appendicitis. Left lower quadrant pain with bowel changes may indicate diverticulitis. Crampy, diffuse pain with diarrhoea points to gastro or IBS. The key emergency features are: sudden severe pain (especially if rigid abdomen), pain with fainting, vomiting blood, or pain in pregnancy. For mild-moderate abdominal discomfort without alarm features, telehealth can help determine the likely cause and appropriate next steps.",
    certGuidance: "Abdominal pain that prevents sitting comfortably, concentrating, or commuting is a valid reason for a certificate. Gastro-related abdominal pain typically warrants 1-3 days off. More complex causes may require longer.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=med-cert" },
    doctorPerspective: "Neck pain is extremely common and almost always musculoskeletal — caused by poor posture (particularly prolonged computer use), sleeping in an awkward position, or muscle strain. Like back pain, the evidence strongly supports staying gently active rather than immobilising the neck. The red flags I screen for are: neck pain with fever and headache (possible meningitis), pain after trauma (possible fracture), numbness or weakness in the arms or hands (possible nerve compression), and difficulty with balance or coordination (possible spinal cord involvement). In the absence of these, imaging is rarely needed — MRI findings of disc degeneration are so common in asymptomatic people that they often cause unnecessary alarm.",
    certGuidance: "Neck pain that prevents driving (inability to check blind spots safely) or computer work (inability to maintain a comfortable head position) warrants a certificate. Most acute neck pain improves within a week with self-management.",
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
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Bloating is one of the most common digestive complaints and is usually benign. The most frequent cause is simply eating too quickly or consuming gas-producing foods (beans, cruciferous vegetables, carbonated drinks). IBS is the most common medical cause of recurrent bloating. What I am alert to is persistent bloating that is progressive (getting worse over weeks) — particularly in women over 50, where persistent bloating is one of the key early symptoms of ovarian cancer. Other red flags include bloating with unintentional weight loss, bloating with blood in stool, or new bloating with a change in bowel habits after age 50. For most patients, a food diary and dietary adjustment resolve the issue without medical intervention.",
    certGuidance: "Bloating alone rarely requires a certificate, but when part of an IBS flare with significant pain and urgency, 1-2 days may be warranted.",
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
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Earache in adults most commonly comes from otitis externa (outer ear infection) or referred pain from the throat or jaw — not from middle ear infections, which are far more common in children. The key clinical distinction is whether the pain worsens when you tug on the earlobe (otitis externa — treated with ear drops) or is deep in the ear with hearing changes (otitis media — may need oral antibiotics). Eustachian tube dysfunction during or after a cold is another very common cause of ear discomfort and fullness. I always ask about hearing changes, discharge, and recent swimming or water exposure. The red flag is swelling or tenderness behind the ear (mastoiditis), which requires urgent in-person assessment.",
    certGuidance: "Ear infections can cause significant pain and reduced hearing that affects work performance. A certificate for 1-3 days is appropriate for acute ear infections, particularly if pain disrupts sleep.",
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
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Itching (pruritus) without a visible rash is a diagnostically interesting symptom. If there is a rash, the cause is usually dermatological — eczema, contact dermatitis, fungal infection, hives, or insect bites. But generalised itching without any rash can indicate systemic conditions: liver disease (bile salt deposition), kidney disease (uraemia), thyroid dysfunction, iron deficiency, or rarely, lymphoma. This is why persistent, unexplained itching warrants blood tests. For itching with a clear skin cause, treatment is usually straightforward — moisturisers for dry skin, topical steroids for eczema, antifungals for fungal infections, and antihistamines for allergic reactions. The most important self-care advice is to avoid scratching — it creates an itch-scratch cycle that worsens the condition.",
    certGuidance: "Severe itching — particularly from eczema flares or allergic reactions — can be genuinely debilitating and affect sleep and concentration. A certificate is appropriate when itching significantly impairs your ability to work.",
  },
  "heart-palpitations": {
    name: "Heart Palpitations",
    slug: "heart-palpitations",
    description: "An awareness of your heartbeat — racing, pounding, fluttering, or skipping beats. Usually benign but can be frightening.",
    possibleCauses: [
      { name: "Anxiety or stress", likelihood: "common", description: "Adrenaline causes the heart to beat faster and harder.", whenToSuspect: ["During stress", "With other anxiety symptoms", "Resolves when calm"] },
      { name: "Caffeine or stimulants", likelihood: "common", description: "Coffee, energy drinks, and some medications.", whenToSuspect: ["After coffee/energy drinks", "Dose-dependent"] },
      { name: "Exercise or physical exertion", likelihood: "common", description: "Normal response to activity.", whenToSuspect: ["During or after exercise", "Settles with rest"] },
      { name: "Dehydration", likelihood: "common", description: "Low fluid volume increases heart rate.", whenToSuspect: ["Hot weather", "Not drinking enough", "Dark urine"] },
      { name: "Arrhythmia", likelihood: "less-common", description: "Abnormal heart rhythm requiring investigation.", whenToSuspect: ["Irregular pattern", "At rest", "With dizziness or fainting"] },
      { name: "Thyroid overactivity", likelihood: "less-common", description: "Hyperthyroidism increases heart rate.", whenToSuspect: ["Weight loss", "Heat intolerance", "Tremor", "Anxiety"] }
    ],
    selfCareAdvice: ["Reduce caffeine intake", "Stay well hydrated", "Practice slow breathing", "Manage stress", "Avoid alcohol excess", "Get adequate sleep"],
    whenToSeeDoctor: ["Frequent palpitations at rest", "Palpitations with dizziness or fainting", "Family history of heart conditions", "Palpitations with chest pain", "You need reassurance or investigation"],
    emergencySigns: ["Palpitations with chest pain or pressure", "Fainting or loss of consciousness", "Severe breathlessness", "Palpitations lasting more than 15 minutes at rest"],
    relatedSymptoms: ["chest-pain", "anxiety", "dizziness", "shortness-of-breath"],
    faqs: [
      { q: "Are heart palpitations dangerous?", a: "Most palpitations are harmless — caused by caffeine, stress, or exercise. However, palpitations with chest pain, fainting, or severe breathlessness need urgent assessment to rule out arrhythmias." },
      { q: "Should I see a cardiologist?", a: "Not usually as a first step. Your GP can arrange an ECG and blood tests. Specialist referral is needed if an arrhythmia is detected or palpitations are frequent and unexplained." },
      { q: "Can anxiety cause heart palpitations?", a: "Yes — anxiety is one of the most common causes. Adrenaline from the fight-or-flight response directly increases heart rate and force of contraction." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Heart palpitations are one of the most anxiety-provoking symptoms patients experience, but the vast majority are benign. When I assess palpitations, I first determine the pattern: are they regular or irregular? Brief or sustained? Associated with exertion or at rest? Palpitations during stress, after caffeine, or during exercise are almost always normal physiological responses. The features that raise concern are palpitations at rest that are irregular, sustained (more than 15 minutes), associated with dizziness or fainting, or occurring with chest pain. These may indicate an arrhythmia requiring investigation with an ECG or Holter monitor. Importantly, many patients with benign palpitations enter a cycle where anxiety about the palpitations causes more adrenaline, which causes more palpitations — breaking this cycle with reassurance and breathing techniques is often the most effective treatment.",
    certGuidance: "Palpitations alone rarely prevent work unless they cause significant dizziness or anxiety. If palpitations required emergency assessment or investigation, time off for recovery and follow-up is appropriate.",
  },
  "joint-pain": {
    name: "Joint Pain",
    slug: "joint-pain",
    description: "Pain, stiffness, or swelling in one or more joints. Can be caused by injury, overuse, arthritis, infection, or autoimmune conditions.",
    possibleCauses: [
      { name: "Osteoarthritis", likelihood: "common", description: "Wear-and-tear arthritis, increases with age.", whenToSuspect: ["Over 45", "Stiffness after rest", "Affects knees, hips, or hands", "Gradual onset"] },
      { name: "Injury or overuse", likelihood: "common", description: "Strain, sprain, or repetitive use.", whenToSuspect: ["Recent activity change", "Localised to one joint", "Swelling after activity"] },
      { name: "Gout", likelihood: "less-common", description: "Sudden, severe joint inflammation from uric acid.", whenToSuspect: ["Sudden onset", "Big toe", "Extremely painful", "Red and hot"] },
      { name: "Rheumatoid arthritis", likelihood: "less-common", description: "Autoimmune joint inflammation.", whenToSuspect: ["Multiple joints", "Morning stiffness >30min", "Symmetric (both sides)", "Under 50"] },
      { name: "Viral infection", likelihood: "common", description: "Many viruses cause temporary joint pain.", whenToSuspect: ["With fever or rash", "Recent illness", "Multiple joints", "Resolves in weeks"] }
    ],
    selfCareAdvice: ["Rest the affected joint but maintain gentle movement", "Apply ice for acute pain or heat for chronic stiffness", "Over-the-counter anti-inflammatories (ibuprofen)", "Gentle stretching and strengthening", "Maintain healthy weight to reduce joint load"],
    whenToSeeDoctor: ["Joint pain lasting more than 2 weeks", "Significant swelling, redness, or warmth", "Joint pain with fever", "Inability to use the joint normally", "You need a medical certificate"],
    emergencySigns: ["Hot, red, swollen joint with fever (possible septic arthritis — emergency)", "Joint pain after significant trauma with deformity", "Unable to bear weight on the affected joint"],
    relatedSymptoms: ["back-pain", "neck-pain", "muscle-strain"],
    faqs: [
      { q: "Can I get a medical certificate for joint pain?", a: "Yes. Joint pain — particularly in weight-bearing joints or hands — can significantly affect your ability to work. A certificate is appropriate, especially for physical roles." },
      { q: "When does joint pain need investigation?", a: "See a doctor if pain persists beyond 2 weeks, if the joint is swollen/hot/red, if multiple joints are affected, or if you have morning stiffness lasting more than 30 minutes (possible inflammatory arthritis)." },
      { q: "Should I use heat or ice?", a: "Ice for acute pain and swelling (first 48 hours of a new injury). Heat for chronic stiffness and muscle tension. Many people benefit from alternating both." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Joint pain is one of the broadest symptom categories in medicine, and the approach depends on whether it is one joint or many, acute or chronic, and inflammatory or mechanical. A single hot, red, swollen joint with fever is septic arthritis until proven otherwise — this is a medical emergency requiring urgent in-person assessment and joint aspiration. In contrast, gradual knee stiffness in a 55-year-old is almost certainly osteoarthritis and can be managed with exercise and weight management. The key features I assess remotely are: which joints, how many, morning stiffness duration (more than 30 minutes suggests inflammatory arthritis), and associated symptoms (fever, rash, eye inflammation). This allows me to triage effectively between conditions that need urgent attention and those that can be managed conservatively.",
    certGuidance: "Joint pain affecting weight-bearing joints (knees, hips, ankles) or hands can prevent physical work and desk work respectively. Gout attacks are among the most painful conditions and typically warrant 3-5 days off.",
  },
  "weight-gain": {
    name: "Unexplained Weight Gain",
    slug: "weight-gain",
    description: "Gaining weight without a clear change in diet or exercise habits. May indicate hormonal, metabolic, or medication-related causes.",
    possibleCauses: [
      { name: "Hypothyroidism", likelihood: "less-common", description: "Underactive thyroid slows metabolism.", whenToSuspect: ["Fatigue", "Cold intolerance", "Constipation", "Dry skin"] },
      { name: "Medication side effects", likelihood: "common", description: "Many medications cause weight gain.", whenToSuspect: ["Started new medication", "Antidepressants, steroids, insulin, contraceptive pill"] },
      { name: "Fluid retention", likelihood: "common", description: "Excess fluid causing rapid weight increase.", whenToSuspect: ["Swollen ankles", "Rapid gain over days", "Tight rings or shoes"] },
      { name: "PCOS (polycystic ovary syndrome)", likelihood: "less-common", description: "Hormonal condition in women.", whenToSuspect: ["Irregular periods", "Acne", "Excess hair growth", "Difficulty losing weight"] },
      { name: "Cushing's syndrome", likelihood: "rare", description: "Excess cortisol production.", whenToSuspect: ["Central obesity", "Moon face", "Stretch marks", "Thin skin"] }
    ],
    selfCareAdvice: ["Track food intake accurately — many people underestimate consumption by 40-50%", "Maintain regular physical activity", "Check medication side effects with your doctor", "Get adequate sleep — poor sleep disrupts hunger hormones", "Manage stress — cortisol promotes fat storage"],
    whenToSeeDoctor: ["Unexplained weight gain of 5kg+ over a few months", "Weight gain with other symptoms (fatigue, hair loss, menstrual changes)", "Rapid weight gain over days (possible fluid retention)", "Difficulty losing weight despite genuine effort"],
    emergencySigns: ["Rapid weight gain with severe breathlessness (possible heart failure)", "Sudden leg swelling with chest pain (possible blood clot)", "Rapid weight gain with facial swelling (possible kidney problems)"],
    relatedSymptoms: ["fatigue", "bloating"],
    faqs: [
      { q: "What medical conditions cause weight gain?", a: "The most common are hypothyroidism, PCOS, medication side effects, insulin resistance, Cushing's syndrome, and fluid retention from heart, liver, or kidney conditions. Blood tests can screen for most of these." },
      { q: "Which medications cause weight gain?", a: "Common culprits include some antidepressants (mirtazapine, amitriptyline), antipsychotics, corticosteroids, insulin, sulfonylureas, beta-blockers, and some contraceptives." },
      { q: "Should I get blood tests?", a: "Yes, if weight gain is genuinely unexplained. A basic panel should include thyroid function (TSH), fasting glucose and HbA1c, cortisol, and a full blood count. PCOS testing may be appropriate for women." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "When a patient tells me they are gaining weight without eating more, I take it seriously — but I also investigate honestly. Research shows that most people significantly underestimate their caloric intake (by 40-50% on average). That said, genuine unexplained weight gain does occur and has identifiable medical causes. The most common is hypothyroidism, followed by medication side effects (which are vastly underappreciated — many commonly prescribed medications cause 5-10kg of weight gain). PCOS in women is another major cause. The investigation is straightforward: thyroid function, fasting glucose, and in some cases hormone panels. Via telehealth, I can order the appropriate blood tests, review medications for weight-gaining culprits, and provide evidence-based guidance.",
    certGuidance: "Unexplained weight gain itself rarely requires a certificate, but the underlying cause (hypothyroidism, depression) or associated symptoms (severe fatigue, mobility limitation) may.",
  },
  "hair-loss": {
    name: "Hair Loss",
    slug: "hair-loss",
    description: "Thinning, shedding, or bald patches on the scalp. Can be caused by genetics, hormones, stress, nutritional deficiencies, or autoimmune conditions.",
    possibleCauses: [
      { name: "Androgenetic alopecia (male/female pattern)", likelihood: "common", description: "Genetic hair loss — the most common type.", whenToSuspect: ["Family history", "Gradual thinning", "Receding hairline (men)", "Widening part (women)"] },
      { name: "Telogen effluvium (stress-related)", likelihood: "common", description: "Temporary shedding 2-3 months after a stressor.", whenToSuspect: ["Recent illness, surgery, or stress", "Diffuse thinning", "Started 2-3 months after event"] },
      { name: "Iron or nutritional deficiency", likelihood: "less-common", description: "Low iron, zinc, or vitamin D can cause hair loss.", whenToSuspect: ["Fatigue", "Vegetarian/vegan", "Heavy periods", "Diffuse thinning"] },
      { name: "Thyroid dysfunction", likelihood: "less-common", description: "Both hypo- and hyperthyroidism cause hair loss.", whenToSuspect: ["Fatigue or anxiety", "Weight changes", "Temperature sensitivity"] },
      { name: "Alopecia areata", likelihood: "less-common", description: "Autoimmune patches of hair loss.", whenToSuspect: ["Round bald patches", "Smooth skin in patches", "May regrow spontaneously"] }
    ],
    selfCareAdvice: ["Don't panic — stress worsens hair loss. Most types are treatable", "Get blood tests for iron, thyroid, vitamin D, and zinc", "Use gentle hair care — avoid excessive heat, tight styles, and harsh chemicals", "Consider minoxidil (available OTC) for pattern hair loss", "Ensure adequate protein intake — hair is made of protein"],
    whenToSeeDoctor: ["Sudden or rapid hair loss", "Bald patches appearing", "Hair loss with scalp symptoms (pain, itching, redness)", "Hair loss after starting new medication", "You want to discuss treatment options"],
    emergencySigns: ["Hair loss with severe scalp pain and scarring (possible scarring alopecia — needs dermatology)", "Complete hair loss over days (rare — needs urgent assessment)"],
    relatedSymptoms: ["fatigue", "stress"],
    faqs: [
      { q: "Can a doctor help with hair loss?", a: "Yes. A doctor can identify the cause (blood tests for deficiencies, thyroid, hormones), prescribe treatments (finasteride, minoxidil, iron supplementation), and refer to a dermatologist if needed." },
      { q: "Is hair loss reversible?", a: "It depends on the cause. Telogen effluvium (stress-related) is fully reversible. Iron/thyroid-related hair loss reverses with treatment. Pattern hair loss can be slowed and partially reversed with early treatment but is progressive without it." },
      { q: "What treatments are available?", a: "Minoxidil (topical, OTC), finasteride (prescription, for men), iron/vitamin supplements if deficient, and referral for PRP therapy or specialist treatments for resistant cases." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Hair loss consultations have increased significantly in telehealth — likely because patients find it easier to discuss a sensitive topic from home. The diagnostic approach starts with the pattern: is it diffuse (all over) or patchy? Gradual or sudden? Diffuse gradual thinning in a typical pattern strongly suggests androgenetic alopecia (genetic). Diffuse shedding 2-3 months after a stressor (illness, surgery, childbirth, severe stress) is telogen effluvium — this is fully reversible. Patchy loss with smooth skin suggests alopecia areata. I always check for treatable causes: iron, ferritin, thyroid function, zinc, and vitamin D — these are all correctable and commonly overlooked. For androgenetic alopecia, the key message is that early treatment (minoxidil ± finasteride for men) is far more effective at preventing further loss than trying to regrow what's already gone.",
    certGuidance: "Hair loss itself is unlikely to require a medical certificate, but the psychological impact can be significant. If hair loss is causing anxiety or depression that affects work, that is a legitimate reason for support.",
  },
  "eye-strain": {
    name: "Eye Strain (Digital Eye Strain)",
    slug: "eye-strain",
    description: "Tired, sore, or dry eyes from prolonged screen use or close-up work. Also called computer vision syndrome. Affects up to 90% of people who use screens for 2+ hours daily.",
    possibleCauses: [
      { name: "Prolonged screen use", likelihood: "common", description: "Reduced blink rate and sustained focus cause strain.", whenToSuspect: ["Worse after screen time", "Better on weekends", "Late afternoon symptoms"] },
      { name: "Poor lighting or glare", likelihood: "common", description: "Screen brightness mismatch with environment.", whenToSuspect: ["Overhead fluorescent lighting", "Screen facing window", "No screen filter"] },
      { name: "Uncorrected vision", likelihood: "common", description: "Needing glasses or updated prescription.", whenToSuspect: ["Squinting", "Headaches", "Holding phone closer"] },
      { name: "Dry eye syndrome", likelihood: "less-common", description: "Insufficient tear production.", whenToSuspect: ["Eyes feel gritty", "Worse in air conditioning", "Contact lens discomfort"] }
    ],
    selfCareAdvice: ["Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds", "Blink deliberately — screen use reduces blink rate by 50%", "Adjust screen brightness to match your environment", "Use lubricating eye drops (artificial tears)", "Position screen at arm's length, slightly below eye level"],
    whenToSeeDoctor: ["Eye strain with persistent headaches", "Vision changes or blurred vision", "Eye pain (not just tiredness)", "Symptoms not improving with self-care", "You need an eye test referral"],
    emergencySigns: ["Sudden vision loss or dark spots", "Severe eye pain", "Flashing lights or new floaters", "Double vision"],
    relatedSymptoms: ["headache", "neck-pain"],
    faqs: [
      { q: "Can screens damage my eyes?", a: "Screens don't cause permanent eye damage, but they do cause temporary symptoms (strain, dryness, headache). The real concern is that we blink 50% less when using screens, leading to dry eyes and fatigue." },
      { q: "Do blue light glasses help?", a: "Evidence is mixed. Current research suggests blue light glasses have minimal effect on eye strain. Better strategies are the 20-20-20 rule, proper screen positioning, and adequate lighting." },
      { q: "Can I get a medical certificate for eye strain?", a: "Severe eye strain with headaches can affect your ability to do screen-based work. A certificate may be appropriate, along with recommendations for workplace ergonomic assessment." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Digital eye strain is the occupational health epidemic of the modern workplace. Nearly everyone who works at a screen for more than 2 hours daily experiences it to some degree, yet very few seek help or make the simple adjustments that resolve it. The root cause is that our eyes evolved for distance vision and outdoor light — sustained near-focus on a backlit screen in an air-conditioned room is physiologically demanding. The most effective intervention is the 20-20-20 rule, combined with deliberate blinking and appropriate screen positioning. I also always recommend an eye test to rule out uncorrected refractive error — even a mild prescription that you 'don't really need' can eliminate eye strain entirely.",
    certGuidance: "Severe eye strain can make screen-based work impossible. If headaches and eye fatigue are debilitating despite ergonomic adjustments, a certificate and optometry referral are appropriate.",
  },
  "sleep-apnoea": {
    name: "Sleep Apnoea",
    slug: "sleep-apnoea",
    description: "A condition where breathing repeatedly stops and starts during sleep. Causes loud snoring, daytime sleepiness, and increases the risk of heart disease, stroke, and diabetes.",
    possibleCauses: [
      { name: "Obstructive sleep apnoea (OSA)", likelihood: "common", description: "Throat muscles relax excessively during sleep, blocking the airway.", whenToSuspect: ["Loud snoring", "Witnessed apnoeas (partner sees you stop breathing)", "Overweight", "Neck circumference >40cm"] },
      { name: "Central sleep apnoea", likelihood: "rare", description: "Brain doesn't send proper signals to breathing muscles.", whenToSuspect: ["Heart failure", "Opioid use", "No snoring", "Cheyne-Stokes breathing pattern"] }
    ],
    selfCareAdvice: ["Lose weight if overweight — even 5-10% weight loss can significantly reduce OSA severity", "Sleep on your side — back sleeping worsens obstruction", "Avoid alcohol within 3 hours of bedtime — it relaxes throat muscles", "Avoid sedating medications before bed", "Maintain regular sleep schedule"],
    whenToSeeDoctor: ["Loud snoring with witnessed breathing pauses", "Excessive daytime sleepiness despite adequate sleep hours", "Morning headaches", "Difficulty concentrating", "Falling asleep while driving (urgent)"],
    emergencySigns: ["Falling asleep at the wheel or during safety-critical tasks", "Severe breathlessness on waking", "Chest pain on waking"],
    relatedSymptoms: ["fatigue", "headache", "insomnia"],
    faqs: [
      { q: "How is sleep apnoea diagnosed?", a: "A sleep study (polysomnography) is the gold standard. Home-based sleep studies are now available and are more convenient. Your GP can arrange a referral." },
      { q: "What is CPAP?", a: "Continuous Positive Airway Pressure — a machine that gently blows air through a mask to keep your airway open during sleep. It is the most effective treatment for moderate-severe OSA." },
      { q: "Is sleep apnoea dangerous?", a: "Untreated OSA significantly increases risk of heart attack, stroke, type 2 diabetes, and car accidents (due to daytime sleepiness). Treatment with CPAP dramatically reduces these risks." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Sleep apnoea is one of the most underdiagnosed conditions in Australia — up to 80% of moderate-to-severe cases remain undiagnosed. The classic presentation is a middle-aged, overweight male with loud snoring and daytime sleepiness, but it affects women too (particularly after menopause) and can occur at any weight. Via telehealth, I can screen using validated questionnaires (STOP-BANG, Epworth Sleepiness Scale), arrange home sleep study referrals, and discuss treatment options. The most important reason to diagnose and treat OSA is cardiovascular risk reduction — untreated severe OSA doubles the risk of heart attack and stroke. CPAP compliance is the main challenge, but modern machines are quieter, smaller, and more comfortable than older models.",
    certGuidance: "Untreated severe OSA with excessive daytime sleepiness is a safety risk for driving and operating machinery. A certificate may be appropriate while awaiting diagnosis and treatment initiation.",
  },
  "acid-reflux-cough": {
    name: "Chronic Cough",
    slug: "chronic-cough",
    description: "A cough lasting more than 8 weeks. The three most common causes in non-smokers are asthma, postnasal drip, and acid reflux — often in combination.",
    possibleCauses: [
      { name: "Asthma (cough-variant)", likelihood: "common", description: "Airway hyperreactivity causing cough without typical wheeze.", whenToSuspect: ["Worse at night", "Triggered by cold air or exercise", "No other cold symptoms", "Responds to inhaler trial"] },
      { name: "Postnasal drip (upper airway cough syndrome)", likelihood: "common", description: "Mucus from sinuses dripping down throat.", whenToSuspect: ["Throat clearing", "Runny/blocked nose", "Worse lying down", "Allergies"] },
      { name: "Acid reflux (GORD)", likelihood: "common", description: "Stomach acid irritating the lower oesophagus and throat.", whenToSuspect: ["Heartburn", "Worse after meals or lying down", "Sour taste", "Hoarse voice"] },
      { name: "Post-infectious cough", likelihood: "common", description: "Cough persisting weeks after a respiratory infection.", whenToSuspect: ["Started with a cold", "Gradually improving", "No new symptoms"] },
      { name: "ACE inhibitor medication", likelihood: "less-common", description: "Common side effect of blood pressure medications.", whenToSuspect: ["Taking ramipril, perindopril, or enalapril", "Dry tickling cough", "Started weeks to months after medication"] },
      { name: "Lung pathology", likelihood: "rare", description: "Requires investigation in persistent cases.", whenToSuspect: ["Smoker or ex-smoker", "Coughing blood", "Weight loss", "Breathlessness"] }
    ],
    selfCareAdvice: ["If post-infectious: honey in warm water, time is the best treatment", "If reflux-related: eat smaller meals, don't eat before bed, elevate the head of the bed", "If allergic: nasal corticosteroid spray and antihistamines", "Stay hydrated", "Avoid known triggers (smoke, strong perfumes, cold air)"],
    whenToSeeDoctor: ["Cough lasting more than 8 weeks", "Coughing up blood (even small amounts)", "Cough with unexplained weight loss", "Cough with increasing breathlessness", "Cough affecting sleep or daily life"],
    emergencySigns: ["Coughing up significant blood", "Severe breathlessness with cough", "Chest pain with cough", "Cough with high fever and rigors"],
    relatedSymptoms: ["cough", "sore-throat", "chest-pain", "shortness-of-breath"],
    faqs: [
      { q: "How long is too long for a cough?", a: "A cough lasting more than 8 weeks is considered chronic and warrants investigation. Post-infectious coughs can last 2-3 weeks after a cold — this duration is normal." },
      { q: "What tests might I need?", a: "Depending on the likely cause: spirometry (for asthma), chest X-ray (for smokers or if lung pathology suspected), trial of PPI medication (for reflux), or nasal endoscopy (for postnasal drip)." },
      { q: "Can I get a medical certificate for chronic cough?", a: "Yes. A persistent cough can disrupt sleep, cause voice strain, and make certain work environments difficult (quiet offices, phone-based work)." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Chronic cough is one of the most common reasons for GP referral, and the diagnosis often involves treating the three most common causes (asthma, postnasal drip, reflux) sequentially or simultaneously. The key in telehealth assessment is ruling out serious causes first: any smoker or ex-smoker with a new or changed cough needs a chest X-ray. Coughing blood (haemoptysis) always warrants investigation. Unexplained weight loss with cough raises concern for malignancy. Once these are excluded, the 'big three' account for over 90% of chronic cough cases. A structured trial of treatment — inhaler for possible asthma, nasal steroid for postnasal drip, PPI for reflux — often identifies the cause by which treatment works. ACE inhibitor cough is a commonly overlooked cause that resolves within 1-4 weeks of switching medication.",
    certGuidance: "Chronic cough can be disruptive at work — particularly in quiet environments. If cough is severe enough to cause vomiting, urinary incontinence, or significant sleep disruption, a certificate is appropriate.",
  }
}
