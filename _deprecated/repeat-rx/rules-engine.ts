/**
 * Repeat Prescription Rules Engine
 * Server-side eligibility validation for audit-safe repeat prescriptions
 * 
 * Policy:
 * - Exclude S8, opioids, benzos, stimulants, cannabis, TRT/testosterone, mental-health meds
 * - Enforce stable ≥6 months
 * - Max 1 repeat
 * - Auto-flag red flags to require clinician call
 */

import type {
  MedicationSelection as MedicationSelectionType,
  RepeatRxIntakeAnswers as RepeatRxIntakeAnswersType,
  EligibilityResult as EligibilityResultType,
  RedFlag as RedFlagType,
  RuleOutcome as RuleOutcomeType,
  ExcludedCategory as ExcludedCategoryType,
} from "@/types/repeat-rx"

// Re-export types for use in this file
type MedicationSelection = MedicationSelectionType
type RepeatRxIntakeAnswers = RepeatRxIntakeAnswersType
type EligibilityResult = EligibilityResultType
type RedFlag = RedFlagType
type RuleOutcome = RuleOutcomeType
type ExcludedCategory = ExcludedCategoryType

// ============================================================================
// EXCLUDED MEDICATIONS
// ============================================================================

// S8 Opioids
const S8_OPIOIDS = [
  "oxycodone", "oxycontin", "endone", "targin",
  "morphine", "ms contin", "kapanol", "sevredol",
  "fentanyl", "durogesic", "abstral", "actiq",
  "hydromorphone", "dilaudid", "jurnista",
  "methadone", "physeptone", "biodone",
  "buprenorphine", "suboxone", "subutex", "temgesic",
  "codeine phosphate 30", "codeine phosphate 60", // High-strength codeine
  "tramadol", // While S4, treated as restricted
]

// S8 Stimulants (ADHD medications)
const S8_STIMULANTS = [
  "dexamphetamine", "dexedrine", "aspen dexamfetamine",
  "lisdexamfetamine", "vyvanse",
  "methylphenidate", "ritalin", "concerta", "ritalin la",
]

// Benzodiazepines
const BENZODIAZEPINES = [
  "alprazolam", "xanax", "kalma",
  "diazepam", "valium", "antenex",
  "clonazepam", "rivotril", "paxam",
  "lorazepam", "ativan",
  "oxazepam", "serepax", "murelax",
  "temazepam", "temaze", "normison", "temtabs",
  "nitrazepam", "mogadon", "alodorm",
  "bromazepam", "lexotan",
  "clobazam", "frisium",
  "flunitrazepam", // Rohypnol
]

// Z-drugs (hypnotics)
const Z_DRUGS = [
  "zolpidem", "stilnox", "stilnoct",
  "zopiclone", "imovane", "imrest",
  "eszopiclone",
]

// Cannabis-based medicines
const CANNABIS_MEDICATIONS = [
  "cannabis", "thc", "cbd oil", "cannabidiol",
  "dronabinol", "marinol", "syndros",
  "nabilone", "cesamet",
  "nabiximols", "sativex",
]

// Testosterone/TRT
const TESTOSTERONE = [
  "testosterone", "androderm", "axiron", "testogel",
  "primoteston", "sustanon", "reandron",
  "andriol", "striant",
]

// Mental health medications (require specialist/GP relationship)
const MENTAL_HEALTH_MEDS = [
  // Antipsychotics
  "olanzapine", "zyprexa",
  "quetiapine", "seroquel",
  "risperidone", "risperdal",
  "aripiprazole", "abilify",
  "clozapine", "clozaril",
  "haloperidol", "serenace",
  "paliperidone", "invega",
  "ziprasidone", "zeldox",
  "amisulpride", "solian",
  "lurasidone", "latuda",
  // Mood stabilizers
  "lithium", "lithicarb", "quilonum",
  "valproate", "epilim", "valpro",
  "carbamazepine", "tegretol", // When used for bipolar
  "lamotrigine", "lamictal", // When used for bipolar
]

// Category mapping for clear rejection messages
const MEDICATION_CATEGORIES: Record<string, ExcludedCategory> = {}

// Build category map
S8_OPIOIDS.forEach(m => MEDICATION_CATEGORIES[m] = "s8_opioid")
S8_STIMULANTS.forEach(m => MEDICATION_CATEGORIES[m] = "s8_stimulant")
BENZODIAZEPINES.forEach(m => MEDICATION_CATEGORIES[m] = "benzodiazepine")
Z_DRUGS.forEach(m => MEDICATION_CATEGORIES[m] = "z_drug")
CANNABIS_MEDICATIONS.forEach(m => MEDICATION_CATEGORIES[m] = "cannabis")
TESTOSTERONE.forEach(m => MEDICATION_CATEGORIES[m] = "testosterone")
MENTAL_HEALTH_MEDS.forEach(m => MEDICATION_CATEGORIES[m] = "mental_health")

