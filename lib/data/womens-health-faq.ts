import { PRICING_DISPLAY } from "@/lib/constants"
import { GUARANTEE } from "@/lib/marketing/voice"

const UTI_FAQ_ITEMS = [
  {
    question: "Can I get a UTI assessment online?",
    answer: "Yes. Fill out our structured health form covering your symptoms and health history, and an AHPRA-registered Australian doctor reviews your submission. No booked appointment or waiting room. The doctor may call you briefly if a safety detail needs clarification.",
  },
  {
    question: "How does the UTI assessment work?",
    answer: "You answer a short set of questions about urinary symptoms, pregnancy possibility, red flags, relevant history, allergies, and medicines. A doctor reviews your assessment and decides what is clinically appropriate. If approved, the outcome is sent digitally and can be actioned at an Australian pharmacy if a prescription is issued.",
  },
  {
    question: "When is an online UTI assessment not suitable?",
    answer: "Online assessment is not appropriate for everyone. A fever, pain in your back or side, blood in your urine, symptoms during pregnancy, or a UTI that keeps coming back are signs you should be seen in person. If your answers raise any of these, the doctor will recommend a face-to-face review and may decline online care.",
  },
  {
    question: "What symptoms usually fit a simple UTI pattern?",
    answer: "Burning or stinging when passing urine, needing to go more often, urgency, cloudy urine, or a feeling that your bladder has not emptied can fit a lower urinary infection pattern. The doctor still checks whether the overall story is safe for online care.",
  },
  {
    question: "What if I have fever, chills, vomiting, or back pain?",
    answer: "Do not wait for an online form. Those symptoms can suggest kidney infection or another condition that needs in-person assessment. Seek prompt in-person medical care, and call 000 for emergencies.",
  },
  {
    question: "Can I use this if I am pregnant or might be pregnant?",
    answer: "No. UTI symptoms during pregnancy or possible pregnancy need in-person assessment so the right tests, monitoring, and treatment choices can be made safely.",
  },
  {
    question: "Do I need a urine test?",
    answer: "Not every urinary symptom episode needs a urine test before a doctor can make a decision, but testing can be important when symptoms are recurrent, severe, atypical, pregnancy-related, not improving, or associated with blood in the urine.",
  },
  {
    question: "Can men or children use this UTI pathway?",
    answer: "This pathway is designed for adult women's-health UTI assessment. Men and children with urinary symptoms usually need a different assessment pathway because the causes and safety checks are different.",
  },
  {
    question: "What if my symptoms could be an STI or vaginal infection?",
    answer: "If you have vaginal discharge, genital sores, pelvic pain, STI exposure, sexual assault, or symptoms that do not fit a simple urinary infection, seek in-person sexual health or GP care rather than using this online UTI pathway.",
  },
  {
    question: "What happens if symptoms do not improve?",
    answer: "Seek medical review if symptoms worsen, do not improve as expected, return soon after treatment, or are associated with fever, back or side pain, vomiting, or visible blood. You may need testing or in-person review.",
  },
] as const

const PILL_FAQ_ITEMS = [
  {
    question: "Can I start or switch a contraceptive pill online?",
    answer: "You can request an assessment to start a new contraceptive pill or switch from your current one. The doctor reviews your health history and decides what is clinically appropriate after review. The specific option is determined by the doctor, not chosen from a menu.",
  },
  {
    question: "Is the contraceptive pill safety screen complicated?",
    answer: "No. The form asks routine questions about your health history, blood pressure where relevant, and anything that could affect suitability. This is a standard safety screen that a doctor would normally cover. The reviewing doctor performs the final check before deciding whether online care is appropriate.",
  },
  {
    question: "I already take the pill. Can I get a repeat?",
    answer: "If you are continuing a contraceptive you are already established on, that is handled as a repeat prescription. Start there if your medication and dose are unchanged. The women's health assessment is for starting a new pill, switching, or a UTI concern.",
  },
  {
    question: "What information does the doctor need for a pill assessment?",
    answer: "The assessment asks about your current contraception, pregnancy possibility, migraine with aura, blood clot history, smoking, blood pressure context, other medical conditions, and medicines that may affect contraceptive choice.",
  },
  {
    question: "Can the doctor choose between a combined pill and a mini-pill?",
    answer: "The doctor decides what is clinically appropriate from your answers. Some people are not suitable for oestrogen-containing options and may need a progestogen-only option, another contraceptive method, a call, or in-person review.",
  },
  {
    question: "Do I need a blood pressure reading?",
    answer: "Blood pressure can matter for contraceptive safety, especially for oestrogen-containing pills. If the doctor needs a current reading or more context, they may ask for it or recommend in-person review before prescribing.",
  },
  {
    question: "Can I use this if I might be pregnant?",
    answer: "If you are pregnant or could be pregnant, online pill assessment may not be the right pathway. The doctor may ask for a pregnancy test, contact you for more detail, or recommend in-person care depending on the situation.",
  },
  {
    question: "Can I request a specific pill brand?",
    answer: "You can tell the doctor what you have used before or what you are hoping to switch from, but the final decision is clinical. The public page does not offer a brand menu and prescription is never guaranteed.",
  },
  {
    question: "Will the pill protect me from STIs?",
    answer: "No. Oral contraceptive pills do not protect against sexually transmitted infections. Condoms, testing, and in-person sexual health care may still be needed depending on your situation.",
  },
] as const

// Shared questions that apply to both UTI and pill intents.
const DECLINE_FAQ = {
  question: "What if the doctor declines my request?",
  answer: `${GUARANTEE} The doctor will explain why and recommend next steps, which sometimes means seeing your regular GP or attending a clinic in person.`,
} as const

const COST_FAQ = {
  question: "How much does it cost?",
  answer: `Our flat fee is ${PRICING_DISPLAY.WOMENS_HEALTH} for the doctor review. Pharmacy costs, if relevant, are separate. There are no subscriptions or ongoing fees.`,
} as const

// Intent-scoped FAQ sets so each entry page emits unique on-page FAQ + FAQPage
// schema (avoids duplicate structured data across the 3 women's-health URLs).
// The /womens-health hub keeps the combined set (same order/content as before).
export const UTI_FAQ = [...UTI_FAQ_ITEMS, DECLINE_FAQ, COST_FAQ] as const
export const PILL_FAQ = [...PILL_FAQ_ITEMS, DECLINE_FAQ, COST_FAQ] as const
export const WOMENS_HEALTH_FAQ = [
  ...UTI_FAQ_ITEMS,
  DECLINE_FAQ,
  ...PILL_FAQ_ITEMS,
  COST_FAQ,
] as const
