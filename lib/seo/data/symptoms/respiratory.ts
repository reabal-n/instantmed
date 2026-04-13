/**
 * Respiratory symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const respiratorySymptoms: Record<string, SymptomData> = {
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
    doctorPerspective: "When assessing a sore throat, the first question I ask myself is whether this is likely viral or bacterial - because the treatment is completely different. The majority of sore throats (around 70-80%) are viral and will resolve on their own. I use the modified Centor criteria to estimate the probability of strep throat: sudden onset, high fever, tonsillar exudate, swollen anterior cervical lymph nodes, and absence of cough each score a point. A score of 3 or more raises the probability enough to consider antibiotics. What I am most alert to is peritonsillar abscess (quinsy) - a unilateral swelling that causes difficulty opening the mouth, a muffled voice, and drooling. This requires urgent drainage. For most sore throats, effective pain management with paracetamol, ibuprofen, and salt water gargles is genuinely all that is needed.",
    certGuidance: "A sore throat severe enough to prevent speaking normally, swallowing, or concentrating warrants a medical certificate. Most people need 2-3 days. If you work in a customer-facing or phone-based role, voice rest may require slightly longer.",
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
    doctorPerspective: "A cough is the body's protective reflex - it clears the airways of mucus, irritants, and microbes. The clinical approach to cough depends entirely on duration. Acute cough (under 3 weeks) is almost always post-viral and requires no treatment beyond symptomatic relief - it resolves on its own. A cough that persists for 3-8 weeks after a respiratory infection is called a 'post-infectious cough' and is very common - the airways remain irritated and hyperreactive even though the infection has cleared. Chronic cough (over 8 weeks) warrants investigation: the three most common causes are asthma, postnasal drip (upper airway cough syndrome), and gastric reflux - often in combination. The most important red flag is coughing up blood (haemoptysis), which always needs investigation, as does a new persistent cough in a smoker or ex-smoker.",
    certGuidance: "A cough that disrupts sleep, causes vomiting, or makes it difficult to speak for sustained periods can warrant a certificate. Post-viral cough commonly persists for 2-3 weeks - this duration is normal and does not indicate something serious, but may still affect work capacity.",
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
    doctorPerspective: "A runny nose on its own is rarely serious and usually indicates a viral cold or allergic rhinitis. The clinical question is whether it is infectious (clear initially, then thickening over days, with other cold symptoms) or allergic (clear, watery, with sneezing and itchy eyes, often seasonal). Green or yellow mucus does NOT automatically mean bacterial infection - it simply means the immune system is active. Bacterial sinusitis is considered if nasal symptoms persist beyond 10 days without improvement or if there is a 'double worsening' pattern.",
    certGuidance: "A runny nose alone is unlikely to warrant a certificate unless combined with other symptoms (fever, body aches, fatigue) that prevent work. As part of a cold or flu, 2-3 days is typical.",
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
    doctorPerspective: "Shortness of breath is a symptom I take seriously because the range of causes spans from harmless (anxiety-related hyperventilation) to life-threatening (pulmonary embolism, heart failure). The key clinical question is: is this acute (sudden onset) or chronic (gradual)? Sudden breathlessness in an otherwise well person needs urgent assessment - especially with chest pain, leg swelling, or recent immobilisation. Gradual breathlessness that worsens over weeks often points to asthma, anaemia, deconditioning, or early heart failure. Anxiety is a very common cause but should only be attributed after other causes are excluded. If you are unsure, err on the side of seeking help - breathing difficulty is always taken seriously.",
    certGuidance: "Any significant breathlessness affecting your ability to walk, climb stairs, or perform normal tasks warrants time off. If breathlessness required emergency assessment, follow-up rest is appropriate. Always discuss return to work with your treating doctor.",
  },
  "chronic-cough": {
    name: "Chronic Cough",
    slug: "chronic-cough",
    description: "A cough lasting more than 8 weeks. The three most common causes in non-smokers are asthma, postnasal drip, and acid reflux - often in combination.",
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
      { q: "How long is too long for a cough?", a: "A cough lasting more than 8 weeks is considered chronic and warrants investigation. Post-infectious coughs can last 2-3 weeks after a cold - this duration is normal." },
      { q: "What tests might I need?", a: "Depending on the likely cause: spirometry (for asthma), chest X-ray (for smokers or if lung pathology suspected), trial of PPI medication (for reflux), or nasal endoscopy (for postnasal drip)." },
      { q: "Can I get a medical certificate for chronic cough?", a: "Yes. A persistent cough can disrupt sleep, cause voice strain, and make certain work environments difficult (quiet offices, phone-based work)." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Chronic cough is one of the most common reasons for GP referral, and the diagnosis often involves treating the three most common causes (asthma, postnasal drip, reflux) sequentially or simultaneously. The key in telehealth assessment is ruling out serious causes first: any smoker or ex-smoker with a new or changed cough needs a chest X-ray. Coughing blood (haemoptysis) always warrants investigation. Unexplained weight loss with cough raises concern for malignancy. Once these are excluded, the 'big three' account for over 90% of chronic cough cases. A structured trial of treatment - inhaler for possible asthma, nasal steroid for postnasal drip, PPI for reflux - often identifies the cause by which treatment works. ACE inhibitor cough is a commonly overlooked cause that resolves within 1-4 weeks of switching medication.",
    certGuidance: "Chronic cough can be disruptive at work - particularly in quiet environments. If cough is severe enough to cause vomiting, urinary incontinence, or significant sleep disruption, a certificate is appropriate.",
  }
}
