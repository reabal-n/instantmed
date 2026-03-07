import type { FlowConfig } from "@/lib/flow"

/**
 * General Consultation flow configuration.
 *
 * Groups: reason for consult → symptom details → current medications
 * Eligibility: screening for emergencies and specialist-only conditions
 */
export const consultConfig: FlowConfig = {
  category: "consult",
  questionnaire: {
    eligibilityFields: [
      {
        id: "emergency_check",
        type: "toggle",
        label: "I am NOT experiencing a medical emergency",
        description:
          "Chest pain, difficulty breathing, severe allergic reactions, or thoughts of self-harm require immediate in-person care.",
        validation: { required: true },
        isRedFlag: true,
        redFlagMessage:
          "If you are experiencing a medical emergency, please call 000. For mental health crisis, call Lifeline on 13 11 14.",
      },
    ],

    groups: [
      {
        id: "consult_reason",
        title: "What would you like to discuss?",
        description: "Select the main reason for your consultation.",
        fields: [
          {
            id: "consult_category",
            type: "select",
            label: "Consultation type",
            validation: { required: true },
            options: [
              {
                value: "new_symptom",
                label: "New symptom or concern",
                description: "Something new that you'd like assessed",
              },
              {
                value: "ongoing_condition",
                label: "Ongoing condition",
                description: "Follow-up or management of an existing condition",
              },
              {
                value: "medication_review",
                label: "Medication review",
                description: "Review or change of current medications",
              },
              {
                value: "referral",
                label: "Specialist referral",
                description: "Need a referral letter for a specialist",
              },
              {
                value: "results",
                label: "Test results discussion",
                description: "Discuss blood tests, imaging, or other results",
              },
              {
                value: "other",
                label: "Something else",
              },
            ],
          },
          {
            id: "consult_summary",
            type: "textarea",
            label: "Briefly describe your concern",
            placeholder: "What's been going on? When did it start?",
            validation: { required: true, minLength: 10 },
          },
        ],
      },
      {
        id: "symptom_details",
        title: "More about your symptoms",
        description: "These details help the doctor prepare for your consultation.",
        fields: [
          {
            id: "symptom_duration",
            type: "select",
            label: "How long has this been going on?",
            validation: { required: true },
            options: [
              { value: "today", label: "Started today" },
              { value: "few_days", label: "A few days" },
              { value: "1_2weeks", label: "1–2 weeks" },
              { value: "2_4weeks", label: "2–4 weeks" },
              { value: "over_month", label: "Over a month" },
              { value: "chronic", label: "Ongoing / chronic" },
            ],
          },
          {
            id: "severity",
            type: "radio",
            label: "How would you rate the severity?",
            validation: { required: true },
            options: [
              { value: "mild", label: "Mild", description: "Noticeable but not limiting" },
              { value: "moderate", label: "Moderate", description: "Affecting daily activities" },
              { value: "severe", label: "Severe", description: "Significantly impacting your life" },
            ],
          },
          {
            id: "tried_treatments",
            type: "textarea",
            label: "Have you tried anything so far?",
            placeholder: "e.g. over-the-counter medication, rest, home remedies…",
            description: "Optional — helps the doctor understand what's already been tried.",
          },
        ],
      },
      {
        id: "current_health",
        title: "Current health",
        description: "Quick overview of your health background.",
        fields: [
          {
            id: "current_medications",
            type: "textarea",
            label: "Current medications",
            placeholder: "List any medications you take regularly, or type 'none'",
            description: "Include vitamins and supplements.",
          },
          {
            id: "known_allergies",
            type: "text",
            label: "Known allergies",
            placeholder: "e.g. Penicillin, Sulfa drugs, or 'none'",
          },
          {
            id: "relevant_conditions",
            type: "textarea",
            label: "Relevant medical history",
            placeholder: "Any past conditions, surgeries, or ongoing issues the doctor should know about…",
          },
        ],
      },
    ],
  },
}
