import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getDefaultModel } from "@/lib/ai/provider"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"

export const runtime = "edge"

/**
 * Smart Form Validation API
 * 
 * Uses AI to check for inconsistencies and missing information
 * that might cause rejection before submission.
 */

interface ValidationRequest {
  formType: "med_cert" | "repeat_rx" | "consult"
  formData: Record<string, unknown>
}

interface ValidationIssue {
  field: string
  severity: "error" | "warning" | "info"
  message: string
  suggestion?: string
}

interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  summary: string
}

// Rule-based validation for known issues
function runRuleBasedValidation(
  formType: string,
  formData: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (formType === "med_cert") {
    // Check Medicare number format
    const medicareNumber = String(formData.medicareNumber || "").replace(/\s/g, "")
    if (medicareNumber && medicareNumber.length !== 10) {
      issues.push({
        field: "medicareNumber",
        severity: "error",
        message: "Medicare number must be 10 digits",
        suggestion: "Check your Medicare card and enter all 10 digits",
      })
    }

    // Check Medicare IRN
    const irn = formData.medicareIrn
    if (!irn || (typeof irn === "string" && !irn.trim())) {
      issues.push({
        field: "medicareIrn",
        severity: "error",
        message: "Medicare IRN is required for certificate validation",
        suggestion: "Enter the number (1-9) next to your name on your Medicare card",
      })
    }

    // Check date of birth
    if (!formData.dateOfBirth) {
      issues.push({
        field: "dateOfBirth",
        severity: "error",
        message: "Date of birth is required for Medicare verification",
        suggestion: "Enter your date of birth as shown on your Medicare card",
      })
    }

    // Duration vs symptom description length check
    const duration = formData.duration as string
    const symptomDescription = String(formData.symptomDescription || "")
    const _selectedSymptoms = (formData.selectedSymptoms as string[]) || []
    
    // Extended leave (>3 days) should have more detailed description
    if (["4-7", "1-2weeks", "specific"].includes(duration)) {
      if (symptomDescription.length < 30) {
        issues.push({
          field: "symptomDescription",
          severity: "warning",
          message: "Extended leave requests typically need more detail",
          suggestion: "Consider adding more information about your symptoms to support a longer certificate",
        })
      }
    }

    // Short duration with severe-sounding symptoms
    const severeKeywords = ["severe", "extreme", "unbearable", "emergency", "hospital", "urgent"]
    const hasSevereKeywords = severeKeywords.some(kw => 
      symptomDescription.toLowerCase().includes(kw)
    )
    if (duration === "1" && hasSevereKeywords) {
      issues.push({
        field: "duration",
        severity: "warning",
        message: "Your symptoms sound significant for just 1 day off",
        suggestion: "Consider if you might need more time to recover. The doctor will review your request.",
      })
    }

    // Carer certificate checks
    if (formData.certType === "carer") {
      if (!formData.carerPatientName) {
        issues.push({
          field: "carerPatientName",
          severity: "error",
          message: "Name of person being cared for is required",
          suggestion: "Enter the full name of the person you're caring for",
        })
      }
      if (!formData.carerRelationship) {
        issues.push({
          field: "carerRelationship",
          severity: "error",
          message: "Relationship to the person is required",
          suggestion: "Select your relationship (e.g., parent, spouse, child)",
        })
      }
    }

    // Check for address (required for certificates)
    if (!formData.addressLine1 || !formData.suburb || !formData.state || !formData.postcode) {
      issues.push({
        field: "address",
        severity: "warning",
        message: "Complete address helps with certificate delivery",
        suggestion: "Enter your full address for the certificate",
      })
    }

  } else if (formType === "repeat_rx") {
    // Medication selection check
    if (!formData.medication) {
      issues.push({
        field: "medication",
        severity: "error",
        message: "Medication name is required",
        suggestion: "Search and select the medication you need renewed",
      })
    }

    // Indication/reason check
    const indication = String(formData.indication || "")
    if (indication.length < 10) {
      issues.push({
        field: "indication",
        severity: "error",
        message: "Please describe why you take this medication",
        suggestion: "Enter the condition or reason you were prescribed this medication",
      })
    }

    // Current dose check
    if (!formData.currentDose) {
      issues.push({
        field: "currentDose",
        severity: "error",
        message: "Current dosage is required",
        suggestion: "Enter your current dose (e.g., '1 tablet daily', '500mg twice daily')",
      })
    }

    // Prescriber check
    if (!formData.prescriber || String(formData.prescriber).length < 3) {
      issues.push({
        field: "prescriber",
        severity: "warning",
        message: "Original prescriber name helps verify your history",
        suggestion: "Enter the name of the doctor who originally prescribed this",
      })
    }

    // Stability duration check
    if (!formData.stability) {
      issues.push({
        field: "stability",
        severity: "warning",
        message: "How long you've been on this dose helps the doctor",
        suggestion: "Select how long you've been on your current dose",
      })
    }

    // IHI for eScript check (if available in form)
    if (formData.requiresEscript && !formData.ihiNumber) {
      issues.push({
        field: "ihiNumber",
        severity: "warning",
        message: "IHI number enables electronic prescriptions",
        suggestion: "Your IHI (Individual Healthcare Identifier) allows secure e-prescriptions",
      })
    }
  }

  return issues
}

