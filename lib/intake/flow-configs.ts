/**
 * Flow Configurations
 * JSON configs for medical certificate and prescription flows
 */

import type { FlowConfig } from "./flow-engine"

export const MEDCERT_FLOW: FlowConfig = {
  id: "medcert",
  name: "Medical Certificate",
  sections: [
    {
      id: "type",
      title: "Certificate type",
      emoji: "📋",
      questions: [
        {
          id: "certType",
          type: "single",
          label: "What's this for?",
          required: true,
          options: [
            { id: "work", label: "Work", emoji: "💼" },
            { id: "uni", label: "Uni/School", emoji: "📚" },
            { id: "carer", label: "Carer's leave", emoji: "❤️" },
          ],
        },
      ],
    },
    {
      id: "duration",
      title: "Duration",
      emoji: "📅",
      questions: [
        {
          id: "duration",
          type: "chips",
          label: "How long do you need?",
          required: true,
          options: [
            { id: "today", label: "Today only" },
            { id: "2days", label: "2 days" },
            { id: "3days", label: "3 days" },
            { id: "4-7days", label: "4-7 days" },
            { id: "custom", label: "Custom" },
          ],
        },
        {
          id: "dateFrom",
          type: "date",
          label: "From",
          required: true,
          showIf: { field: "duration", operator: "equals", value: "custom" },
        },
        {
          id: "dateTo",
          type: "date",
          label: "To",
          required: true,
          showIf: { field: "duration", operator: "equals", value: "custom" },
        },
      ],
    },
    {
      id: "carer",
      title: "Person you're caring for",
      emoji: "👤",
      showIf: { field: "certType", operator: "equals", value: "carer" },
      questions: [
        {
          id: "carerName",
          type: "text",
          label: "Their full name",
          placeholder: "Full name",
          required: true,
        },
        {
          id: "carerRelation",
          type: "chips",
          label: "Relationship",
          required: true,
          options: [
            { id: "parent", label: "Parent" },
            { id: "child", label: "Child" },
            { id: "partner", label: "Partner" },
            { id: "sibling", label: "Sibling" },
            { id: "grandparent", label: "Grandparent" },
            { id: "other", label: "Other" },
          ],
        },
      ],
    },
    {
      id: "symptoms",
      title: "Symptoms",
      emoji: "🩺",
      questions: [
        {
          id: "symptoms",
          type: "multi",
          label: "What's going on?",
          sublabel: "Tap all that apply",
          required: true,
          validation: { min: 1, message: "Select at least one symptom" },
          options: [
            { id: "cold", label: "Cold/Flu", emoji: "🤧" },
            { id: "gastro", label: "Gastro", emoji: "🤢" },
            { id: "migraine", label: "Migraine", emoji: "🤕" },
            { id: "fever", label: "Fever", emoji: "🌡️" },
            { id: "fatigue", label: "Fatigue", emoji: "😴" },
            { id: "period", label: "Period pain", emoji: "💊" },
            { id: "respiratory", label: "Respiratory", emoji: "😷" },
            { id: "mental", label: "Mental health", emoji: "🧠" },
            { id: "other", label: "Other", emoji: "✏️" },
          ],
        },
        {
          id: "otherSymptom",
          type: "text",
          label: "Describe your symptoms",
          placeholder: "Please describe...",
          required: true,
          showIf: { field: "symptoms", operator: "includes", value: "other" },
        },
      ],
    },
    {
      id: "notes",
      title: "Additional notes",
      emoji: "📝",
      questions: [
        {
          id: "notes",
          type: "text",
          label: "Anything else the doctor should know?",
          sublabel: "Optional - helps the doctor understand your situation",
          placeholder: "Add any extra details here...",
        },
      ],
    },
  ],
  safetySection: {
    id: "safety",
    title: "Quick safety check",
    questions: [
      {
        id: "safetyUrgent",
        type: "toggle",
        label: "Are you experiencing a medical emergency?",
        flagIf: [
          { value: true, severity: "knockout", message: "Please call 000 or visit your nearest emergency department" },
        ],
      },
      {
        id: "safetyPregnant",
        type: "toggle",
        label: "Are you pregnant or possibly pregnant?",
        flagIf: [{ value: true, severity: "info", message: "Patient indicates possible pregnancy" }],
      },
    ],
  },
}