// ============================================================================
// REJECTION MESSAGES
// ============================================================================

const REJECTION_MESSAGES: Record<ExcludedCategory, { user: string; clinician: string }> = {
  s8_opioid: {
    user: "Schedule 8 opioid medications require an in-person consultation with your regular prescriber. We can't provide these via telehealth repeat prescriptions.",
    clinician: "S8 opioid - excluded per telehealth policy. Requires established prescriber relationship.",
  },
  s8_stimulant: {
    user: "ADHD stimulant medications require ongoing care with your specialist or GP. We recommend booking a consultation with your regular prescriber.",
    clinician: "S8 stimulant (ADHD) - excluded per telehealth policy. Requires specialist oversight.",
  },
  benzodiazepine: {
    user: "Benzodiazepines require careful monitoring and aren't available through our repeat prescription service. Please see your regular GP for these medications.",
    clinician: "Benzodiazepine - excluded per telehealth policy. Risk of dependence requires prescriber relationship.",
  },
  z_drug: {
    user: "Sleep medications like this require a consultation to discuss sleep hygiene and alternatives. We can help with a General Consult instead.",
    clinician: "Z-drug hypnotic - excluded per telehealth policy. Requires sleep assessment.",
  },
  cannabis: {
    user: "Medicinal cannabis requires authorisation from a TGA-approved prescriber. We don't currently offer this service.",
    clinician: "Cannabis medicine - excluded. Requires TGA Special Access Scheme or Authorised Prescriber.",
  },
  testosterone: {
    user: "Testosterone therapy requires regular monitoring and isn't available through our repeat service. Please continue with your prescribing specialist.",
    clinician: "Testosterone/TRT - excluded. Requires endocrine monitoring and specialist oversight.",
  },
  mental_health: {
    user: "This medication requires ongoing mental health care. We recommend a General Consult or continuing with your treating psychiatrist/GP.",
    clinician: "Antipsychotic/mood stabilizer - excluded. Requires mental health treatment relationship.",
  },
}

// ============================================================================
// RULE FUNCTIONS
// ============================================================================

/**
 * Check if medication is in excluded category
 */
function checkExcludedMedication(medication: MedicationSelection): RuleOutcome {
  const lowerDisplay = medication.display.toLowerCase()
  const lowerName = medication.medication_name.toLowerCase()
  
  for (const [term, category] of Object.entries(MEDICATION_CATEGORIES)) {
    if (lowerDisplay.includes(term) || lowerName.includes(term)) {
      return {
        ruleId: "excluded_medication",
        ruleName: "Excluded Medication Category",
        passed: false,
        reason: REJECTION_MESSAGES[category].clinician,
      }
    }
  }
  
  return {
    ruleId: "excluded_medication",
    ruleName: "Excluded Medication Category",
    passed: true,
  }
}

/**
 * Get excluded category for user messaging
 */
function getExcludedCategory(medication: MedicationSelection): ExcludedCategory | null {
  const lowerDisplay = medication.display.toLowerCase()
  const lowerName = medication.medication_name.toLowerCase()
  
  for (const [term, category] of Object.entries(MEDICATION_CATEGORIES)) {
    if (lowerDisplay.includes(term) || lowerName.includes(term)) {
      return category
    }
  }
  
  return null
}

/**
 * Check stability duration (must be ≥6 months)
 */
function checkStabilityDuration(answers: Partial<RepeatRxIntakeAnswers>): RuleOutcome {
  const duration = answers.stabilityDuration
  
  if (!duration) {
    return {
      ruleId: "stability_duration",
      ruleName: "Medication Stability",
      passed: false,
      reason: "Stability duration not provided",
    }
  }
  
  if (duration === "6_months_plus") {
    return {
      ruleId: "stability_duration",
      ruleName: "Medication Stability",
      passed: true,
    }
  }
  
  return {
    ruleId: "stability_duration",
    ruleName: "Medication Stability",
    passed: false,
    reason: `Patient reports stability of ${duration}. Policy requires ≥6 months stable on medication.`,
  }
}

/**
 * Check for recent dose changes
 */
