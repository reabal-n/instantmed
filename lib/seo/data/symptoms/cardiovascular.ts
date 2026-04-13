/**
 * Cardiovascular symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const cardiovascularSymptoms: Record<string, SymptomData> = {
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
      "DO NOT self-treat if you think it might be cardiac - call 000",
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
      { q: "Can anxiety cause chest pain?", a: "Yes - anxiety and panic attacks commonly cause chest pain. It's usually sharp, stabbing, comes and goes quickly. However, if you're not sure, get it checked." },
      { q: "What about heartburn vs heart attack?", a: "Heartburn causes burning pain, gets worse lying down or after eating, and responds to antacids. Heart attack pain is more pressure-like. If unsure, seek emergency care." },
      { q: "When can I see a GP instead of emergency?", a: "See a GP for mild pain that comes and goes, pain that's clearly muscular (tender to touch), or recurring reflux symptoms. Always err on the side of caution." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get follow-up care",
      href: "/request?service=consult"
    },
    doctorPerspective: "Chest pain always warrants careful assessment, but it is important to know that the majority of chest pain in young, otherwise healthy adults is NOT cardiac. Musculoskeletal chest pain (from strained muscles, costochondritis, or poor posture), acid reflux, and anxiety-related chest tightness are far more common causes. However, I never dismiss chest pain without a proper assessment. The features that raise cardiac concern are: pain with exertion that resolves with rest, pain radiating to the jaw or left arm, pain with breathlessness and sweating, a family history of early heart disease, and age over 40 with risk factors. If you are experiencing any of these features, call 000 immediately - do not wait for a telehealth appointment. For non-urgent, recurrent chest discomfort without alarm features, telehealth can help identify the likely cause and guide next steps.",
    certGuidance: "Any chest pain that required emergency assessment legitimately warrants time off for recovery and follow-up. For musculoskeletal or reflux-related chest pain, a certificate is appropriate if symptoms are affecting your ability to work comfortably.",
  },
  "heart-palpitations": {
    name: "Heart Palpitations",
    slug: "heart-palpitations",
    description: "An awareness of your heartbeat - racing, pounding, fluttering, or skipping beats. Usually benign but can be frightening.",
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
      { q: "Are heart palpitations dangerous?", a: "Most palpitations are harmless - caused by caffeine, stress, or exercise. However, palpitations with chest pain, fainting, or severe breathlessness need urgent assessment to rule out arrhythmias." },
      { q: "Should I see a cardiologist?", a: "Not usually as a first step. Your GP can arrange an ECG and blood tests. Specialist referral is needed if an arrhythmia is detected or palpitations are frequent and unexplained." },
      { q: "Can anxiety cause heart palpitations?", a: "Yes - anxiety is one of the most common causes. Adrenaline from the fight-or-flight response directly increases heart rate and force of contraction." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Heart palpitations are one of the most anxiety-provoking symptoms patients experience, but the vast majority are benign. When I assess palpitations, I first determine the pattern: are they regular or irregular? Brief or sustained? Associated with exertion or at rest? Palpitations during stress, after caffeine, or during exercise are almost always normal physiological responses. The features that raise concern are palpitations at rest that are irregular, sustained (more than 15 minutes), associated with dizziness or fainting, or occurring with chest pain. These may indicate an arrhythmia requiring investigation with an ECG or Holter monitor. Importantly, many patients with benign palpitations enter a cycle where anxiety about the palpitations causes more adrenaline, which causes more palpitations - breaking this cycle with reassurance and breathing techniques is often the most effective treatment.",
    certGuidance: "Palpitations alone rarely prevent work unless they cause significant dizziness or anxiety. If palpitations required emergency assessment or investigation, time off for recovery and follow-up is appropriate.",
  },
}
