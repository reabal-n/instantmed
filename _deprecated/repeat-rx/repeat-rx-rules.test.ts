import { describe, it, expect } from 'vitest'
import {
  checkEligibility,
  generateSuggestedDecision,
  isExcludedMedication,
  S8_OPIOIDS,
  S8_STIMULANTS,
  BENZODIAZEPINES,
  Z_DRUGS,
  CANNABIS_MEDICATIONS,
  TESTOSTERONE,
  MENTAL_HEALTH_MEDS,
} from '../repeat-rx/rules-engine'

// Helper to create mock medication selection
function createMedication(name: string, display?: string) {
  return {
    medication_id: 'test-med-id',
    medication_name: name,
    display: display || name,
    strength: '10mg',
    form: 'tablet',
    amt_code: 'AMT123456',
  }
}

// Helper to create mock intake answers - using unknown for flexibility in tests
function createIntakeAnswers(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stabilityDuration: '6_months_plus',
    doseChangedRecently: false,
    sideEffects: 'none',
    pregnantOrBreastfeeding: false,
    gpAttestationAccepted: true,
    lastPrescribedTimeframe: 'less_3_months',
    pmhxFlags: {
      heartDisease: false,
      kidneyDisease: false,
      liverDisease: false,
      diabetes: false,
      mentalHealthCondition: false,
      otherSignificant: false,
    },
    ...overrides,
  }
}

