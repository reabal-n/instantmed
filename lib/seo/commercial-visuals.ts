export type CommercialSeoVisualId =
  | "same-day-certificate-review"
  | "work-certificate-evidence"
  | "repeat-prescription-review-pathway"
  | "after-hours-repeat-request-pathway"
  | "telehealth-certificate-comparison"

export type CommercialSeoVisualTone = "neutral" | "safe" | "caution" | "urgent"

export interface CommercialSeoVisualItem {
  label: string
  detail: string
  tone?: CommercialSeoVisualTone
}

export interface CommercialSeoVisualSpec {
  id: CommercialSeoVisualId
  assetPath: `/images/seo/${string}.webp`
  eyebrow: string
  title: string
  summary: string
  prompt: string
  items: CommercialSeoVisualItem[]
  tags: string[]
}

export const commercialSeoVisuals: Record<CommercialSeoVisualId, CommercialSeoVisualSpec> = {
  "same-day-certificate-review": {
    id: "same-day-certificate-review",
    assetPath: "/images/seo/same-day-certificate-review.webp",
    eyebrow: "Certificate pathway",
    title: "Same-day certificate pathway",
    summary: "Details first, clinical review second, document only if appropriate.",
    prompt:
      "Create a premium educational underlay for an online same-day medical certificate pathway in Australia. Show an abstract secure form, short absence calendar, doctor-review checkpoint, privacy-safe document outline, and final secure PDF delivery as a calm process map. The document must be abstract with redacted bands only, not a usable certificate.",
    tags: ["medical-certificate", "same-day", "doctor-review"],
    items: [
      { label: "Symptoms and dates", detail: "Patient explains the short absence context.", tone: "neutral" },
      { label: "Scope check", detail: "Red flags and high-stakes uses are separated.", tone: "caution" },
      { label: "Doctor review", detail: "AHPRA-registered doctor assesses suitability.", tone: "safe" },
      { label: "Secure PDF", detail: "Issued only when clinically appropriate.", tone: "safe" },
    ],
  },
  "work-certificate-evidence": {
    id: "work-certificate-evidence",
    assetPath: "/images/seo/work-certificate-evidence.webp",
    eyebrow: "Work evidence",
    title: "Work certificate evidence map",
    summary: "Absence dates, practitioner details, verification, and privacy boundaries.",
    prompt:
      "Create a polished Australian workplace medical certificate evidence underlay. Show a privacy-safe abstract certificate anatomy, absence-date calendar, employer evidence folder, verification node, and diagnosis privacy boundary. The certificate must not contain readable certificate wording, names, signatures, QR codes, logos, or official seals.",
    tags: ["medical-certificate", "work", "evidence"],
    items: [
      { label: "Absence period", detail: "The relevant dates are clear.", tone: "neutral" },
      { label: "Doctor details", detail: "Practitioner and clinic details support verification.", tone: "safe" },
      { label: "No diagnosis needed", detail: "Clinical details stay private.", tone: "safe" },
      { label: "Employer policy varies", detail: "Workplace rules still apply.", tone: "caution" },
    ],
  },
  "repeat-prescription-review-pathway": {
    id: "repeat-prescription-review-pathway",
    assetPath: "/images/seo/repeat-prescription-review-pathway.webp",
    eyebrow: "Repeat prescription",
    title: "Repeat prescription review map",
    summary: "Current use, safety checks, doctor judgement, and eScript only if suitable.",
    prompt:
      "Create a service-level repeat prescription review underlay for an Australian telehealth website. Show an existing regular medicine as abstract label-free medication record cards, safety check nodes, current dose history, doctor review checkpoint, and electronic prescription token delivery. Do not show medicine names, pill branding, pharmacy logos, prescription prices, or a fake prescription.",
    tags: ["repeat-prescription", "service-level", "escript"],
    items: [
      { label: "Existing medicine", detail: "Current use is entered privately.", tone: "neutral" },
      { label: "Safety checks", detail: "Dose, side effects, interactions, and red flags.", tone: "caution" },
      { label: "Doctor decision", detail: "Approval is never automatic.", tone: "safe" },
      { label: "eScript if suitable", detail: "Token sent only after approval.", tone: "safe" },
    ],
  },
  "after-hours-repeat-request-pathway": {
    id: "after-hours-repeat-request-pathway",
    assetPath: "/images/seo/after-hours-repeat-request-pathway.webp",
    eyebrow: "After-hours repeat",
    title: "After-hours repeat request",
    summary: "Submit online, triage risk, review timing, and escalate when waiting is unsafe.",
    prompt:
      "Create an after-hours repeat prescription underlay for Australian patients. Show a night-mode calendar, secure online submission, triage fork, doctor review window, pharmacy-ready eScript token if approved, and an urgent-care escalation branch. Keep it calm and service-level. Do not show drug names, medicine packaging, prescriptions, pharmacy logos, emergency drama, pricing, plus signs, pharmacy crosses, hospital crosses, or red-cross-like marks.",
    tags: ["repeat-prescription", "after-hours", "triage"],
    items: [
      { label: "Submit any time", detail: "The request can be lodged after hours.", tone: "neutral" },
      { label: "Triage risk", detail: "Dangerous missed-dose risk needs urgent care.", tone: "urgent" },
      { label: "Doctor review", detail: "Review follows availability and safety needs.", tone: "caution" },
      { label: "Next step", detail: "eScript, clarification, decline, or local care.", tone: "safe" },
    ],
  },
  "telehealth-certificate-comparison": {
    id: "telehealth-certificate-comparison",
    assetPath: "/images/seo/telehealth-certificate-comparison.webp",
    eyebrow: "Choose the right path",
    title: "Telehealth, GP, or urgent care",
    summary: "A comparison map that makes the safer path visible before a request starts.",
    prompt:
      "Create a premium educational comparison underlay for Australian online medical certificates. Show three clear lanes: telehealth certificate request for simple short absence, GP visit for examination or ongoing care, and urgent care for severe symptoms. Use abstract patient-safety cues, calendar and document shapes, shield markers, route lines, and calm healthcare colours. Do not show doctor faces, fake chat UI, ambulance drama, government logos, pricing, call-to-action buttons, plus signs, pharmacy crosses, hospital crosses, or red-cross-like marks.",
    tags: ["comparison", "telehealth", "medical-certificate"],
    items: [
      { label: "Telehealth", detail: "Simple short absence, no exam needed.", tone: "safe" },
      { label: "GP visit", detail: "Complex symptoms or ongoing care.", tone: "neutral" },
      { label: "Urgent care", detail: "Severe or rapidly worsening symptoms.", tone: "urgent" },
      { label: "Clinical boundary", detail: "Online care redirects when unsuitable.", tone: "caution" },
    ],
  },
}

export const commercialSeoVisualList = Object.values(commercialSeoVisuals)

export function getCommercialSeoVisual(id: CommercialSeoVisualId) {
  return commercialSeoVisuals[id]
}
