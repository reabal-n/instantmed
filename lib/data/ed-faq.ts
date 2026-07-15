import { PRICING_DISPLAY } from "@/lib/constants"
import { GUARANTEE } from "@/lib/marketing/voice"

export const ED_FAQ = [
  {
    question: "Can I get an ED assessment online in Australia?",
    answer: "Yes, if the problem is suitable for remote doctor review. You complete a structured safety form and an AHPRA-registered Australian doctor reviews your answers before deciding the next step. Online care is not suitable for urgent symptoms, unstable heart symptoms, prolonged painful erection, injury, or unclear medicine history.",
  },
  {
    question: "Is a prescription guaranteed?",
    answer: "No. The doctor reviews your health information and decides what is clinically appropriate. The outcome may be approval, a brief call or message for more information, or decline with advice to seek in-person care.",
  },
  {
    question: "Do I need a video appointment?",
    answer: "There is no booked waiting-room appointment. You start with a secure form, and the doctor may call or message you briefly if a safety detail needs clarification before deciding.",
  },
  {
    question: "How fast will I hear back?",
    answer: "Requests can be submitted any time. Doctor review occurs during the review window and depends on clinical detail and queue volume. You will receive email updates as the request progresses.",
  },
  {
    question: "What makes ED unsafe to assess online?",
    answer: "Chest pain, severe breathlessness, fainting, stroke symptoms, a recent serious heart or vascular event, certain chest-pain heart medicine use, an erection lasting more than 4 hours, penile injury, sudden severe genital pain, or uncertainty about current medicines can make online prescribing unsafe.",
  },
  {
    question: "Why does the form ask about heart health?",
    answer: "ED can be linked with blood-vessel health, diabetes, high blood pressure, cholesterol, smoking, medicines, alcohol, sleep, stress, and mental health. Some heart symptoms or medicines make common ED treatment unsafe, so the doctor needs that context before deciding.",
  },
  {
    question: "Which treatment can I be prescribed?",
    answer: "The page does not offer a medicine menu. The doctor assesses your individual health profile and decides what, if anything, is clinically appropriate. The specific option and clinical details are determined only after review.",
  },
  {
    question: "Is this service discreet?",
    answer: "Yes. The request is submitted through a secure form and reviewed privately. If a prescription is approved, the pharmacy receives the prescription information needed to dispense it, not your full assessment form.",
  },
  {
    question: "Do I need Medicare?",
    answer: "Consultation and prescribing requests ask for Medicare or suitable identity details to support safe clinical records and electronic prescribing workflows. If you are unsure whether you can complete those details, contact support before paying.",
  },
  {
    question: "How much does it cost?",
    answer: `The InstantMed ED assessment fee is ${PRICING_DISPLAY.MENS_HEALTH} for the doctor review. Pharmacy costs, if relevant, are separate. There are no subscriptions or ongoing fees.`,
  },
  {
    question: "What if the doctor declines my request?",
    answer: `${GUARANTEE} The doctor will explain why and recommend next steps, which may mean seeing your regular GP, urgent care, a sexual health clinic, or another in-person service.`,
  },
  {
    question: "Can I use this for low libido, fertility, or testosterone concerns?",
    answer: "Not as the main reason for the request. Those problems may need a broader history, examination, blood tests, counselling, or specialist review. This pathway is focused on erectile dysfunction assessment and safety screening.",
  },
] as const

// The service landing keeps only the questions needed to choose this pathway.
// The full set remains available to broader FAQ/search surfaces.
export const ED_LANDING_FAQ = [
  ED_FAQ[0],
  ED_FAQ[1],
  ED_FAQ[4],
  ED_FAQ[8],
  ED_FAQ[9],
  ED_FAQ[10],
] as const
