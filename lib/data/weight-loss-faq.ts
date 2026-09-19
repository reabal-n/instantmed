import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

const AVAILABILITY = getApprovedClaim("availability_24_7")

/** Weight-management landing FAQ. No prescription medicine names, no outcome claims. */
export const WEIGHT_LOSS_LANDING_FAQ = [
  {
    question: "What does the doctor assess?",
    answer:
      "The doctor reviews your BMI, health history, current medications, previous weight management attempts, and any safety concerns before deciding what next step is suitable.",
  },
  {
    question: "Do I need to have tried other weight management methods first?",
    answer:
      "Generally, yes. Medical weight management support is usually considered alongside lifestyle changes. Your doctor will discuss your history as part of the assessment.",
  },
  {
    question: "Will medicine costs be discussed?",
    answer:
      "Yes. If the doctor decides a prescription option is clinically appropriate, they will explain relevant costs and pharmacy considerations after assessment.",
  },
  {
    question: "How quickly is my assessment reviewed?",
    answer: `${AVAILABILITY} New patients may be asked for extra information, which can extend timing.`,
  },
  {
    question: "What if a treatment option is not suitable?",
    answer: `The doctor will explain why and may recommend lifestyle support, GP follow-up, pathology, or in-person care. ${GUARANTEE}`,
  },
  {
    question: "Will I need follow-up?",
    answer:
      "Often, yes. Weight management care can require monitoring, progress checks, and safety review. The doctor will tell you what follow-up is appropriate for your situation.",
  },
  {
    question: "Is this service covered by Medicare?",
    answer:
      "The review fee is not Medicare-rebateable. Any pharmacy or subsidy questions are discussed after the doctor reviews your assessment.",
  },
  {
    question: "What happens if I'm not eligible for treatment?",
    answer: `${GUARANTEE} The doctor may also recommend lifestyle support, GP follow-up, or specialist care.`,
  },
  {
    question: "Can I use this service if I've had weight loss surgery?",
    answer:
      "You can submit an assessment, but it is important to disclose any previous bariatric surgery. The doctor will review your surgical history and current health status before deciding whether online care is suitable.",
  },
  {
    question: "Do I need to provide photos or measurements?",
    answer:
      "Measurements are part of the initial assessment. Photos are not always required, but the doctor may request extra information if it is needed for safe review. Any files you provide are stored securely and treated as confidential medical information.",
  },
] as const
