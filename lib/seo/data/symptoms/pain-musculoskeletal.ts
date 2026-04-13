/**
 * Pain and musculoskeletal symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const painSymptoms: Record<string, SymptomData> = {
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
    doctorPerspective: "Headaches are incredibly common and almost always benign, but the clinical skill lies in recognising the rare dangerous headache. The red flags I screen for are: sudden onset 'thunderclap' headache (reaching maximum intensity within seconds - possible subarachnoid haemorrhage), headache with fever and neck stiffness (possible meningitis), headache after head injury, new headache in someone over 50, headache with visual changes or neurological symptoms, and headache that wakes you from sleep. If none of these are present, the headache is almost certainly a tension headache or migraine. Tension headaches feel like a band squeezing around the head. Migraines are typically one-sided, throbbing, and accompanied by nausea or light sensitivity. For chronic headaches, medication overuse is a paradoxically common cause - regular use of painkillers more than 10-15 days per month can create a cycle of rebound headaches.",
    certGuidance: "Severe headaches - particularly migraines with nausea, visual disturbances, or light sensitivity - legitimately prevent work. Most people need 1-2 days. If headaches are causing frequent absences, discuss preventive treatment with your GP.",
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
    doctorPerspective: "Neck pain is extremely common and almost always musculoskeletal - caused by poor posture (particularly prolonged computer use), sleeping in an awkward position, or muscle strain. Like back pain, the evidence strongly supports staying gently active rather than immobilising the neck. The red flags I screen for are: neck pain with fever and headache (possible meningitis), pain after trauma (possible fracture), numbness or weakness in the arms or hands (possible nerve compression), and difficulty with balance or coordination (possible spinal cord involvement). In the absence of these, imaging is rarely needed - MRI findings of disc degeneration are so common in asymptomatic people that they often cause unnecessary alarm.",
    certGuidance: "Neck pain that prevents driving (inability to check blind spots safely) or computer work (inability to maintain a comfortable head position) warrants a certificate. Most acute neck pain improves within a week with self-management.",
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
    emergencySigns: ["Hot, red, swollen joint with fever (possible septic arthritis - emergency)", "Joint pain after significant trauma with deformity", "Unable to bear weight on the affected joint"],
    relatedSymptoms: ["back-pain", "neck-pain", "muscle-strain"],
    faqs: [
      { q: "Can I get a medical certificate for joint pain?", a: "Yes. Joint pain - particularly in weight-bearing joints or hands - can significantly affect your ability to work. A certificate is appropriate, especially for physical roles." },
      { q: "When does joint pain need investigation?", a: "See a doctor if pain persists beyond 2 weeks, if the joint is swollen/hot/red, if multiple joints are affected, or if you have morning stiffness lasting more than 30 minutes (possible inflammatory arthritis)." },
      { q: "Should I use heat or ice?", a: "Ice for acute pain and swelling (first 48 hours of a new injury). Heat for chronic stiffness and muscle tension. Many people benefit from alternating both." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Joint pain is one of the broadest symptom categories in medicine, and the approach depends on whether it is one joint or many, acute or chronic, and inflammatory or mechanical. A single hot, red, swollen joint with fever is septic arthritis until proven otherwise - this is a medical emergency requiring urgent in-person assessment and joint aspiration. In contrast, gradual knee stiffness in a 55-year-old is almost certainly osteoarthritis and can be managed with exercise and weight management. The key features I assess remotely are: which joints, how many, morning stiffness duration (more than 30 minutes suggests inflammatory arthritis), and associated symptoms (fever, rash, eye inflammation). This allows me to triage effectively between conditions that need urgent attention and those that can be managed conservatively.",
    certGuidance: "Joint pain affecting weight-bearing joints (knees, hips, ankles) or hands can prevent physical work and desk work respectively. Gout attacks are among the most painful conditions and typically warrant 3-5 days off.",
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
    doctorPerspective: "Generalised body aches most commonly accompany viral infections - influenza is the classic example, producing profound muscle pain alongside fever and fatigue. COVID-19 also frequently causes body aches. The mechanism is the immune system releasing cytokines that cause widespread inflammation. Body aches can also be caused by overexertion, dehydration, fibromyalgia, or autoimmune conditions. If body aches persist beyond 2 weeks without an obvious cause, blood tests may be warranted to check for underlying conditions.",
    certGuidance: "Body aches as part of flu or viral illness warrant 3-5 days off. The aches usually resolve as the infection clears. If body aches are so severe that you cannot perform physical tasks or concentrate, a certificate is appropriate.",
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
      { q: "Do I need antibiotics for an ear infection?", a: "Many ear infections are viral and resolve on their own. Antibiotics may be needed for bacterial infections - a doctor can assess." },
      { q: "Can I get a medical certificate for earache?", a: "Yes. Ear infections can be painful and affect concentration. Our doctors can provide a certificate." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Earache in adults most commonly comes from otitis externa (outer ear infection) or referred pain from the throat or jaw - not from middle ear infections, which are far more common in children. The key clinical distinction is whether the pain worsens when you tug on the earlobe (otitis externa - treated with ear drops) or is deep in the ear with hearing changes (otitis media - may need oral antibiotics). Eustachian tube dysfunction during or after a cold is another very common cause of ear discomfort and fullness. I always ask about hearing changes, discharge, and recent swimming or water exposure. The red flag is swelling or tenderness behind the ear (mastoiditis), which requires urgent in-person assessment.",
    certGuidance: "Ear infections can cause significant pain and reduced hearing that affects work performance. A certificate for 1-3 days is appropriate for acute ear infections, particularly if pain disrupts sleep.",
  },
}
