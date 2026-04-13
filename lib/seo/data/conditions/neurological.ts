/**
 * Neurological conditions -- SEO landing page data
 * Part of the conditions data split. See ./index.ts for the combined export.
 */

import type { ConditionData } from "../conditions"

export const neurologicalConditions: Record<string, ConditionData> = {
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
    doctorPerspective: "Migraines are a neurological condition, not just a bad headache, and this distinction matters for both treatment and workplace legitimacy. A true migraine involves changes in brain chemistry and blood flow that can produce visual disturbances (aura), nausea, and extreme sensitivity to light and sound - making work genuinely impossible for many people during an attack. When I assess someone for a migraine-related certificate, I am looking at the pattern: how frequent, how severe, whether their current management is adequate. If someone is having more than 4 migraine days per month, they should be discussing preventive treatment with their regular GP. Telehealth is well-suited for migraine management discussions because the diagnosis is primarily history-based - we do not need to examine you during an attack. Triptans (prescription migraine-specific medications) can be life-changing for people who have been relying on paracetamol and ibuprofen alone.",
    auStats: [
      "Migraines affect approximately 4.9 million Australians - about 20% of the population",
      "Women are 3 times more likely to experience migraines than men",
      "Migraines cost the Australian economy an estimated $35.7 billion annually in lost productivity",
      "The average migraine sufferer loses 4-6 workdays per year due to attacks",
    ],
    recoveryTimeline: {
      typical: "An individual migraine attack typically lasts 4-72 hours. Most people feel significantly better within 24 hours with appropriate treatment. A 'postdrome' (migraine hangover) of fatigue and difficulty concentrating can last another 1-2 days.",
      returnToWork: "Most people can return to work the day after a migraine resolves, though some experience lingering fatigue. If your work involves screens, bright lights, or noisy environments, you may need a quieter transition day. Chronic migraine sufferers may benefit from workplace adjustments like screen filters and flexible scheduling.",
      whenToReassess: "Seek urgent care for a sudden, severe headache unlike any you have experienced before ('thunderclap headache'), a headache with fever and stiff neck, or any headache following head trauma. See your regular GP if migraines are becoming more frequent, lasting longer, or not responding to your usual treatment.",
    },
    selfCareTips: [
      "At the first sign of a migraine, take medication immediately - early treatment is more effective",
      "Rest in a cool, dark, quiet room during an attack",
      "Apply a cold compress to the forehead or back of the neck",
      "Stay hydrated - dehydration is a common trigger and worsens symptoms",
      "Keep a migraine diary to identify your personal triggers (food, sleep, stress, weather, hormones)",
      "Maintain regular sleep and meal schedules - skipping meals and irregular sleep are major triggers",
    ],
    treatmentInfo: {
      overview: "Migraine treatment is divided into acute therapy (stopping an attack) and preventive therapy (reducing frequency). Early treatment at the first sign of a migraine is critical -- delayed dosing is significantly less effective. For frequent migraines (4+ days per month), preventive medication should be considered.",
      medications: [
        {
          genericName: "Sumatriptan",
          brandNames: ["Imigran", "Suvalan"],
          drugClass: "Triptan (5-HT1B/1D agonist)",
          typicalDose: "50-100mg orally at onset, may repeat after 2 hours (max 300mg/24h)",
          pbsListed: true,
          pbsNote: "PBS listed for acute migraine treatment",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "Gold standard acute migraine treatment",
            "Take at the first sign of headache phase (not during aura)",
            "Available as tablet, nasal spray, or injection",
            "Contraindicated in uncontrolled hypertension and cardiovascular disease",
          ],
        },
        {
          genericName: "Rizatriptan",
          brandNames: ["Maxalt"],
          drugClass: "Triptan (5-HT1B/1D agonist)",
          typicalDose: "10mg orally at onset, may repeat after 2 hours (max 20mg/24h)",
          pbsListed: true,
          pbsNote: "PBS listed for acute migraine",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "Fastest-acting oral triptan (onset within 30 minutes)",
            "Available as wafer that dissolves on the tongue (good if nauseated)",
            "Dose reduction needed if taking propranolol",
            "Similar contraindications to sumatriptan",
          ],
        },
        {
          genericName: "Propranolol",
          brandNames: ["Inderal", "Deralin"],
          drugClass: "Beta-blocker (migraine preventive)",
          typicalDose: "40-160mg daily in divided doses",
          pbsListed: true,
          pbsNote: "PBS listed for migraine prophylaxis",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "First-line preventive medication for frequent migraines",
            "Takes 4-6 weeks to see full benefit",
            "Also helps with anxiety symptoms that often co-occur with migraine",
            "Not suitable for asthma patients",
          ],
        },
      ],
      guidelineSource: "Therapeutic Guidelines - Neurology, 2024",
      whenToSeeSpecialist: "Referral to a neurologist is recommended if migraines do not respond to two or more preventive medications, if you experience atypical aura symptoms, if migraine frequency is increasing despite treatment, or if you have chronic daily headache.",
    },
    reviewedDate: "2026-03",
  },
}
