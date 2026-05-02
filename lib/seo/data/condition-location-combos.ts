/**
 * Condition + location combo pages
 * Unique local angles only - avoid thin content.
 * Used by app/conditions/[slug]/[city]/page.tsx
 */


export interface ConditionLocationCombo {
  conditionSlug: string
  citySlug: string
  /** Unique local intro - 80-150 words */
  localIntro: string
  /** 2-3 local FAQs */
  localFaqs: Array<{ q: string; a: string }>
}

/** Valid combos with genuinely unique local angles */
export const CONDITION_LOCATION_COMBOS: ConditionLocationCombo[] = [
  {
    conditionSlug: "cold-and-flu",
    citySlug: "sydney",
    localIntro:
      "Flu season in Sydney typically peaks between May and August. Cold, damp weather and crowded public transport make it easy to pick up viruses. If you're in the Eastern Suburbs, Inner West, or Western Sydney and need a medical certificate without braving a packed waiting room, InstantMed connects you with an Australian doctor from home. Doctor-reviewed request, certificate to your inbox when approved - no trip to a CBD clinic required.",
    localFaqs: [
      {
        q: "When is flu season in Sydney?",
        a: "Flu season in NSW typically runs from May to September, with peak activity around June–July. If you're unwell during this period and need a medical certificate, InstantMed can help without a clinic visit.",
      },
      {
        q: "Can I get a medical certificate in Sydney without leaving home?",
        a: "Yes. InstantMed serves all of Greater Sydney. Complete a quick form, get reviewed by an AHPRA-registered doctor, and receive your certificate via email if approved.",
      },
    ],
  },
  {
    conditionSlug: "cold-and-flu",
    citySlug: "melbourne",
    localIntro:
      "Melbourne's winter brings cold snaps and flu season - usually May to October. Indoor heating and crowded trams create ideal conditions for viruses to spread. If you're in Brunswick, Fitzroy, or the outer suburbs and need a medical certificate without braving the weather or a long clinic wait, InstantMed offers doctor review from home. Certificate to your inbox, no tram ride required.",
    localFaqs: [
      {
        q: "When does flu season hit Melbourne?",
        a: "Victoria's flu season typically runs May to October, with peak activity in July–August. If you're unwell and need a medical certificate, InstantMed can assess you from home.",
      },
      {
        q: "Are InstantMed certificates suitable for Melbourne workplace evidence?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and include standard workplace evidence details for those in Victoria.",
      },
    ],
  },
  {
    conditionSlug: "cold-and-flu",
    citySlug: "brisbane",
    localIntro:
      "Brisbane's flu season runs later than southern states - typically June to September. Air-conditioned offices and public transport help viruses spread. If you're in the CBD, Logan, or the bayside and need a medical certificate without the wait at a bulk-billing clinic, InstantMed offers doctor review. Certificate to your inbox, no drive across town.",
    localFaqs: [
      {
        q: "When is flu season in Brisbane?",
        a: "Queensland's flu season typically runs June to September, peaking in August. If you're unwell and need a medical certificate, InstantMed can help from home.",
      },
      {
        q: "Can I get a medical certificate in Brisbane without a clinic visit?",
        a: "Yes. InstantMed serves Greater Brisbane. Complete the form, get reviewed by an AHPRA-registered doctor, and receive your certificate via email if approved.",
      },
    ],
  },
  {
    conditionSlug: "hay-fever",
    citySlug: "melbourne",
    localIntro:
      "Melbourne is often called Australia's allergy capital. Grass pollen peaks in spring (October–December), and the city's parks and gardens can make symptoms severe. If hay fever is affecting your work or study and you need a medical certificate or treatment advice, InstantMed can help from home. No need to sit in a clinic with watery eyes and a runny nose.",
    localFaqs: [
      {
        q: "When is hay fever worst in Melbourne?",
        a: "Grass pollen typically peaks October–December in Melbourne. Thunderstorm asthma can also occur in spring. If symptoms are affecting your work, InstantMed can assess and provide certificates or treatment advice.",
      },
      {
        q: "Can I get hay fever treatment online in Melbourne?",
        a: "Yes. Our doctors can recommend or prescribe antihistamines and nasal sprays. If you need a medical certificate for severe symptoms affecting work, we can provide that too.",
      },
    ],
  },
  {
    conditionSlug: "gastro",
    citySlug: "sydney",
    localIntro:
      "Sydney's hot summers and outdoor dining increase the risk of food poisoning. If you've been hit with gastro and need a medical certificate without leaving the bathroom, InstantMed can help. Doctor review from home - no trip to a clinic when you're already unwell. Certificate to your inbox when approved, employer policies may vary.",
    localFaqs: [
      {
        q: "Can I get a gastro certificate in Sydney without going to a clinic?",
        a: "Yes. InstantMed assesses gastro cases online. Describe your symptoms, get reviewed by an AHPRA-registered doctor, and receive your certificate via email - no clinic visit required.",
      },
      {
        q: "When can I return to work after gastro in Sydney?",
        a: "Usually after 24 hours with no vomiting or diarrhoea. Some workplaces (food, healthcare) have stricter rules. Our doctor can advise on your specific situation.",
      },
    ],
  },
  {
    conditionSlug: "gastro",
    citySlug: "gold-coast",
    localIntro:
      "The Gold Coast's tourism and outdoor lifestyle mean gastro can strike when you least expect it. If you're a local or visitor and need a medical certificate without hunting for a bulk-billing clinic, InstantMed offers doctor review from anywhere - Broadbeach, Burleigh, or the hinterland. Certificate to your inbox, no drive required.",
    localFaqs: [
      {
        q: "Can tourists get a medical certificate on the Gold Coast?",
        a: "Yes. InstantMed is available to anyone in Australia. If you're visiting and need a certificate for work back home, we can help. You'll need to be 18+ and in Australia.",
      },
      {
        q: "How quickly can I get a gastro certificate on the Gold Coast?",
        a: "Most requests are reviewed when a doctor is available. Certificate delivered via email - no clinic visit needed.",
      },
    ],
  },
  {
    conditionSlug: "migraine",
    citySlug: "sydney",
    localIntro:
      "Sydney's busy CBD, long commutes, and screen-heavy work can trigger migraines. If a migraine has you unable to work and you need a medical certificate without a trip to a clinic, InstantMed can help. Describe your symptoms, get assessed by an Australian doctor, and receive your certificate via email - from your dark, quiet room.",
    localFaqs: [
      {
        q: "Can I get a migraine certificate in Sydney without leaving home?",
        a: "Yes. InstantMed assesses migraine cases online. When you're too unwell to travel, we can issue a certificate based on your description - no clinic visit required.",
      },
      {
        q: "Will Sydney employers accept an online migraine certificate?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and include standard workplace evidence details for NSW government and corporate.",
      },
    ],
  },
  {
    conditionSlug: "migraine",
    citySlug: "melbourne",
    localIntro:
      "Melbourne's variable weather, fluorescent office lighting, and stress can trigger migraines. If you're unable to work and need a medical certificate without braving the tram or a bright waiting room, InstantMed offers doctor review from home. Certificate to your inbox - no travel required when you're at your worst.",
    localFaqs: [
      {
        q: "Can I get a migraine certificate in Melbourne without a clinic visit?",
        a: "Yes. InstantMed assesses migraine cases online. Describe your symptoms, get reviewed by an AHPRA-registered doctor, and receive your certificate via email.",
      },
      {
        q: "Do Melbourne employers assess telehealth certificates under their own policies?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements. They're employer policies may vary.",
      },
    ],
  },
  {
    conditionSlug: "back-pain",
    citySlug: "melbourne",
    localIntro:
      "Melbourne's desk-heavy workforce and long commutes contribute to back pain. If you're in the CBD, inner suburbs, or outer growth corridors and need a medical certificate without sitting in a clinic waiting room, InstantMed can help. Doctor review from home - certificate to your inbox when approved, no drive or tram ride required.",
    localFaqs: [
      {
        q: "Can I get a back pain certificate in Melbourne online?",
        a: "Yes. InstantMed assesses mechanical back pain cases online. Describe your symptoms and limitations, get reviewed by a doctor, and receive your certificate via email.",
      },
      {
        q: "When should I see a physio instead?",
        a: "A GP or InstantMed can rule out serious causes and issue a certificate. For ongoing treatment and exercises, a physiotherapist is often the next step. We can advise based on your situation.",
      },
    ],
  },
  {
    conditionSlug: "anxiety",
    citySlug: "sydney",
    localIntro:
      "Sydney's pace, commute pressures, and competitive work culture can exacerbate anxiety. If you're having an overwhelming day and need a medical certificate without explaining yourself in a crowded clinic, InstantMed offers confidential assessment from home. Describe your situation, get reviewed by a doctor, and receive your certificate via email - discreet and confidential.",
    localFaqs: [
      {
        q: "Can I get an anxiety certificate in Sydney confidentially?",
        a: "Yes. InstantMed assessments start with a secure online form. A doctor contacts you only if more information is clinically needed, and your information is confidential and encrypted.",
      },
      {
        q: "Will Sydney employers accept a stress leave certificate?",
        a: "Yes. Our certificates document that you're unfit for work. They're issued by AHPRA-registered doctors and employer policies may vary. Mental health is a legitimate reason for leave.",
      },
    ],
  },
]

/** Get combo by condition + city slugs */
export function getConditionLocationCombo(
  conditionSlug: string,
  citySlug: string
): ConditionLocationCombo | undefined {
  return CONDITION_LOCATION_COMBOS.find(
    (c) => c.conditionSlug === conditionSlug && c.citySlug === citySlug
  )
}

/** Get all valid city slugs for a condition */
export function getCitiesForCondition(conditionSlug: string): string[] {
  return CONDITION_LOCATION_COMBOS.filter((c) => c.conditionSlug === conditionSlug).map(
    (c) => c.citySlug
  )
}

/** Get all valid condition slugs for a city */
export function getConditionsForCity(citySlug: string): string[] {
  return CONDITION_LOCATION_COMBOS.filter((c) => c.citySlug === citySlug).map(
    (c) => c.conditionSlug
  )
}

/** Get all combo slugs for static params and sitemap */
export function getAllConditionLocationComboSlugs(): Array<{ slug: string; city: string }> {
  return CONDITION_LOCATION_COMBOS.map((c) => ({ slug: c.conditionSlug, city: c.citySlug }))
}
