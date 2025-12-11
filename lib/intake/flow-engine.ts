/**
 * Smart Branching Logic Engine
 * JSON config-driven decision tree system with safety flags and conditional logic
 */

export type QuestionType = "single" | "multi" | "text" | "date" | "toggle" | "chips" | "numeric"

export interface FlowQuestion {
  id: string
  type: QuestionType
  label: string
  sublabel?: string
  placeholder?: string
  options?: { id: string; label: string; emoji?: string }[]
  required?: boolean
  // Conditional display
  showIf?: {
    field: string
    operator: "equals" | "includes" | "notEquals" | "notEmpty" | "empty"
    value?: string | string[] | boolean
  }
  // Safety flags
  flagIf?: {
    value: string | string[] | boolean
    severity: "info" | "warning" | "knockout"
    message: string
  }[]
  // Validation
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
    message?: string
  }
}

export interface FlowSection {
  id: string
  title: string
  subtitle?: string
  emoji?: string
  questions: FlowQuestion[]
  // Conditional display
  showIf?: {
    field: string
    operator: "equals" | "includes" | "notEquals" | "notEmpty"
    value?: string | string[] | boolean
  }
}

export interface FlowConfig {
  id: string
  name: string
  sections: FlowSection[]
  safetySection?: FlowSection
}

// Evaluate a condition against form data
export function evaluateCondition(
  condition: FlowQuestion["showIf"] | FlowSection["showIf"],
  data: Record<string, any>,
): boolean {
  if (!condition) return true

  const { field, operator, value } = condition
  const fieldValue = data[field]

  switch (operator) {
    case "equals":
      return fieldValue === value
    case "notEquals":
      return fieldValue !== value
    case "includes":
      if (Array.isArray(fieldValue)) {
        return Array.isArray(value) ? value.some((v) => fieldValue.includes(v)) : fieldValue.includes(value)
      }
      return false
    case "notEmpty":
      return (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue !== "" &&
        (Array.isArray(fieldValue) ? fieldValue.length > 0 : true)
      )
    case "empty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      )
    default:
      return true
  }
}

// Check for safety flags in form data
export function checkSafetyFlags(
  config: FlowConfig,
  data: Record<string, any>,
): { severity: "info" | "warning" | "knockout"; message: string }[] {
  const flags: { severity: "info" | "warning" | "knockout"; message: string }[] = []

  const allQuestions = [...config.sections.flatMap((s) => s.questions), ...(config.safetySection?.questions || [])]

  for (const question of allQuestions) {
    if (!question.flagIf) continue

    const fieldValue = data[question.id]

    for (const flag of question.flagIf) {
      let triggered = false

      if (typeof flag.value === "boolean") {
        triggered = fieldValue === flag.value
      } else if (Array.isArray(flag.value)) {
        triggered = Array.isArray(fieldValue)
          ? flag.value.some((v) => fieldValue.includes(v))
          : flag.value.includes(fieldValue)
      } else {
        triggered = fieldValue === flag.value
      }

      if (triggered) {
        flags.push({ severity: flag.severity, message: flag.message })
      }
    }
  }

  return flags
}

// Get visible sections based on current form data
export function getVisibleSections(config: FlowConfig, data: Record<string, any>): FlowSection[] {
  return config.sections.filter((section) => evaluateCondition(section.showIf, data))
}

// Get visible questions within a section
export function getVisibleQuestions(section: FlowSection, data: Record<string, any>): FlowQuestion[] {
  return section.questions.filter((question) => evaluateCondition(question.showIf, data))
}

// Validate a single field
export function validateField(question: FlowQuestion, value: any): string | null {
  if (
    question.required &&
    (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))
  ) {
    return `${question.label} is required`
  }

  if (question.validation) {
    const { min, max, pattern, message } = question.validation

    if (typeof value === "string" && pattern && !pattern.test(value)) {
      return message || `Invalid ${question.label.toLowerCase()}`
    }

    if (typeof value === "number" || typeof value === "string") {
      const numValue = typeof value === "string" ? value.length : value
      if (min !== undefined && numValue < min) {
        return message || `${question.label} is too short`
      }
      if (max !== undefined && numValue > max) {
        return message || `${question.label} is too long`
      }
    }

    if (Array.isArray(value) && min !== undefined && value.length < min) {
      return message || `Select at least ${min} option${min > 1 ? "s" : ""}`
    }
  }

  return null
}

// Validate entire form
export function validateForm(config: FlowConfig, data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const section of getVisibleSections(config, data)) {
    for (const question of getVisibleQuestions(section, data)) {
      const error = validateField(question, data[question.id])
      if (error) {
        errors[question.id] = error
      }
    }
  }

  return errors
}

// Generate structured JSON summary for doctor dashboard
export function generateDoctorSummary(config: FlowConfig, data: Record<string, any>): Record<string, any> {
  const summary: Record<string, any> = {
    flowType: config.id,
    flowName: config.name,
    submittedAt: new Date().toISOString(),
    sections: {},
    safetyFlags: checkSafetyFlags(config, data),
  }

  for (const section of getVisibleSections(config, data)) {
    const sectionData: Record<string, any> = {}

    for (const question of getVisibleQuestions(section, data)) {
      const value = data[question.id]
      if (value !== undefined && value !== null && value !== "") {
        // Resolve option labels for single/multi select
        if (question.options && (question.type === "single" || question.type === "chips")) {
          if (Array.isArray(value)) {
            sectionData[question.label] = value.map((v) => question.options?.find((o) => o.id === v)?.label || v)
          } else {
            sectionData[question.label] = question.options.find((o) => o.id === value)?.label || value
          }
        } else {
          sectionData[question.label] = value
        }
      }
    }

    if (Object.keys(sectionData).length > 0) {
      summary.sections[section.title] = sectionData
    }
  }

  return summary
}
