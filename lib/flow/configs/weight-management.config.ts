import type { FlowConfig } from "@/lib/flow"

/**
 * Weight Management flow configuration.
 *
 * Groups: body metrics → diet & activity → medical history → goals & preference
 * Eligibility: screening for eating disorders, pregnancy, and acute conditions
 */
export const weightManagementConfig: FlowConfig = {
  category: "weight-loss",
  questionnaire: {
    eligibilityFields: [
      {
        id: "no_eating_disorder",
        type: "toggle",
        label: "I do NOT have a current eating disorder",
        description:
          "Active eating disorders require specialist care. We can help connect you with appropriate support.",
        validation: { required: true },
        isRedFlag: true,
        redFlagMessage:
          "If you are living with an eating disorder, please speak with your GP or contact the Butterfly Foundation on 1800 334 673.",
      },
      {
        id: "not_pregnant",
        type: "toggle",
        label: "I am NOT pregnant or breastfeeding",
        description:
          "Weight loss medications are not safe during pregnancy or breastfeeding.",
        isRedFlag: true,
        redFlagMessage:
          "Weight management medication cannot be prescribed during pregnancy or breastfeeding. Please consult your GP.",
      },
    ],

    groups: [
      {
        id: "body_metrics",
        title: "Your current measurements",
        description: "These help us understand your starting point.",
        fields: [
          {
            id: "current_weight",
            type: "text",
            label: "Current weight (kg)",
            placeholder: "e.g. 85",
            validation: { required: true },
          },
          {
            id: "current_height",
            type: "text",
            label: "Height (cm)",
            placeholder: "e.g. 170",
            validation: { required: true },
          },
          {
            id: "target_weight",
            type: "text",
            label: "Goal weight (kg)",
            placeholder: "e.g. 72",
            validation: { required: true },
          },
        ],
      },
      {
        id: "diet_activity",
        title: "Diet & activity",
        description: "A quick snapshot of your current lifestyle.",
        fields: [
          {
            id: "exercise_frequency",
            type: "select",
            label: "How often do you exercise?",
            validation: { required: true },
            options: [
              { value: "none", label: "Rarely or never" },
              { value: "1_2", label: "1–2 times per week" },
              { value: "3_4", label: "3–4 times per week" },
              { value: "5_plus", label: "5+ times per week" },
            ],
          },
          {
            id: "previous_attempts",
            type: "select",
            label: "What have you tried before?",
            validation: { required: true },
            options: [
              { value: "none", label: "No previous attempts" },
              { value: "diet_exercise", label: "Diet and exercise only" },
              {
                value: "programs",
                label: "Weight loss programs",
                description: "e.g. Weight Watchers, Jenny Craig",
              },
              { value: "medication", label: "Weight loss medication" },
              { value: "multiple", label: "Multiple methods" },
            ],
          },
          {
            id: "previous_medication_details",
            type: "textarea",
            label: "Which medications have you tried?",
            placeholder:
              "e.g. Duromine for 3 months, Ozempic for 6 months…",
            showIf: {
              fieldId: "previous_attempts",
              operator: "equals",
              value: "medication",
            },
          },
        ],
      },
      {
        id: "medical_history",
        title: "Medical history",
        description:
          "Helps the doctor assess which options are safe for you.",
        fields: [
          {
            id: "relevant_conditions",
            type: "multi_select",
            label: "Do any of these apply to you?",
            description: "Select all that apply, or skip if none.",
            options: [
              { value: "diabetes", label: "Type 2 diabetes" },
              { value: "heart_condition", label: "Heart condition" },
              { value: "high_bp", label: "High blood pressure" },
              { value: "thyroid", label: "Thyroid disorder" },
              { value: "sleep_apnea", label: "Sleep apnea" },
              { value: "pcos", label: "PCOS" },
            ],
          },
          {
            id: "adverse_reactions",
            type: "select",
            label:
              "Have you had adverse reactions to weight loss medications?",
            validation: { required: true },
            options: [
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
              { value: "na", label: "Never tried medication" },
            ],
          },
          {
            id: "adverse_reaction_details",
            type: "textarea",
            label: "Please describe the reaction",
            placeholder: "What happened and which medication was it?",
            showIf: {
              fieldId: "adverse_reactions",
              operator: "equals",
              value: "yes",
            },
          },
          {
            id: "current_medications",
            type: "textarea",
            label: "Current medications",
            placeholder:
              "List any medications you take regularly, or type 'none'",
            description: "Include vitamins and supplements.",
          },
        ],
      },
      {
        id: "goals",
        title: "Your goals",
        description: "This helps the doctor tailor a plan for you.",
        fields: [
          {
            id: "medication_preference",
            type: "select",
            label: "Which type of medication interests you?",
            validation: { required: true },
            options: [
              {
                value: "glp1",
                label: "GLP-1 (Ozempic / Mounjaro)",
                description: "Weekly injection, appetite reduction",
              },
              {
                value: "duromine",
                label: "Duromine (Phentermine)",
                description: "Daily tablet, appetite suppressant",
              },
              {
                value: "unsure",
                label: "Not sure — I'd like advice",
                description: "The doctor will recommend the best option",
              },
            ],
          },
          {
            id: "weight_loss_goals",
            type: "textarea",
            label: "What are your weight loss goals?",
            placeholder:
              "What does success look like for you? Any events or timelines?",
            validation: { required: true, minLength: 20 },
          },
        ],
      },
    ],
  },
}