export async function POST(req: NextRequest) {
  try {
    // P1 FIX: Add rate limiting for Edge endpoint (IP-based for unauthenticated)
    const clientId = getClientIdentifier(req)
    const rateLimitResponse = await applyRateLimit(req, "standard", clientId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: ValidationRequest = await req.json()
    const { formType, formData } = body

    if (!formType || !formData) {
      return NextResponse.json({ error: "Missing form type or data" }, { status: 400 })
    }

    // Run rule-based validation first
    const ruleIssues = runRuleBasedValidation(formType, formData)

    // If there are critical errors, return immediately
    const hasErrors = ruleIssues.some(i => i.severity === "error")
    if (hasErrors) {
      return NextResponse.json({
        isValid: false,
        issues: ruleIssues,
        summary: `${ruleIssues.filter(i => i.severity === "error").length} issue(s) need attention before submitting.`,
      } as ValidationResult)
    }

    // Use AI for deeper inconsistency analysis
    let aiIssues: ValidationIssue[] = []
    
    try {
      const formSummary = JSON.stringify(formData, null, 2)
      
      const prompt = `You are a medical intake form validator. Analyze this ${formType} form submission for potential inconsistencies or issues that might cause the request to be rejected by a doctor.

Form Data:
${formSummary}

Check for:
1. Symptom description vs duration mismatch (mild symptoms with long leave, severe symptoms with short leave)
2. Logical inconsistencies in the information provided
3. Missing context that might be helpful
4. Any red flags that need attention

Return a JSON array of issues found. Each issue should have:
- field: the field name with the issue
- severity: "warning" or "info" (not "error" - rule-based checks handle those)
- message: brief description of the issue
- suggestion: helpful suggestion to resolve it

If no issues found, return an empty array [].
Return ONLY the JSON array, nothing else.`

      const { text } = await generateText({
        model: getDefaultModel(),
        prompt,
      })

      // Parse AI response
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      const parsed = JSON.parse(cleaned)
      
      if (Array.isArray(parsed)) {
        aiIssues = parsed.filter((i): i is ValidationIssue => 
          i && typeof i === "object" && i.field && i.message
        ).map(i => ({
          ...i,
          severity: i.severity === "error" ? "warning" : i.severity, // Downgrade AI errors to warnings
        }))
      }
    } catch {
      // AI validation failed, continue with rule-based results only
    }

    // Combine all issues
    const allIssues = [...ruleIssues, ...aiIssues]
    const errorCount = allIssues.filter(i => i.severity === "error").length
    const warningCount = allIssues.filter(i => i.severity === "warning").length

    let summary = ""
    if (allIssues.length === 0) {
      summary = "Everything looks good! Ready to submit."
    } else if (errorCount > 0) {
      summary = `${errorCount} issue(s) need to be fixed before submitting.`
    } else if (warningCount > 0) {
      summary = `${warningCount} suggestion(s) to improve your request.`
    } else {
      summary = "Some optional improvements available."
    }

    return NextResponse.json({
      isValid: errorCount === 0,
      issues: allIssues,
      summary,
    } as ValidationResult)
  } catch (_error) {
    // P1 FIX: Fail-closed instead of fail-open
    // Previously returned isValid: true on error, which could let invalid forms through
    return NextResponse.json(
      { error: "Validation failed", isValid: false, issues: [], summary: "Unable to validate - please try again" },
      { status: 500 }
    )
  }
}
