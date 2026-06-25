/**
 * Single source of truth for /online-prescriptions FAQ data.
 * Used by the visible FAQ accordion and FAQPage structured data.
 */
import { PRICING_DISPLAY } from "@/lib/constants"

export const ONLINE_PRESCRIPTIONS_FAQ = [
  {
    question: "Can I get a prescription online in Australia?",
    answer:
      "Sometimes. Online prescription review can be suitable for an existing regular medicine when the doctor has enough information to assess safety. A prescription is not promised. The doctor reviews the request and decides whether online care, more information, decline, or in-person care is appropriate.",
  },
  {
    question: "Is this for repeat prescriptions only?",
    answer:
      "Yes. InstantMed's prescription pathway is for repeat requests for medicines you have already been prescribed. New medicines for a new or unclear problem usually need your regular GP or another in-person pathway unless they fit an active structured specialty service.",
  },
  {
    question: "How much does an online prescription request cost?",
    answer:
      `A repeat prescription review is ${PRICING_DISPLAY.REPEAT_SCRIPT}. The review fee is separate from any pharmacy cost. If the doctor declines the request, the request is refunded.`,
  },
  {
    question: "Do I need Medicare?",
    answer:
      "Medicare details are required for prescription and consultation requests because they support identity, clinical records, and electronic prescribing workflows. Medical certificate requests have different requirements.",
  },
  {
    question: "What information does the doctor need?",
    answer:
      "The doctor needs the current medicine details, dose, how long you have taken it, who prescribed it, allergies, medical conditions, other medicines, recent monitoring if relevant, pregnancy or breastfeeding context where relevant, and whether anything has changed since the last prescription.",
  },
  {
    question: "What medicines are not suitable online?",
    answer:
      "This pathway is not for controlled or dependence-forming medicines, emergency treatment, complex monitoring, unclear medicine history, first-time medicines for new problems, or requests where a physical examination, testing, or regular GP continuity is needed.",
  },
  {
    question: "Will my PBS subsidy still apply?",
    answer:
      "If a prescription is approved and the medicine is PBS listed for your circumstances, PBS pricing is handled at the pharmacy. The pharmacy confirms the final amount. The InstantMed review fee is separate from the medicine cost.",
  },
  {
    question: "How do I receive an eScript?",
    answer:
      "If the doctor approves a prescription, an electronic prescription token can be sent by SMS or email. You present the token at your chosen pharmacy. Repeat tokens are usually issued by the pharmacy after each supply when repeats are included.",
  },
  {
    question: "Can the doctor call me?",
    answer:
      "Yes. The doctor may call or message if the medicine history, safety screen, monitoring, identity details, or symptoms need clarification before a decision. Prescribing requests should not be framed as no-call services.",
  },
  {
    question: "What if the doctor declines?",
    answer:
      "A decline means online prescribing was not safe or suitable from the information provided. The doctor gives a safer next step where possible, and the request is refunded.",
  },
  {
    question: "When should I not use online prescription review?",
    answer:
      "Do not use an online prescription request for chest pain, severe breathing trouble, collapse, stroke symptoms, severe allergic reaction, severe infection, suicidal thoughts, pregnancy red flags, overdose, poisoning, or symptoms getting worse quickly. Call 000 for emergencies.",
  },
  {
    question: "Can I use this if my dose has changed?",
    answer:
      "Dose changes, side effects, loss of control, new symptoms, recent hospital care, or missing monitoring results can make a simple repeat request unsuitable. The doctor may ask for more information, decline, or recommend your regular GP.",
  },
] as const
