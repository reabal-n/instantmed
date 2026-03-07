import type { FlowConfig } from "@/lib/flow"

/**
 * Repeat Prescription flow configuration.
 *
 * Groups: medication details → prescribing history → pharmacy preference
 * Eligibility: screening for controlled substances and new prescriptions
 */
export const prescriptionConfig: FlowConfig = {
  category: "prescription",
  questionnaire: {
    eligibilityFields: [
      {
        id: "existing_prescription",
        type: "toggle",
        label: "I have been prescribed this medication before",
        description:
          "We can only process repeat prescriptions for medications you have previously been prescribed by a doctor.",
        validation: { required: true },
        isRedFlag: true,
        redFlagMessage:
          "New prescriptions require a full consultation. Please book a general consultation instead.",
      },
      {
        id: "not_controlled",
        type: "toggle",
        label: "This is NOT a controlled or Schedule 8 substance",
        description:
          "Controlled substances (e.g. opioids, benzodiazepines, stimulants) cannot be prescribed via telehealth.",
        isRedFlag: true,
        redFlagMessage:
          "Controlled substances require an in-person consultation with your regular GP.",
      },
    ],

    groups: [
      {
        id: "medication_details",
        title: "Medication details",
        description: "Search for your medication or enter it manually.",
        fields: [
          {
            id: "medication_name",
            type: "text",
            label: "Medication name",
            placeholder: "e.g. Amoxicillin 500mg",
            description: "Enter the name and strength if you know it. You can also search in the next field.",
            validation: { required: true },
          },
          {
            id: "dosage_instructions",
            type: "text",
            label: "How do you take it?",
            placeholder: "e.g. One tablet twice daily",
            description: "Your usual dosage as directed by your doctor.",
            validation: { required: true },
          },
          {
            id: "quantity_needed",
            type: "select",
            label: "How many repeats do you need?",
            validation: { required: true },
            options: [
              { value: "1", label: "1 repeat" },
              { value: "2", label: "2 repeats" },
              { value: "3", label: "3 repeats" },
              { value: "max", label: "Maximum allowed" },
            ],
          },
        ],
      },
      {
        id: "prescribing_history",
        title: "Prescribing history",
        description: "Helps the doctor verify your medication history.",
        fields: [
          {
            id: "last_prescribed",
            type: "select",
            label: "When were you last prescribed this?",
            validation: { required: true },
            options: [
              { value: "within_3months", label: "Within the last 3 months" },
              { value: "3_6months", label: "3–6 months ago" },
              { value: "6_12months", label: "6–12 months ago" },
              { value: "over_12months", label: "Over 12 months ago" },
            ],
          },
          {
            id: "prescriber_name",
            type: "text",
            label: "Previous prescriber (optional)",
            placeholder: "e.g. Dr Smith, Bondi Junction Medical Centre",
            description: "The doctor or clinic that last prescribed this medication.",
          },
          {
            id: "side_effects",
            type: "select",
            label: "Have you experienced any side effects?",
            validation: { required: true },
            options: [
              { value: "none", label: "No side effects" },
              { value: "mild", label: "Mild side effects (manageable)" },
              {
                value: "moderate",
                label: "Moderate side effects",
                description: "Please describe in the notes below",
              },
              {
                value: "severe",
                label: "Severe side effects",
                isDisqualifying: true,
                description: "Please see your GP in person",
              },
            ],
          },
          {
            id: "side_effect_notes",
            type: "textarea",
            label: "Side effect details",
            placeholder: "Describe the side effects you have experienced…",
            showIf: {
              fieldId: "side_effects",
              operator: "equals",
              value: "moderate",
            },
          },
        ],
      },
      {
        id: "pharmacy",
        title: "Pharmacy preference",
        fields: [
          {
            id: "pharmacy_preference",
            type: "select",
            label: "How would you like your script delivered?",
            validation: { required: true },
            options: [
              {
                value: "escript",
                label: "eScript (SMS/email)",
                description: "Take to any pharmacy — most popular option",
              },
              {
                value: "specific_pharmacy",
                label: "Send to a specific pharmacy",
                description: "We'll send it electronically",
              },
            ],
          },
          {
            id: "pharmacy_name",
            type: "text",
            label: "Pharmacy name and suburb",
            placeholder: "e.g. Priceline Pharmacy, Surry Hills",
            showIf: {
              fieldId: "pharmacy_preference",
              operator: "equals",
              value: "specific_pharmacy",
            },
          },
        ],
      },
    ],
  },
}