export const PRESCRIPTION_FLOW: FlowConfig = {
  id: "prescription",
  name: "Prescription",
  sections: [
    {
      id: "type",
      title: "Prescription type",
      emoji: "💊",
      questions: [
        {
          id: "rxType",
          type: "single",
          label: "Is this a repeat or new medication?",
          required: true,
          options: [
            { id: "repeat", label: "Repeat", emoji: "🔄" },
            { id: "new", label: "New medication", emoji: "➕" },
          ],
        },
      ],
    },
    {
      id: "medication",
      title: "Medication details",
      emoji: "💉",
      questions: [
        {
          id: "medication",
          type: "text",
          label: "What medication do you need?",
          placeholder: "e.g. Ventolin, Microgynon, Lexapro",
          required: true,
        },
        {
          id: "condition",
          type: "chips",
          label: "What condition is this for?",
          required: true,
          options: [
            { id: "mental", label: "Mental health" },
            { id: "skin", label: "Skin" },
            { id: "infection", label: "Infection" },
            { id: "contraception", label: "Contraception" },
            { id: "respiratory", label: "Asthma/Respiratory" },
            { id: "heart", label: "Heart/BP" },
            { id: "diabetes", label: "Diabetes" },
            { id: "other", label: "Other" },
          ],
        },
      ],
    },
    {
      id: "history",
      title: "Medication history",
      emoji: "📊",
      showIf: { field: "rxType", operator: "equals", value: "repeat" },
      questions: [
        {
          id: "rxDuration",
          type: "single",
          label: "How long have you taken this?",
          required: true,
          options: [
            { id: "<3m", label: "< 3 months" },
            { id: "3-12m", label: "3–12 months" },
            { id: ">1y", label: "> 1 year" },
          ],
        },
        {
          id: "rxControl",
          type: "single",
          label: "How well is your condition controlled?",
          required: true,
          options: [
            { id: "well", label: "Well controlled" },
            { id: "partial", label: "Partially" },
            { id: "poor", label: "Poorly" },
          ],
          flagIf: [{ value: "poor", severity: "warning", message: "Patient reports poor symptom control" }],
        },
        {
          id: "rxSideEffects",
          type: "single",
          label: "Any side effects?",
          required: true,
          options: [
            { id: "none", label: "None" },
            { id: "mild", label: "Mild" },
            { id: "significant", label: "Significant" },
          ],
          flagIf: [{ value: "significant", severity: "warning", message: "Patient reports significant side effects" }],
        },
      ],
    },
    {
      id: "notes",
      title: "Additional notes",
      emoji: "📝",
      questions: [
        {
          id: "notes",
          type: "text",
          label: "Anything else the doctor should know?",
          placeholder: "Add any extra details here...",
        },
      ],
    },
  ],
  safetySection: {
    id: "safety",
    title: "Safety check",
    questions: [
      {
        id: "safetyAllergies",
        type: "toggle",
        label: "Do you have any medication allergies?",
        flagIf: [{ value: true, severity: "info", message: "Patient has medication allergies" }],
      },
      {
        id: "safetyReactions",
        type: "toggle",
        label: "Have you had severe reactions to medications before?",
        flagIf: [
          {
            value: true,
            severity: "knockout",
            message: "History of severe medication reactions - recommend in-person consultation",
          },
        ],
      },
      {
        id: "safetyPregnant",
        type: "toggle",
        label: "Are you pregnant or possibly pregnant?",
        flagIf: [{ value: true, severity: "info", message: "Patient indicates possible pregnancy" }],
      },
    ],
  },
}

export const FLOW_CONFIGS: Record<string, FlowConfig> = {
  medcert: MEDCERT_FLOW,
  prescription: PRESCRIPTION_FLOW,
}
