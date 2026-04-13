/**
 * General and systemic symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const generalSystemicSymptoms: Record<string, SymptomData> = {
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
    doctorPerspective: "Fatigue is one of the most challenging symptoms in medicine because it has so many possible causes. When someone tells me they are always tired, my approach is systematic: first, I assess lifestyle factors - sleep quality, work hours, stress, diet, exercise, alcohol, caffeine. These account for the majority of fatigue. Second, I consider medical causes that need screening: iron deficiency (very common in menstruating women), thyroid dysfunction, diabetes, vitamin D deficiency, sleep apnoea, depression, and chronic infections. Third, I ask about the pattern - is the fatigue constant or episodic? Does rest help? Is it physical exhaustion or mental fog? These distinctions guide investigation. Blood tests are often warranted to rule out treatable causes. The reassurance I give patients is that most causes of fatigue are identifiable and treatable.",
    certGuidance: "Fatigue severe enough to impair concentration, reaction time, or physical function is a legitimate reason for time off. If your work involves driving, operating machinery, or making safety-critical decisions, working while severely fatigued is genuinely dangerous.",
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
    doctorPerspective: "Fever is not a disease - it is the immune system's response to infection, and in most cases it is actually helpful. A temperature of 37.5-38.5°C in an otherwise well adult does not usually need treatment. Paracetamol and ibuprofen are for comfort, not to 'treat' the fever. What I assess when someone presents with fever is the clinical context: a fever with cold symptoms is almost certainly viral. A fever with a productive cough and breathlessness raises concern for pneumonia. A fever with urinary symptoms suggests UTI. Fever with rash, neck stiffness, or confusion requires urgent assessment. The height of the fever is less important than the overall clinical picture - a person with 38°C who looks unwell concerns me more than someone with 39°C who is drinking fluids and alert. In adults, fever rarely causes brain damage (that concern applies to very young children with febrile convulsions).",
    certGuidance: "A fever above 38°C typically warrants staying home - both for your recovery and to avoid spreading infection to colleagues. Most febrile illnesses resolve in 2-5 days. You should be fever-free for 24 hours without medication before returning to work.",
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
    doctorPerspective: "Dizziness is a vague term that can mean different things to different people, so the first thing I clarify is what they actually feel. True vertigo (the room is spinning) suggests an inner ear or vestibular problem. Lightheadedness (feeling faint) suggests blood pressure, dehydration, or cardiac causes. Unsteadiness (feeling off-balance) may be neurological or musculoskeletal. BPPV is the most common vestibular cause and is highly treatable with the Epley manoeuvre. The key safety question is whether dizziness makes driving unsafe - if so, a medical certificate is not just appropriate, it is a duty-of-care issue.",
    certGuidance: "If dizziness makes driving or operating machinery unsafe, you must not work in those roles until the symptom resolves. A medical certificate is appropriate and important for safety. Most vestibular dizziness resolves within 1-2 weeks.",
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
      { q: "What helps nausea?", a: "Small sips of water, bland foods, ginger, and avoiding triggers. Some medications can help - a doctor can advise." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Nausea is a symptom, not a diagnosis, and it has dozens of possible causes. The clinical approach starts with context: sudden onset with vomiting and diarrhoea points to gastro or food poisoning. Nausea with a missed period - pregnancy test first. Nausea after starting a new medication - likely a side effect. Nausea worse after meals - consider reflux or gallbladder issues. Morning nausea with headache - check blood pressure and consider raised intracranial pressure if persistent. Isolated nausea with anxiety is also extremely common. The key red flags are nausea with severe abdominal pain, vomiting blood, black stools, or inability to keep any fluids down for 12 hours - these need urgent assessment.",
    certGuidance: "Persistent nausea that prevents eating, concentrating, or travelling safely to work is a valid reason for a certificate. Most nausea from viral causes resolves in 1-2 days.",
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
    selfCareAdvice: ["Track food intake accurately - many people underestimate consumption by 40-50%", "Maintain regular physical activity", "Check medication side effects with your doctor", "Get adequate sleep - poor sleep disrupts hunger hormones", "Manage stress - cortisol promotes fat storage"],
    whenToSeeDoctor: ["Unexplained weight gain of 5kg+ over a few months", "Weight gain with other symptoms (fatigue, hair loss, menstrual changes)", "Rapid weight gain over days (possible fluid retention)", "Difficulty losing weight despite genuine effort"],
    emergencySigns: ["Rapid weight gain with severe breathlessness (possible heart failure)", "Sudden leg swelling with chest pain (possible blood clot)", "Rapid weight gain with facial swelling (possible kidney problems)"],
    relatedSymptoms: ["fatigue", "bloating"],
    faqs: [
      { q: "What medical conditions cause weight gain?", a: "The most common are hypothyroidism, PCOS, medication side effects, insulin resistance, Cushing's syndrome, and fluid retention from heart, liver, or kidney conditions. Blood tests can screen for most of these." },
      { q: "Which medications cause weight gain?", a: "Common culprits include some antidepressants (mirtazapine, amitriptyline), antipsychotics, corticosteroids, insulin, sulfonylureas, beta-blockers, and some contraceptives." },
      { q: "Should I get blood tests?", a: "Yes, if weight gain is genuinely unexplained. A basic panel should include thyroid function (TSH), fasting glucose and HbA1c, cortisol, and a full blood count. PCOS testing may be appropriate for women." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "When a patient tells me they are gaining weight without eating more, I take it seriously - but I also investigate honestly. Research shows that most people significantly underestimate their caloric intake (by 40-50% on average). That said, genuine unexplained weight gain does occur and has identifiable medical causes. The most common is hypothyroidism, followed by medication side effects (which are vastly underappreciated - many commonly prescribed medications cause 5-10kg of weight gain). PCOS in women is another major cause. The investigation is straightforward: thyroid function, fasting glucose, and in some cases hormone panels. Via telehealth, I can order the appropriate blood tests, review medications for weight-gaining culprits, and provide evidence-based guidance.",
    certGuidance: "Unexplained weight gain itself rarely requires a certificate, but the underlying cause (hypothyroidism, depression) or associated symptoms (severe fatigue, mobility limitation) may.",
  },
}
