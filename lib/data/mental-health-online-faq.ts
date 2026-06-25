/**
 * Used by the visible FAQ accordion and FAQPage structured data.
 * Keep this page service-scope honest: InstantMed is not a crisis, therapy,
 * mental health treatment plan, or broad mental-health treatment service.
 */
export const MENTAL_HEALTH_ONLINE_FAQ = [
  {
    question: "Can I get mental health help online in Australia?",
    answer:
      "Yes, but the right online option depends on the situation. Non-crisis mental health support, GP review, psychology, digital programs, and workplace absence evidence can sometimes happen by telehealth. Crisis risk, immediate danger, psychosis, mania, severe substance risk, or inability to stay safe needs urgent or in-person care.",
  },
  {
    question: "Is InstantMed a mental health treatment service?",
    answer:
      "No. InstantMed is not a therapy service, crisis service, psychiatrist service, or Mental Health Treatment Plan provider. InstantMed can support a short medical certificate request if the absence is suitable for online doctor review.",
  },
  {
    question: "What should I do if I might hurt myself or someone else?",
    answer:
      "Call 000 now if there is immediate danger. If you need urgent crisis support, call Lifeline on 13 11 14 or Suicide Call Back Service on 1300 659 467. Do not wait for an online form.",
  },
  {
    question: "Can I get a medical certificate for a mental health day?",
    answer:
      "A short mental health absence can be a legitimate reason to request a medical certificate. The doctor still has to review the information and decide whether a certificate is clinically appropriate. Crisis symptoms or complex ongoing issues need a different care pathway.",
  },
  {
    question: "Does my employer need to know my diagnosis?",
    answer:
      "Routine absence evidence usually does not need to include your private diagnosis. A medical certificate can focus on the date, assessment, and whether you were unable to attend duties. Workplace policies can still vary.",
  },
  {
    question: "Can an online doctor create a Mental Health Treatment Plan?",
    answer:
      "A Mental Health Treatment Plan is usually best handled by your regular GP or usual medical practitioner because it requires a structured assessment, care planning, referral, and follow-up. InstantMed does not provide this service.",
  },
  {
    question: "Does Medicare cover online mental health care?",
    answer:
      "Medicare support depends on the service, clinician, eligibility, referral, and whether Better Access requirements are met. Better Access can support eligible patients with Medicare benefits for selected mental health services after appropriate assessment and referral.",
  },
  {
    question: "Does InstantMed offer new mental health treatment access?",
    answer:
      "This page does not advertise medicines or new treatment access. Medicine decisions should happen privately with a doctor who can assess diagnosis, risk, current medicines, side effects, monitoring, and follow-up. Urgent or unstable symptoms need in-person care.",
  },
  {
    question: "When is online-only review not enough?",
    answer:
      "Online-only review is not enough for immediate safety risk, thoughts of self-harm with intent or plan, hallucinations, delusions, mania, severe agitation, intoxication, withdrawal, family violence danger, severe functional decline, or when physical examination or urgent support is needed.",
  },
  {
    question: "What should I prepare for a GP mental health appointment?",
    answer:
      "Bring your main symptoms, timing, sleep pattern, appetite, substance use, medicines, physical health issues, work or study impact, supports, prior mental health care, and any safety concerns. If you are worried about safety, tell the clinician early.",
  },
] as const
