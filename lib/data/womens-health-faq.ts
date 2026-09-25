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
    question: "Can men or children use this UTI assessment?",
    answer: "This assessment is designed for adult women's-health UTI assessment. Men and children with urinary symptoms usually need a different assessment because the causes and safety checks are different.",
  },
  {
    question: "What if my symptoms could be an STI or vaginal infection?",
    answer: "If you have vaginal discharge, genital sores, pelvic pain, STI exposure, sexual assault, or symptoms that do not fit a simple urinary infection, seek in-person sexual health or GP care rather than using this online UTI assessment.",
  },
  {
    question: "What happens if symptoms do not improve?",
    answer: "Seek medical review if symptoms worsen, do not improve as expected, return soon after treatment, or are associated with fever, back or side pain, vomiting, or visible blood. You may need testing or in-person review.",
  },
] as const

const CONTRACEPTION_FAQ_ITEMS = [
  {
    question: "What does the contraception assessment cover?",
    answer: "A doctor reviews your contraception needs and relevant health history to decide whether this limited online service is suitable. It is not a full sexual health service. Procedures, device fitting or removal, emergency contraception and STI testing are outside its scope. The form checks your needs before payment.",
  },
  {
    question: "Can I use this for continuing care?",
    answer: `Continuing care uses the same women's health assessment, with a one-off doctor review fee of ${PRICING_DISPLAY.WOMENS_HEALTH}. Have your current treatment details ready. The same safety screen applies even when your circumstances are unchanged. Pharmacy costs are separate; any prescription depends on the doctor's review.`,
  },
  {
    question: "What information does the doctor need?",
    answer: "Your contraception needs, pregnancy possibility, migraine with aura, blood clot history, smoking, blood pressure context, other medical conditions and current medicines. The doctor may call or message if more information is needed.",
  },
  {
    question: "Do I need a blood pressure reading?",
    answer: "The doctor may need a current blood pressure reading or more context to assess suitability. They may ask for this or recommend in-person review before deciding what care is appropriate.",
  },
  {
    question: "Can I use this if I might be pregnant?",
    answer: "If you are pregnant or could be pregnant, this paid assessment stops before checkout. Arrange appropriate care with your GP or sexual health clinic. Seek urgent care for possible pregnancy with pain or bleeding.",
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

// Intent-scoped FAQ sets keep each entry page's on-page FAQ + FAQPage schema
// distinct across the three women's-health URLs.
export const UTI_LANDING_FAQ = [
  UTI_FAQ_ITEMS[0],
  UTI_FAQ_ITEMS[2],
  UTI_FAQ_ITEMS[4],
  UTI_FAQ_ITEMS[5],
  DECLINE_FAQ,
  COST_FAQ,
] as const
export const CONTRACEPTION_LANDING_FAQ = [
  ...CONTRACEPTION_FAQ_ITEMS,
  DECLINE_FAQ,
  COST_FAQ,
] as const
// The hub is a chooser, not a second copy of either child landing page.
export const WOMENS_HEALTH_HUB_FAQ = [
  UTI_FAQ_ITEMS[0],
  UTI_FAQ_ITEMS[2],
  CONTRACEPTION_FAQ_ITEMS[0],
  CONTRACEPTION_FAQ_ITEMS[1],
  COST_FAQ,
  DECLINE_FAQ,
] as const