function checkDoseChanges(answers: Partial<RepeatRxIntakeAnswers>): RuleOutcome {
  if (answers.doseChangedRecently === true) {
    return {
      ruleId: "dose_changed",
      ruleName: "Recent Dose Changes",
      passed: false,
      reason: "Patient reports recent dose change. Requires General Consult for dose adjustment assessment.",
    }
  }
  
  return {
    ruleId: "dose_changed",
    ruleName: "Recent Dose Changes",
    passed: true,
  }
}

/**
 * Check for significant side effects
 */
function checkSideEffects(answers: Partial<RepeatRxIntakeAnswers>): { outcome: RuleOutcome; redFlag?: RedFlag } {
  if (answers.sideEffects === "significant") {
    return {
      outcome: {
        ruleId: "side_effects",
        ruleName: "Side Effects Assessment",
        passed: false,
        reason: "Patient reports significant side effects",
      },
      redFlag: {
        code: "SIGNIFICANT_SIDE_EFFECTS",
        severity: "warning",
        description: "Patient reports significant side effects from medication",
        clinicianNote: `Side effects reported: ${answers.sideEffectsDetails || "No details provided"}. Consider brief consult to assess.`,
      },
    }
  }
  
  return {
    outcome: {
      ruleId: "side_effects",
      ruleName: "Side Effects Assessment",
      passed: true,
    },
  }
}

/**
 * Check pregnancy/breastfeeding status
 */
function checkPregnancy(answers: Partial<RepeatRxIntakeAnswers>): { outcome: RuleOutcome; redFlag?: RedFlag } {
  if (answers.pregnantOrBreastfeeding === true) {
    return {
      outcome: {
        ruleId: "pregnancy",
        ruleName: "Pregnancy/Breastfeeding Check",
        passed: false,
        reason: "Patient is pregnant or breastfeeding",
      },
      redFlag: {
        code: "PREGNANCY_BREASTFEEDING",
        severity: "critical",
        description: "Patient is pregnant or breastfeeding",
        clinicianNote: "Requires clinician review to assess medication safety in pregnancy/lactation.",
      },
    }
  }
  
  return {
    outcome: {
      ruleId: "pregnancy",
      ruleName: "Pregnancy/Breastfeeding Check",
      passed: true,
    },
  }
}

/**
 * Check for concerning medical history flags
 */
function checkMedicalHistory(answers: Partial<RepeatRxIntakeAnswers>): { outcome: RuleOutcome; redFlags: RedFlag[] } {
  const flags = answers.pmhxFlags
  const redFlags: RedFlag[] = []
  
  if (!flags) {
    return {
      outcome: {
        ruleId: "pmhx_flags",
        ruleName: "Medical History Screening",
        passed: true,
      },
      redFlags: [],
    }
  }
  
  // Check for cardiovascular conditions
  if (flags.heartDisease) {
    redFlags.push({
      code: "CARDIOVASCULAR_CONDITION",
      severity: "warning",
      description: "Patient reports heart disease or cardiovascular condition",
      clinicianNote: "Consider cardiovascular contraindications. Review medication interactions.",
    })
  }
  
  // Check for renal conditions
  if (flags.kidneyDisease) {
    redFlags.push({
      code: "RENAL_CONDITION",
      severity: "warning",
      description: "Patient reports kidney disease",
      clinicianNote: "Consider renal dosing adjustments. May need consult for dose verification.",
    })
  }
  
  // Check for hepatic conditions
  if (flags.liverDisease) {
    redFlags.push({
      code: "HEPATIC_CONDITION",
      severity: "warning",
      description: "Patient reports liver disease",
      clinicianNote: "Consider hepatic metabolism. May require dose adjustments.",
    })
  }
  
  // Check for diabetes
  if (flags.diabetes) {
    redFlags.push({
      code: "DIABETES",
      severity: "warning",
      description: "Patient reports diabetes",
      clinicianNote: "Consider glycemic effects. May need additional monitoring.",
    })
  }
  
  // Check for mental health condition
  if (flags.mentalHealthCondition) {
    redFlags.push({
      code: "MENTAL_HEALTH_CONDITION",
      severity: "warning",
      description: "Patient reports mental health condition",
      clinicianNote: "Consider interaction with mental health treatment. May need brief consult.",
    })
  }
  
  // Significant other conditions
  if (flags.otherSignificant && flags.otherDetails) {
    redFlags.push({
      code: "SIGNIFICANT_PMHx",
      severity: "warning",
      description: "Patient reports significant medical history",
      clinicianNote: `Other significant history: ${flags.otherDetails}`,
    })
  }
  
  return {
    outcome: {
      ruleId: "pmhx_flags",
      ruleName: "Medical History Screening",
      passed: redFlags.length === 0,
      reason: redFlags.length > 0 ? "Medical history flags require clinician review" : undefined,
    },
    redFlags,
  }
}

