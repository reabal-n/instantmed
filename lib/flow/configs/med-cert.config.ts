import type { FlowConfig } from "@/lib/flow"

/**
 * Medical Certificate flow configuration.
 *
 * Groups: certificate type → symptom details → workplace context
 * Eligibility: red-flag screening for conditions requiring in-person care
 */
export const medCertConfig: FlowConfig = {
  category: "med-cert",
  questionnaire: {
    eligibilityFields: [
      {
        id: "emergency_symptoms",
        type: "toggle",
        label: "I am NOT experiencing a medical emergency",
        description:
          "Chest pain, difficulty breathing, severe bleeding, or loss of consciousness require immediate in-person care (call 000).",
        validation: { required: true },
        isRedFlag: true,
        redFlagMessage:
          "If you are experiencing a medical emergency, please call 000 immediately.",
      },
      {
        id: "workers_comp",
        type: "toggle",
        label: "This is NOT for a workers' compensation claim",
        description:
          "Workers' compensation certificates require an in-person examination by law.",
        isRedFlag: true,
        redFlagMessage:
          "Workers' compensation certificates must be issued during an in-person consultation. Please see your GP.",
      },
    ],

    groups: [
      {
        id: "certificate_type",
        title: "What type of certificate do you need?",
        description: "Select the option that best describes your situation.",
        fields: [
          {
            id: "cert_reason",
            type: "select",
            label: "Reason for certificate",
            validation: { required: true },
            options: [
              {
                value: "unfit_work",
                label: "Unfit for work",
                description: "You are too unwell to attend work",
              },
              {
                value: "unfit_study",
                label: "Unfit for study",
                description: "You are too unwell to attend classes or exams",
              },
              {
                value: "carer",
                label: "Carer's certificate",
                description: "You need to care for an unwell family member",
              },
            ],
          },
          {
            id: "cert_duration",
            type: "select",
            label: "How many days?",
            validation: { required: true },
            options: [
              { value: "1", label: "1 day", description: "$19.95" },
              { value: "2", label: "2 days", description: "$29.95" },
              { value: "3", label: "3 days", description: "$39.95" },
            ],
          },
          {
            id: "cert_start_date",
            type: "date",
            label: "Start date",
            description: "When did your illness or condition begin?",
            validation: { required: true },
          },
        ],
      },
      {
        id: "symptoms",
        title: "Tell us about your symptoms",
        description: "This helps the doctor assess your certificate request.",
        fields: [
          {
            id: "primary_symptom",
            type: "select",
            label: "Main symptom",
            validation: { required: true },
            options: [
              { value: "cold_flu", label: "Cold or flu symptoms" },
              { value: "gastro", label: "Gastro / stomach upset" },
              { value: "migraine", label: "Migraine or severe headache" },
              { value: "back_pain", label: "Back pain" },
              { value: "mental_health", label: "Mental health day" },
              { value: "injury", label: "Minor injury" },
              { value: "other", label: "Other" },
            ],
          },
          {
            id: "symptom_details",
            type: "textarea",
            label: "Additional details",
            placeholder: "Briefly describe your symptoms or situation…",
            description: "Optional but helps the doctor make a decision faster.",
          },
          {
            id: "seen_doctor",
            type: "select",
            label: "Have you seen a doctor about this?",
            options: [
              { value: "no", label: "No" },
              { value: "yes_gp", label: "Yes — my GP" },
              { value: "yes_hospital", label: "Yes — hospital or emergency" },
            ],
          },
        ],
      },
      {
        id: "workplace",
        title: "Workplace details",
        description: "Optional — only needed if your certificate should include employer info.",
        fields: [
          {
            id: "include_employer",
            type: "toggle",
            label: "Include employer name on certificate",
            description: "Some workplaces require this. Leave off if unsure.",
          },
          {
            id: "employer_name",
            type: "text",
            label: "Employer or institution name",
            placeholder: "e.g. Woolworths, University of Sydney",
            showIf: {
              fieldId: "include_employer",
              operator: "equals",
              value: true,
            },
          },
        ],
      },
    ],
  },
}