describe('Repeat Prescription Rules Engine', () => {
  // ============================================================================
  // EXCLUDED MEDICATION CATEGORIES
  // ============================================================================

  describe('S8 Opioid Exclusions', () => {
    const opioidSamples = [
      'oxycodone', 'morphine', 'fentanyl', 'hydromorphone',
      'methadone', 'buprenorphine', 'tramadol', 'codeine phosphate 30'
    ]

    for (const opioid of opioidSamples) {
      it(`should exclude ${opioid}`, () => {
        const med = createMedication(opioid)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('s8_opioid')
      })
    }

    it('should contain expected opioids in S8_OPIOIDS array', () => {
      expect(S8_OPIOIDS).toContain('oxycodone')
      expect(S8_OPIOIDS).toContain('morphine')
      expect(S8_OPIOIDS).toContain('fentanyl')
      expect(S8_OPIOIDS).toContain('tramadol')
      expect(S8_OPIOIDS.length).toBeGreaterThanOrEqual(12)
    })
  })

  describe('S8 Stimulant Exclusions', () => {
    const stimulantSamples = [
      'dexamphetamine', 'lisdexamfetamine', 'vyvanse',
      'methylphenidate', 'ritalin', 'concerta'
    ]

    for (const stimulant of stimulantSamples) {
      it(`should exclude ${stimulant}`, () => {
        const med = createMedication(stimulant)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('s8_stimulant')
      })
    }

    it('should contain expected stimulants in S8_STIMULANTS array', () => {
      expect(S8_STIMULANTS).toContain('dexamphetamine')
      expect(S8_STIMULANTS).toContain('vyvanse')
      expect(S8_STIMULANTS).toContain('ritalin')
      expect(S8_STIMULANTS.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('Benzodiazepine Exclusions', () => {
    const benzoSamples = [
      'alprazolam', 'xanax', 'diazepam', 'valium',
      'clonazepam', 'lorazepam', 'temazepam', 'oxazepam'
    ]

    for (const benzo of benzoSamples) {
      it(`should exclude ${benzo}`, () => {
        const med = createMedication(benzo)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('benzodiazepine')
      })
    }

    it('should contain expected benzos in BENZODIAZEPINES array', () => {
      expect(BENZODIAZEPINES).toContain('alprazolam')
      expect(BENZODIAZEPINES).toContain('diazepam')
      expect(BENZODIAZEPINES).toContain('temazepam')
      expect(BENZODIAZEPINES.length).toBeGreaterThanOrEqual(14)
    })
  })

  describe('Z-Drug Exclusions', () => {
    const zDrugSamples = ['zolpidem', 'stilnox', 'zopiclone', 'imovane']

    for (const zDrug of zDrugSamples) {
      it(`should exclude ${zDrug}`, () => {
        const med = createMedication(zDrug)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('z_drug')
      })
    }

    it('should contain expected Z-drugs in Z_DRUGS array', () => {
      expect(Z_DRUGS).toContain('zolpidem')
      expect(Z_DRUGS).toContain('zopiclone')
      expect(Z_DRUGS.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Cannabis Medication Exclusions', () => {
    const cannabisSamples = ['cannabis', 'thc', 'cbd oil', 'sativex']

    for (const cannabis of cannabisSamples) {
      it(`should exclude ${cannabis}`, () => {
        const med = createMedication(cannabis)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('cannabis')
      })
    }

    it('should contain expected cannabis meds in CANNABIS_MEDICATIONS array', () => {
      expect(CANNABIS_MEDICATIONS).toContain('cannabis')
      expect(CANNABIS_MEDICATIONS).toContain('sativex')
      expect(CANNABIS_MEDICATIONS.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Testosterone/TRT Exclusions', () => {
    const testosteroneSamples = [
      'testosterone', 'testogel', 'primoteston', 'sustanon', 'reandron'
    ]

    for (const trt of testosteroneSamples) {
      it(`should exclude ${trt}`, () => {
        const med = createMedication(trt)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('testosterone')
      })
    }

    it('should contain expected TRT meds in TESTOSTERONE array', () => {
      expect(TESTOSTERONE).toContain('testosterone')
      expect(TESTOSTERONE).toContain('sustanon')
      expect(TESTOSTERONE.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('Mental Health Medication Exclusions', () => {
    const mentalHealthSamples = [
      'olanzapine', 'quetiapine', 'risperidone', 'aripiprazole',
      'clozapine', 'lithium', 'valproate'
    ]

    for (const mh of mentalHealthSamples) {
      it(`should exclude ${mh}`, () => {
        const med = createMedication(mh)
        const result = isExcludedMedication(med)
        expect(result).not.toBeNull()
        expect(result?.category).toBe('mental_health')
      })
    }

    it('should contain expected mental health meds in MENTAL_HEALTH_MEDS array', () => {
      expect(MENTAL_HEALTH_MEDS).toContain('olanzapine')
      expect(MENTAL_HEALTH_MEDS).toContain('lithium')
      expect(MENTAL_HEALTH_MEDS.length).toBeGreaterThanOrEqual(15)
    })
  })

  describe('Non-excluded Medications', () => {
    const allowedMeds = [
      'metformin', 'atorvastatin', 'paracetamol', 'ibuprofen',
      'amoxicillin', 'omeprazole', 'losartan', 'amlodipine'
    ]

    for (const med of allowedMeds) {
      it(`should allow ${med}`, () => {
        const medication = createMedication(med)
        const result = isExcludedMedication(medication)
        expect(result).toBeNull()
      })
    }
  })

  describe('Case Insensitivity', () => {
    it('should detect uppercase medication names', () => {
      const med = createMedication('OXYCODONE')
      const result = isExcludedMedication(med)
      expect(result).not.toBeNull()
    })

    it('should detect mixed case medication names', () => {
      const med = createMedication('OxyCodone')
      const result = isExcludedMedication(med)
      expect(result).not.toBeNull()
    })
  })

  // ============================================================================
  // ELIGIBILITY CHECKS
  // ============================================================================

  describe('checkEligibility', () => {
    describe('Excluded medication rejection', () => {
      it('should reject excluded medication with canProceed=false', () => {
        const med = createMedication('oxycodone')
        const answers = createIntakeAnswers()
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(false)
        expect(result.canProceed).toBe(false)
        expect(result.rejectionReason).toBe('excluded_medication')
      })

      it('should provide user-friendly rejection message', () => {
        const med = createMedication('diazepam')
        const answers = createIntakeAnswers()
        const result = checkEligibility(med, answers)

        expect(result.rejectionUserMessage).toBeDefined()
        expect(result.rejectionUserMessage).toContain('Benzo')
      })
    })

    describe('Stability duration check', () => {
      it('should pass for 6_months_plus stability', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ stabilityDuration: '6_months_plus' })
        const result = checkEligibility(med, answers)

        expect(result.ruleOutcomes.find(r => r.ruleId === 'stability_duration')?.passed).toBe(true)
      })

      it('should reject for less than 6 months stability', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ stabilityDuration: '3_to_6_months' })
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(false)
        expect(result.canProceed).toBe(true) // Can convert to consult
        expect(result.rejectionReason).toBe('insufficient_stability')
        expect(result.requiresConsult).toBe(true)
      })
    })

    describe('Dose change check', () => {
      it('should pass when dose not changed recently', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ doseChangedRecently: false })
        const result = checkEligibility(med, answers)

        expect(result.ruleOutcomes.find(r => r.ruleId === 'dose_changed')?.passed).toBe(true)
      })

      it('should reject when dose changed recently', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ doseChangedRecently: true })
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(false)
        expect(result.rejectionReason).toBe('dose_changed')
        expect(result.requiresConsult).toBe(true)
      })
    })

    describe('Side effects check', () => {
      it('should pass when no side effects', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ sideEffects: 'none' })
        const result = checkEligibility(med, answers)

        expect(result.ruleOutcomes.find(r => r.ruleId === 'side_effects')?.passed).toBe(true)
      })

      it('should reject with significant side effects', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({
          sideEffects: 'significant',
          sideEffectsDetails: 'Nausea and vomiting'
        })
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(false)
        expect(result.rejectionReason).toBe('side_effects_review_needed')
        expect(result.redFlags.some(f => f.code === 'SIGNIFICANT_SIDE_EFFECTS')).toBe(true)
      })
    })

    describe('Pregnancy/breastfeeding check', () => {
      it('should pass when not pregnant', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ pregnantOrBreastfeeding: false })
        const result = checkEligibility(med, answers)

        expect(result.ruleOutcomes.find(r => r.ruleId === 'pregnancy')?.passed).toBe(true)
      })

      it('should reject when pregnant/breastfeeding', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ pregnantOrBreastfeeding: true })
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(false)
        expect(result.rejectionReason).toBe('pregnancy_review_needed')
        expect(result.redFlags.some(f => f.code === 'PREGNANCY_BREASTFEEDING')).toBe(true)
      })
    })

    describe('GP attestation check', () => {
      it('should pass when GP attestation accepted', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ gpAttestationAccepted: true })
        const result = checkEligibility(med, answers)

        expect(result.ruleOutcomes.find(r => r.ruleId === 'gp_attestation')?.passed).toBe(true)
      })

      it('should reject when GP attestation not accepted', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ gpAttestationAccepted: false })
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(false)
        expect(result.rejectionReason).toBe('gp_attestation_required')
        expect(result.canProceed).toBe(false)
      })
    })

    describe('Last prescribed timeframe check', () => {
      it('should pass for recent prescription', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ lastPrescribedTimeframe: 'within_3_months' })
        const result = checkEligibility(med, answers)

        expect(result.ruleOutcomes.find(r => r.ruleId === 'last_prescribed')?.passed).toBe(true)
      })

      it('should add warning flag for over 12 months', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({ lastPrescribedTimeframe: 'over_12_months' })
        const result = checkEligibility(med, answers)

        expect(result.redFlags.some(f => f.code === 'PRESCRIPTION_GAP')).toBe(true)
      })
    })

    describe('Medical history flags', () => {
      it('should add cardiovascular flag', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({
          pmhxFlags: { heartDisease: true }
        })
        const result = checkEligibility(med, answers)

        expect(result.redFlags.some(f => f.code === 'CARDIOVASCULAR_CONDITION')).toBe(true)
      })

      it('should add renal flag', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({
          pmhxFlags: { kidneyDisease: true }
        })
        const result = checkEligibility(med, answers)

        expect(result.redFlags.some(f => f.code === 'RENAL_CONDITION')).toBe(true)
      })

      it('should add hepatic flag', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({
          pmhxFlags: { liverDisease: true }
        })
        const result = checkEligibility(med, answers)

        expect(result.redFlags.some(f => f.code === 'HEPATIC_CONDITION')).toBe(true)
      })

      it('should add diabetes flag', () => {
        const med = createMedication('atorvastatin')
        const answers = createIntakeAnswers({
          pmhxFlags: { diabetes: true }
        })
        const result = checkEligibility(med, answers)

        expect(result.redFlags.some(f => f.code === 'DIABETES')).toBe(true)
      })

      it('should add mental health flag', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers({
          pmhxFlags: { mentalHealthCondition: true }
        })
        const result = checkEligibility(med, answers)

        expect(result.redFlags.some(f => f.code === 'MENTAL_HEALTH_CONDITION')).toBe(true)
      })
    })

    describe('Clean eligibility', () => {
      it('should pass all checks for clean request', () => {
        const med = createMedication('metformin')
        const answers = createIntakeAnswers()
        const result = checkEligibility(med, answers)

        expect(result.passed).toBe(true)
        expect(result.canProceed).toBe(true)
        expect(result.redFlags).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // SUGGESTED DECISION
  // ============================================================================

  describe('generateSuggestedDecision', () => {
    it('should suggest decline for excluded medication', () => {
      const med = createMedication('oxycodone')
      const answers = createIntakeAnswers()
      const eligibility = checkEligibility(med, answers)
      const decision = generateSuggestedDecision(eligibility)

      expect(decision.recommendation).toBe('decline')
      expect(decision.suggestedRepeats).toBe(0)
    })

    it('should suggest consult when requires consult', () => {
      const med = createMedication('metformin')
      const answers = createIntakeAnswers({ pregnantOrBreastfeeding: true })
      const eligibility = checkEligibility(med, answers)
      const decision = generateSuggestedDecision(eligibility)

      expect(decision.recommendation).toBe('consult')
      expect(decision.suggestedRepeats).toBe(0)
    })

    it('should suggest approve with 0 repeats when warning flags present', () => {
      const med = createMedication('metformin')
      const answers = createIntakeAnswers({
        pmhxFlags: { heartDisease: true }
      })
      const eligibility = checkEligibility(med, answers)
      const decision = generateSuggestedDecision(eligibility)

      expect(decision.recommendation).toBe('approve')
      expect(decision.suggestedRepeats).toBe(0)
      expect(decision.reasoning).toContain('warning')
    })

    it('should suggest approve with 1 repeat for clean request', () => {
      const med = createMedication('metformin')
      const answers = createIntakeAnswers()
      const eligibility = checkEligibility(med, answers)
      const decision = generateSuggestedDecision(eligibility)

      expect(decision.recommendation).toBe('approve')
      expect(decision.suggestedRepeats).toBe(1)
      expect(decision.reasoning).toContain('All eligibility criteria met')
    })
  })
})