/**
 * Check GP attestation
 */
function checkGpAttestation(answers: Partial<RepeatRxIntakeAnswers>): RuleOutcome {
  if (answers.gpAttestationAccepted !== true) {
    return {
      ruleId: "gp_attestation",
      ruleName: "GP Follow-up Attestation",
      passed: false,
      reason: "Patient must attest to seeing their GP within 1-3 months",
    }
  }
  
  return {
    ruleId: "gp_attestation",
    ruleName: "GP Follow-up Attestation",
    passed: true,
  }
}

/**
 * Check last prescribed timeframe (should be recent)
 */
function checkLastPrescribed(answers: Partial<RepeatRxIntakeAnswers>): { outcome: RuleOutcome; redFlag?: RedFlag } {
  const timeframe = answers.lastPrescribedTimeframe
  
  if (timeframe === "over_12_months") {
    return {
      outcome: {
        ruleId: "last_prescribed",
        ruleName: "Prescription Recency",
        passed: false,
        reason: "Last prescription was over 12 months ago",
      },
      redFlag: {
        code: "PRESCRIPTION_GAP",
        severity: "warning",
        description: "Gap of >12 months since last prescription",
        clinicianNote: "Patient reports last prescription was over 12 months ago. May need General Consult to re-establish.",
      },
    }
  }
  
  return {
    outcome: {
      ruleId: "last_prescribed",
      ruleName: "Prescription Recency",
      passed: true,
    },
  }
}

// ============================================================================
// MAIN ELIGIBILITY CHECK
// ============================================================================

export function checkEligibility(
  medication: MedicationSelection,
  answers: Partial<RepeatRxIntakeAnswers>
): EligibilityResult {
  const ruleOutcomes: RuleOutcome[] = []
  const redFlags: RedFlag[] = []
  
  // 1. Check excluded medication categories (hard rejection)
  const excludedCheck = checkExcludedMedication(medication)
  ruleOutcomes.push(excludedCheck)
  
  if (!excludedCheck.passed) {
    const category = getExcludedCategory(medication)
    const messages = category ? REJECTION_MESSAGES[category] : {
      user: "This medication isn't available through our repeat prescription service.",
      clinician: "Medication excluded per policy.",
    }
    
    return {
      passed: false,
      canProceed: false, // Hard rejection
      rejectionReason: "excluded_medication",
      rejectionUserMessage: messages.user,
      rejectionClinicianReason: messages.clinician,
      redFlags: [],
      requiresConsult: false,
      ruleOutcomes,
    }
  }
  
  // 2. Check stability duration
  const stabilityCheck = checkStabilityDuration(answers)
  ruleOutcomes.push(stabilityCheck)
  
  if (!stabilityCheck.passed) {
    return {
      passed: false,
      canProceed: true, // Can convert to consult
      rejectionReason: "insufficient_stability",
      rejectionUserMessage: "This medication needs to be stable for at least 6 months for a repeat prescription. We can help with a General Consult instead.",
      rejectionClinicianReason: stabilityCheck.reason,
      redFlags: [],
      requiresConsult: true,
      ruleOutcomes,
    }
  }
  
  // 3. Check dose changes
  const doseCheck = checkDoseChanges(answers)
  ruleOutcomes.push(doseCheck)
  
  if (!doseCheck.passed) {
    return {
      passed: false,
      canProceed: true,
      rejectionReason: "dose_changed",
      rejectionUserMessage: "Since your dose has changed recently, you'll need a General Consult to ensure the new dose is working well for you.",
      rejectionClinicianReason: doseCheck.reason,
      redFlags: [],
      requiresConsult: true,
      ruleOutcomes,
    }
  }
  
  // 4. Check last prescribed
  const lastPrescribedCheck = checkLastPrescribed(answers)
  ruleOutcomes.push(lastPrescribedCheck.outcome)
  if (lastPrescribedCheck.redFlag) {
    redFlags.push(lastPrescribedCheck.redFlag)
  }
  
  // 5. Check side effects
  const sideEffectsCheck = checkSideEffects(answers)
  ruleOutcomes.push(sideEffectsCheck.outcome)
  if (sideEffectsCheck.redFlag) {
    redFlags.push(sideEffectsCheck.redFlag)
  }
  
  // 6. Check pregnancy/breastfeeding
  const pregnancyCheck = checkPregnancy(answers)
  ruleOutcomes.push(pregnancyCheck.outcome)
  if (pregnancyCheck.redFlag) {
    redFlags.push(pregnancyCheck.redFlag)
  }
  
  // 7. Check medical history
  const pmhxCheck = checkMedicalHistory(answers)
  ruleOutcomes.push(pmhxCheck.outcome)
  redFlags.push(...pmhxCheck.redFlags)
  
  // 8. Check GP attestation
  const gpCheck = checkGpAttestation(answers)
  ruleOutcomes.push(gpCheck)
  
  if (!gpCheck.passed) {
    return {
      passed: false,
      canProceed: false,
      rejectionReason: "gp_attestation_required",
      rejectionUserMessage: "You must confirm you'll see your regular GP within 1-3 months for ongoing care.",
      rejectionClinicianReason: "GP attestation not accepted",
      redFlags: [],
      requiresConsult: false,
      ruleOutcomes,
    }
  }
  
  // Check if any critical red flags require consult
  const hasCriticalFlags = redFlags.some(f => f.severity === "critical")
  const requiresConsult = hasCriticalFlags
  
  // If side effects are significant, require consult
  if (!sideEffectsCheck.outcome.passed) {
    return {
      passed: false,
      canProceed: true,
      rejectionReason: "side_effects_review_needed",
      rejectionUserMessage: "Since you're experiencing significant side effects, we recommend a brief consult with one of our doctors to review your medication.",
      rejectionClinicianReason: "Significant side effects reported - requires clinician review",
      redFlags,
      requiresConsult: true,
      ruleOutcomes,
    }
  }
  
  // If pregnancy/breastfeeding, require consult
  if (!pregnancyCheck.outcome.passed) {
    return {
      passed: false,
      canProceed: true,
      rejectionReason: "pregnancy_review_needed",
      rejectionUserMessage: "We need to review this medication's safety during pregnancy or breastfeeding. A brief consult is required.",
      rejectionClinicianReason: "Pregnancy/breastfeeding - medication safety review required",
      redFlags,
      requiresConsult: true,
      ruleOutcomes,
    }
  }
  
  // All rules passed
  return {
    passed: true,
    canProceed: true,
    redFlags,
    requiresConsult,
    ruleOutcomes,
  }
}

