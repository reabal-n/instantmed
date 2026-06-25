import { PRICING_DISPLAY } from "@/lib/constants"
import { GUARANTEE } from "@/lib/marketing/voice"

export const MEDICAL_CERTIFICATE_ONLINE_FAQ = [
  {
    question: "Can I get a medical certificate online in Australia?",
    answer:
      "Yes, when the request is suitable for telehealth. You complete a secure form, an AHPRA-registered Australian doctor reviews the information, and a certificate is issued only if the doctor decides it is clinically appropriate.",
  },
  {
    question: "How much does an online medical certificate cost?",
    answer: `A 1-day certificate request is ${PRICING_DISPLAY.MED_CERT}, a 2-day request is ${PRICING_DISPLAY.MED_CERT_2DAY}, and a 3-day request is ${PRICING_DISPLAY.MED_CERT_3DAY}. ${GUARANTEE}`,
  },
  {
    question: "Will my employer accept an online medical certificate?",
    answer:
      "Fair Work says evidence needs to satisfy a reasonable person, and medical certificates are an example of acceptable evidence. Employer policies can still vary, so no service should promise acceptance by every workplace.",
  },
  {
    question: "Do I need a Medicare card?",
    answer:
      "No. Medicare is optional for medical certificate requests because this is a private short-certificate service. You still need to provide identity and contact details so the doctor can review the request properly.",
  },
  {
    question: "Can a certificate cover more than one day?",
    answer:
      "Yes, if clinically appropriate. InstantMed supports routine 1-day, 2-day, and 3-day certificate requests. Longer absences usually need a regular GP or in-person review for ongoing care.",
  },
  {
    question: "Can I get a backdated medical certificate?",
    answer:
      "A doctor may consider a recent past absence if the history is clear and the timing is clinically reasonable. It is not automatic. The certificate must match what the doctor can responsibly assess from your information.",
  },
  {
    question: "What conditions can be suitable for online certificate review?",
    answer:
      "Short, non-urgent illnesses such as cold and flu symptoms, gastro symptoms, migraine, back pain flare-ups, period pain, stress, anxiety, or carer responsibilities may be suitable if there are no red flags. The doctor decides after review.",
  },
  {
    question: "What is not covered by this short certificate pathway?",
    answer:
      "It is not for emergencies, workers compensation, court or tribunal matters, jury duty, fitness-for-driving, firearm or aviation assessments, NDIS, TAC, insurance, exam deferral, or complex capacity documents such as Centrelink medical certificates.",
  },
  {
    question: "Will the certificate include my diagnosis?",
    answer:
      "Usually no. Routine work or study certificates can focus on whether you were unable to attend duties and the dates covered. Employers generally do not need your private diagnosis for ordinary personal leave evidence.",
  },
  {
    question: "Can the doctor decline the request?",
    answer:
      "Yes. The doctor can decline if the request is unsafe, outside scope, inconsistent, or needs in-person care. If the doctor declines, the request is refunded and you are told the safer next step.",
  },
  {
    question: "What if I have chest pain, trouble breathing, or severe symptoms?",
    answer:
      "Do not use an online certificate request for urgent symptoms. Call 000 for chest pain, severe breathing difficulty, collapse, stroke symptoms, severe injury, or immediate danger. Seek in-person care for severe dehydration, severe abdominal pain, blood in vomit or stool, or symptoms that are worsening quickly.",
  },
  {
    question: "How do I receive the certificate if approved?",
    answer:
      "If approved, the certificate is delivered digitally as a secure PDF with verification details. You can use the verification page if an employer or institution needs to check authenticity.",
  },
] as const
