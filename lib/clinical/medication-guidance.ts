/**
 * Medication usage-guidance registry.
 *
 * Salvaged from the retired specialty `*-approved` email templates (deleted in
 * the 2026-07-06 email Wave 2 cleanup — the live prescription notification is
 * `script-sent`, which is deliberately drug-name-free). This preserves the
 * clinician-reviewed usage/safety copy as structured data so `script-sent` (or
 * an in-app medication page) can surface it later without re-authoring it.
 *
 * Not yet wired to a send path — reference data only. Keying is by generic
 * ingredient; brand names map to the same entry.
 */

export interface MedicationGuidance {
  /** Canonical generic name, lowercase. */
  ingredient: string
  /** Brand/alias substrings (lowercase) that resolve to this entry. */
  aliases: string[]
  /** Section heading, e.g. "How to take Finasteride". */
  heading: string
  /** Usage/safety bullet points. */
  items: string[]
}

export const MEDICATION_GUIDANCE: readonly MedicationGuidance[] = [
  {
    ingredient: "finasteride",
    aliases: ["propecia"],
    heading: "How to take finasteride",
    items: [
      "Take 1mg once daily, with or without food",
      "Take it at the same time each day for best results",
      "It typically takes 3–6 months before you notice visible improvement",
      "Continued use is required to maintain results. Hair loss may resume if you stop",
      "Some men experience decreased libido or sexual side effects. Discuss with your doctor if this occurs",
    ],
  },
  {
    ingredient: "minoxidil",
    aliases: ["rogaine"],
    heading: "How to use minoxidil",
    items: [
      "Apply to the affected area of the scalp twice daily (morning and evening)",
      "Make sure the scalp is dry before applying",
      "Use the dropper or foam applicator to spread evenly",
      "Initial shedding at 2–4 weeks is normal. This is a sign the treatment is working",
      "Visible results typically appear at 4–6 months of consistent use",
      "Wash your hands thoroughly after applying",
    ],
  },
  {
    ingredient: "sildenafil",
    aliases: ["viagra"],
    heading: "How to take sildenafil",
    items: [
      "Take 30–60 minutes before sexual activity",
      "Effects typically last 4–6 hours",
      "Do not take more than one dose (100mg max) in 24 hours",
      "Works best on an empty stomach. A heavy meal may delay the effect",
      "Do NOT take with nitrate medications (e.g. GTN spray). This can cause a dangerous drop in blood pressure",
    ],
  },
  {
    ingredient: "tadalafil",
    aliases: ["cialis"],
    heading: "How to take tadalafil",
    items: [
      "Take at least 30 minutes before sexual activity",
      "Effects can last up to 36 hours",
      "Can be taken with or without food",
      "Do NOT take with nitrate medications (e.g. GTN spray). This can cause a dangerous drop in blood pressure",
    ],
  },
]

/**
 * Shared ED safety block (applies to any PDE5 inhibitor, not one ingredient).
 */
export const ED_SAFETY_GUIDANCE = {
  heading: "Important safety information",
  items: [
    "Common side effects: headache, flushing, nasal congestion, indigestion. These usually pass quickly",
    "Avoid excessive alcohol. It can reduce effectiveness and increase side effects",
    "Do NOT combine with nitrate medications or recreational drugs containing nitrates (e.g. poppers)",
    "Seek urgent medical attention for chest pain, an erection lasting more than 4 hours, or sudden vision/hearing changes",
  ],
} as const

/**
 * UTI antibiotic-course guidance (women's health pathway).
 */
export const UTI_COURSE_GUIDANCE = {
  heading: "Taking your antibiotic course",
  items: [
    "Complete the full course of antibiotics as prescribed, even if symptoms improve early",
    "Drink plenty of water to help flush out the infection",
    "Symptoms should begin to improve within 1–2 days",
    "If symptoms worsen or haven't improved after 48 hours, contact your doctor",
    "Return for review if you experience fever, back pain, or blood in your urine",
  ],
} as const

/**
 * Oral-contraceptive starting guidance (women's health pathway).
 */
export const CONTRACEPTION_START_GUIDANCE = {
  heading: "Starting your contraception",
  items: [
    "You can start on Day 1 of your period for immediate protection, or at any time (use backup contraception for the first 7 days)",
    "Take one pill at the same time each day",
    "If you miss a pill, take it as soon as you remember. Refer to the patient information leaflet for specific advice",
    "Common side effects in the first 1–3 months: nausea, spotting, breast tenderness. These usually settle",
    "Contact your doctor if you experience persistent headaches, leg pain/swelling, or chest pain",
  ],
} as const

/** Resolve guidance for a free-text medication name (generic or brand). */
export function guidanceForMedication(name: string): MedicationGuidance | null {
  const lower = name.toLowerCase()
  return (
    MEDICATION_GUIDANCE.find(
      (g) => lower.includes(g.ingredient) || g.aliases.some((a) => lower.includes(a)),
    ) ?? null
  )
}