// ============================================================================
// SUGGESTED DECISION
// ============================================================================

export function generateSuggestedDecision(eligibility: EligibilityResult): {
  recommendation: "approve" | "decline" | "consult"
  reasoning: string
  suggestedRepeats: number
} {
  if (!eligibility.passed) {
    if (eligibility.requiresConsult) {
      return {
        recommendation: "consult",
        reasoning: eligibility.rejectionClinicianReason || "Clinical review required before approval",
        suggestedRepeats: 0,
      }
    }
    return {
      recommendation: "decline",
      reasoning: eligibility.rejectionClinicianReason || "Does not meet repeat prescription criteria",
      suggestedRepeats: 0,
    }
  }
  
  if (eligibility.redFlags.length > 0) {
    const criticalFlags = eligibility.redFlags.filter(f => f.severity === "critical")
    if (criticalFlags.length > 0) {
      return {
        recommendation: "consult",
        reasoning: `Critical flags present: ${criticalFlags.map(f => f.description).join(", ")}`,
        suggestedRepeats: 0,
      }
    }
    
    // Warning flags - can approve with review
    return {
      recommendation: "approve",
      reasoning: `Eligible with warnings: ${eligibility.redFlags.map(f => f.description).join(", ")}. Review recommended.`,
      suggestedRepeats: 0, // Conservative - no repeats when flags present
    }
  }
  
  // Clean eligibility
  return {
    recommendation: "approve",
    reasoning: "All eligibility criteria met. Stable medication with no red flags.",
    suggestedRepeats: 1, // Policy allows up to 1 repeat for clean requests
  }
}

/**
 * Public helper to check if a medication is in an excluded category
 * Returns the category if excluded, null otherwise
 */
export function isExcludedMedication(medication: MedicationSelection): { category: ExcludedCategory } | null {
  const category = getExcludedCategory(medication)
  if (category) {
    return { category }
  }
  return null
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  S8_OPIOIDS,
  S8_STIMULANTS,
  BENZODIAZEPINES,
  Z_DRUGS,
  CANNABIS_MEDICATIONS,
  TESTOSTERONE,
  MENTAL_HEALTH_MEDS,
  MEDICATION_CATEGORIES,
  REJECTION_MESSAGES,
}
