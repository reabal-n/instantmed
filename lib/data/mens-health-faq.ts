import { PRICING_DISPLAY } from "@/lib/constants"
import { GUARANTEE } from "@/lib/marketing/voice"

export const MENS_HEALTH_FAQ = [
  {
    question: "What men's health concerns can InstantMed help with online?",
    answer:
      "InstantMed can help with structured doctor review for erectile dysfunction concerns and hair loss concerns when the issue is suitable for remote assessment. It is not a broad men's health check, emergency service, testosterone clinic, fertility service, mental health crisis pathway, or replacement for your regular GP.",
  },
  {
    question: "Can I request erectile dysfunction assessment online in Australia?",
    answer:
      "Yes, if the situation is suitable for remote review. You complete a private safety form covering symptom pattern, heart-health context, medicines, and red flags. An AHPRA-registered Australian doctor reviews the request and decides whether online care is appropriate.",
  },
  {
    question: "Can I request hair loss assessment online?",
    answer:
      "Yes, for common hair-loss patterns that can be assessed from history, timing, photos where needed, and medical context. Sudden patchy loss, scalp pain, scarring, infection signs, or hair loss with feeling generally unwell may need in-person review or pathology first.",
  },
  {
    question: "Will I definitely get a prescription?",
    answer:
      "No. The doctor decides what is clinically appropriate after reviewing your information. The outcome may be approval, a brief call or message for more information, decline with a safer next step, or advice to see someone in person.",
  },
  {
    question: "Why does the page avoid listing specific prescription medicines?",
    answer:
      "Prescription medicines are not advertised to the public in Australia. The public page explains the assessment, safety boundaries, costs, and care routes. Any medicine decision, if relevant, happens privately after doctor review.",
  },
  {
    question: "How much does men's health assessment cost?",
    answer: `ED and hair-loss doctor review currently costs ${PRICING_DISPLAY.MENS_HEALTH}. Pharmacy costs, if a prescription is approved, are separate. There are no subscriptions or ongoing membership fees.`,
  },
  {
    question: "Does Medicare or PBS cover this?",
    answer:
      "InstantMed's review fee is a private fee and is not bulk billed. Medicare details are required for prescribing-related requests because they support identity and electronic prescription records. PBS eligibility, brand choice, premiums, and final pharmacy cost are confirmed by the pharmacy if a prescription is approved.",
  },
  {
    question: "What red flags mean I should not use online men's health review?",
    answer:
      "Call 000 for chest pain, severe breathlessness, collapse, stroke symptoms, severe allergic reaction, or immediate danger. Seek urgent in-person care for an erection lasting more than 4 hours, genital injury, severe genital pain, sudden severe testicular pain, sudden patchy hair loss with scalp pain, scalp infection signs, or any symptom that feels severe or rapidly worsening.",
  },
  {
    question: "Do I need a video or phone appointment?",
    answer:
      "You start with a secure form. The doctor may call or message you if a safety detail needs clarification before deciding. Online review is only used when the doctor has enough information to assess the request safely.",
  },
  {
    question: "What happens if the doctor declines my request?",
    answer: `${GUARANTEE} The doctor will explain why online care is not suitable and recommend a safer next step, such as your regular GP, urgent care, sexual health clinic, dermatologist, pathology, or another in-person service.`,
  },
  {
    question: "Which pathway should I choose?",
    answer:
      "Choose erectile dysfunction assessment if the main concern is getting or maintaining erections. Choose hair loss assessment if the main concern is scalp hair thinning, shedding, or pattern hair loss. If your main concern is chest pain, testicular pain, fertility, low libido, mental health crisis, or a general health check, choose in-person care or your regular GP.",
  },
  {
    question: "Can this replace my regular GP?",
    answer:
      "No. Online men's health review is a one-off request pathway. ED and hair loss can sometimes be linked with broader cardiovascular, metabolic, hormonal, skin, mental health, or medication issues. Your regular GP is best placed for ongoing checks, pathology, preventive care, and long-term management.",
  },
] as const
