import type { FlowConfig } from "@/lib/flow"

/**
 * Men's Health flow configuration.
 *
 * Groups: condition type → symptom details → medical history → preference
 * Eligibility: screening for emergencies and conditions requiring in-person care
 *
 * Covers ED, hair loss, and general men's health concerns.
 * Condition-specific fields use `showIf` to keep the flow concise.
 */
export const mensHealthConfig: FlowConfig = {
  category: "mens-health",
  questionnaire: {
    eligibilityFields: [
      {
        id: "mens_age_confirm",
        type: "toggle",
        label: "I am 18 years of age or older",
        description:
          "Men's health consultations are available for adults 18 and over.",
        validation: { required: true },
        isRedFlag: true,
        redFlagMessage:
          "This service is only available for adults 18+. Please see your GP.",
      },
      {
        id: "no_chest_pain",
        type: "toggle",
        label: "I am NOT experiencing chest pain or cardiovascular symptoms",
        description:
          "Chest pain, irregular heartbeat, or fainting require immediate in-person care.",
        isRedFlag: true,
        redFlagMessage:
          "If you are experiencing chest pain or cardiovascular symptoms, please call 000 or visit your nearest emergency department.",
      },
    ],

    groups: [
      {
        id: "condition_type",
        title: "What would you like help with?",
        description: "Select the area that best describes your concern.",
        fields: [
          {
            id: "mens_concern",
            type: "select",
            label: "Primary concern",
            validation: { required: true },
            options: [
              {
                value: "ed",
                label: "Erectile dysfunction",
                description: "Difficulty achieving or maintaining an erection",
              },
              {
                value: "hair_loss",
                label: "Hair loss",
                description: "Thinning hair or receding hairline",
              },
              {
                value: "premature_ejaculation",
                label: "Premature ejaculation",
              },
              {
                value: "low_testosterone",
                label: "Low testosterone symptoms",
                description: "Fatigue, low libido, mood changes",
              },
              {
                value: "other",
                label: "Something else",
              },
            ],
          },
        ],
      },
      {
        id: "ed_details",
        title: "About your symptoms",
        description: "These details help the doctor recommend the right treatment.",
        fields: [
          {
            id: "ed_onset",
            type: "select",
            label: "When did you first notice difficulty?",
            validation: { required: true },
            options: [
              { value: "recent", label: "Recently (last few months)" },
              { value: "gradual", label: "Gradually over time" },
              { value: "sudden", label: "Suddenly" },
              { value: "always", label: "Always had difficulty" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "ed",
            },
          },
          {
            id: "ed_frequency",
            type: "select",
            label: "How often do you experience difficulty?",
            validation: { required: true },
            options: [
              { value: "sometimes", label: "Sometimes" },
              {
                value: "often",
                label: "Often",
                description: "More than half the time",
              },
              { value: "always", label: "Always" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "ed",
            },
          },
          {
            id: "ed_morning_erections",
            type: "select",
            label: "Do you experience morning erections?",
            options: [
              { value: "yes", label: "Yes, regularly" },
              { value: "sometimes", label: "Sometimes" },
              { value: "rarely", label: "Rarely or never" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "ed",
            },
          },
          {
            id: "ed_nitrates",
            type: "toggle",
            label:
              "I do NOT take nitrates (e.g. GTN spray, Anginine, Imdur)",
            description:
              "Nitrates combined with ED medication can cause a dangerous drop in blood pressure.",
            isRedFlag: true,
            redFlagMessage:
              "ED medication cannot be prescribed alongside nitrates. Please discuss alternatives with your GP.",
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "ed",
            },
          },
          {
            id: "ed_preference",
            type: "select",
            label: "Which option suits you best?",
            validation: { required: true },
            options: [
              {
                value: "daily",
                label: "Daily tablet",
                description: "Tadalafil 5mg — consistent effect",
              },
              {
                value: "prn",
                label: "As-needed",
                description: "Sildenafil / Tadalafil 20mg — before activity",
              },
              {
                value: "unsure",
                label: "Not sure — I'd like advice",
              },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "ed",
            },
          },
        ],
      },
      {
        id: "hair_loss_details",
        title: "About your hair loss",
        description: "Helps the doctor recommend the right approach.",
        fields: [
          {
            id: "hair_pattern",
            type: "select",
            label: "What type of hair loss are you experiencing?",
            validation: { required: true },
            options: [
              {
                value: "male_pattern",
                label: "Male pattern baldness",
                description: "Receding hairline or thinning crown",
              },
              { value: "overall_thinning", label: "Overall thinning" },
              {
                value: "patchy",
                label: "Patchy hair loss",
                description: "Alopecia areata",
              },
              { value: "other", label: "Other pattern" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "hair_loss",
            },
          },
          {
            id: "hair_duration",
            type: "select",
            label: "How long have you been experiencing hair loss?",
            validation: { required: true },
            options: [
              { value: "less_6months", label: "Less than 6 months" },
              { value: "6_12months", label: "6–12 months" },
              { value: "1_2years", label: "1–2 years" },
              { value: "over_2years", label: "More than 2 years" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "hair_loss",
            },
          },
          {
            id: "hair_family_history",
            type: "select",
            label: "Family history of hair loss?",
            options: [
              { value: "yes_father", label: "Yes, on father's side" },
              { value: "yes_mother", label: "Yes, on mother's side" },
              { value: "yes_both", label: "Yes, on both sides" },
              { value: "no", label: "No family history" },
              { value: "unknown", label: "Not sure" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "hair_loss",
            },
          },
          {
            id: "hair_preference",
            type: "select",
            label: "Which treatment option interests you?",
            validation: { required: true },
            options: [
              {
                value: "finasteride",
                label: "Finasteride (oral)",
                description: "Daily tablet — blocks DHT",
              },
              {
                value: "minoxidil",
                label: "Minoxidil (topical)",
                description: "Applied to scalp — stimulates growth",
              },
              {
                value: "unsure",
                label: "Not sure — I'd like advice",
              },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "equals",
              value: "hair_loss",
            },
          },
        ],
      },
      {
        id: "general_details",
        title: "Tell us more",
        description:
          "Provide as much detail as you can so the doctor can help.",
        fields: [
          {
            id: "symptom_description",
            type: "textarea",
            label: "Describe your symptoms or concern",
            placeholder:
              "When did it start? How is it affecting you?",
            validation: { required: true, minLength: 20 },
            showIf: {
              fieldId: "mens_concern",
              operator: "not_equals",
              value: "ed",
            },
          },
          {
            id: "symptom_duration",
            type: "select",
            label: "How long has this been going on?",
            validation: { required: true },
            options: [
              { value: "days", label: "A few days" },
              { value: "weeks", label: "A few weeks" },
              { value: "months", label: "A few months" },
              { value: "over_year", label: "Over a year" },
            ],
            showIf: {
              fieldId: "mens_concern",
              operator: "not_equals",
              value: "ed",
            },
          },
          {
            id: "additional_info",
            type: "textarea",
            label: "Anything else the doctor should know?",
            placeholder:
              "Current medications, previous treatments, relevant medical history…",
          },
        ],
      },
    ],
  },
}
