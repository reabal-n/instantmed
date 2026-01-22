import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkEmergencySymptoms,
  checkRedFlagPatterns,
  checkAsyncBlocked,
  checkAutoReject,
  evaluateTriage,
  validateClinicianDecision,
  applyFinalSafetyRule,
} from '../clinical/triage-rules-engine'
import type { ClinicalFlag } from '../clinical/triage-types'

describe('Triage Rules Engine', () => {
  // ============================================================================
  // EMERGENCY SYMPTOM DETECTION
  // ============================================================================

  describe('checkEmergencySymptoms', () => {
    describe('Chest/Cardiac emergencies', () => {
      it('should detect "chest pain"', () => {
        const result = checkEmergencySymptoms('I have chest pain')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('chest pain')
      })

      it('should detect "heart attack"', () => {
        const result = checkEmergencySymptoms('I think I am having a heart attack')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('heart attack')
      })

      it('should detect "chest tightness"', () => {
        const result = checkEmergencySymptoms('Experiencing chest tightness')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('chest tightness')
      })

      it('should detect "crushing chest"', () => {
        const result = checkEmergencySymptoms('Crushing chest feeling')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('crushing chest')
      })
    })

    describe('Breathing emergencies', () => {
      it('should detect "can\'t breathe"', () => {
        const result = checkEmergencySymptoms("I can't breathe")
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain("can't breathe")
      })

      it('should detect "cant breathe" (no apostrophe)', () => {
        const result = checkEmergencySymptoms('I cant breathe')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('cant breathe')
      })

      it('should detect "shortness of breath"', () => {
        const result = checkEmergencySymptoms('Severe shortness of breath')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('shortness of breath')
      })

      it('should detect "gasping for air"', () => {
        const result = checkEmergencySymptoms('I am gasping for air')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('gasping for air')
      })
    })

    describe('Stroke symptoms', () => {
      it('should detect "stroke"', () => {
        const result = checkEmergencySymptoms('I think I am having a stroke')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('stroke')
      })

      it('should detect "facial droop"', () => {
        const result = checkEmergencySymptoms('My face is drooping - facial droop')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('facial droop')
      })

      it('should detect "slurred speech"', () => {
        const result = checkEmergencySymptoms('Having slurred speech suddenly')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('slurred speech')
      })

      it('should detect "sudden weakness"', () => {
        const result = checkEmergencySymptoms('Sudden weakness on one side')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('sudden weakness')
      })
    })

    describe('Mental health emergencies', () => {
      it('should detect "suicidal"', () => {
        const result = checkEmergencySymptoms('Feeling suicidal')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('suicidal')
      })

      it('should detect "want to die"', () => {
        const result = checkEmergencySymptoms('I want to die')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('want to die')
      })

      it('should detect "kill myself"', () => {
        const result = checkEmergencySymptoms('Thoughts of kill myself')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('kill myself')
      })

      it('should detect "self harm"', () => {
        const result = checkEmergencySymptoms('Engaging in self harm')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('self harm')
      })

      it('should detect "overdose"', () => {
        const result = checkEmergencySymptoms('I took an overdose')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('overdose')
      })
    })

    describe('Allergic reaction emergencies', () => {
      it('should detect "anaphylaxis"', () => {
        const result = checkEmergencySymptoms('Having anaphylaxis')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('anaphylaxis')
      })

      it('should detect "throat closing"', () => {
        const result = checkEmergencySymptoms('My throat closing up')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('throat closing')
      })

      it('should detect "tongue swelling"', () => {
        const result = checkEmergencySymptoms('My tongue swelling rapidly')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('tongue swelling')
      })
    })

    describe('Trauma emergencies', () => {
      it('should detect "severe bleeding"', () => {
        const result = checkEmergencySymptoms('Severe bleeding from wound')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('severe bleeding')
      })

      it('should detect "head injury"', () => {
        const result = checkEmergencySymptoms('I have a head injury')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('head injury')
      })

      it('should detect "choking"', () => {
        const result = checkEmergencySymptoms('Someone is choking')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('choking')
      })
    })

    describe('Case insensitivity', () => {
      it('should detect uppercase text', () => {
        const result = checkEmergencySymptoms('CHEST PAIN')
        expect(result.isEmergency).toBe(true)
      })

      it('should detect mixed case text', () => {
        const result = checkEmergencySymptoms('Chest Pain')
        expect(result.isEmergency).toBe(true)
      })
    })

    describe('Non-emergency cases', () => {
      it('should not flag routine symptoms', () => {
        const result = checkEmergencySymptoms('I have a mild headache')
        expect(result.isEmergency).toBe(false)
        expect(result.matchedKeywords).toHaveLength(0)
      })

      it('should not flag common illnesses', () => {
        const result = checkEmergencySymptoms('I have a cold and runny nose')
        expect(result.isEmergency).toBe(false)
      })

      it('should handle empty string', () => {
        const result = checkEmergencySymptoms('')
        expect(result.isEmergency).toBe(false)
        expect(result.matchedKeywords).toHaveLength(0)
      })
    })

    describe('Multiple keyword detection', () => {
      it('should detect multiple emergency keywords', () => {
        const result = checkEmergencySymptoms('I have chest pain and can\'t breathe')
        expect(result.isEmergency).toBe(true)
        expect(result.matchedKeywords).toContain('chest pain')
        expect(result.matchedKeywords).toContain("can't breathe")
      })
    })
  })

  // ============================================================================
  // RED FLAG PATTERN DETECTION
  // ============================================================================

  describe('checkRedFlagPatterns', () => {
    describe('Cardiovascular red flags', () => {
      it('should detect chest pain pattern', () => {
        const flags = checkRedFlagPatterns('I have chest pain')
        expect(flags.some(f => f.code === 'RF_CHEST_PAIN')).toBe(true)
        expect(flags.find(f => f.code === 'RF_CHEST_PAIN')?.severity).toBe('emergency')
        expect(flags.find(f => f.code === 'RF_CHEST_PAIN')?.forcesDecline).toBe(true)
      })

      it('should detect syncope with palpitations', () => {
        const flags = checkRedFlagPatterns('I had a blackout episode')
        expect(flags.some(f => f.code === 'RF_PALPITATIONS_SYNCOPE')).toBe(true)
        expect(flags.find(f => f.code === 'RF_PALPITATIONS_SYNCOPE')?.forcesNeedsCall).toBe(true)
      })
    })

    describe('Neurological red flags', () => {
      it('should detect stroke symptoms', () => {
        const flags = checkRedFlagPatterns('I have sudden weakness on one side')
        expect(flags.some(f => f.code === 'RF_STROKE_SYMPTOMS')).toBe(true)
        expect(flags.find(f => f.code === 'RF_STROKE_SYMPTOMS')?.severity).toBe('emergency')
      })

      it('should detect severe headache', () => {
        const flags = checkRedFlagPatterns('This is the worst headache of my life')
        expect(flags.some(f => f.code === 'RF_SEVERE_HEADACHE')).toBe(true)
        expect(flags.find(f => f.code === 'RF_SEVERE_HEADACHE')?.severity).toBe('critical')
      })
    })

    describe('Respiratory red flags', () => {
      it('should detect breathing difficulty', () => {
        const flags = checkRedFlagPatterns("I can't breathe properly")
        expect(flags.some(f => f.code === 'RF_BREATHING_DIFFICULTY')).toBe(true)
        expect(flags.find(f => f.code === 'RF_BREATHING_DIFFICULTY')?.forcesDecline).toBe(true)
      })
    })

    describe('Mental health red flags', () => {
      it('should detect suicidal ideation', () => {
        const flags = checkRedFlagPatterns('I want to die')
        expect(flags.some(f => f.code === 'RF_SUICIDAL_IDEATION')).toBe(true)
        expect(flags.find(f => f.code === 'RF_SUICIDAL_IDEATION')?.severity).toBe('emergency')
      })

      it('should detect self-harm', () => {
        const flags = checkRedFlagPatterns('I have been self harm behaviour')
        expect(flags.some(f => f.code === 'RF_SELF_HARM')).toBe(true)
        expect(flags.find(f => f.code === 'RF_SELF_HARM')?.forcesNeedsCall).toBe(true)
      })
    })

    describe('Abdominal red flags', () => {
      it('should detect acute abdomen', () => {
        const flags = checkRedFlagPatterns('I have severe abdominal pain')
        expect(flags.some(f => f.code === 'RF_ACUTE_ABDOMEN')).toBe(true)
        expect(flags.find(f => f.code === 'RF_ACUTE_ABDOMEN')?.severity).toBe('critical')
      })
    })

    describe('No red flags', () => {
      it('should return empty array for routine symptoms', () => {
        const flags = checkRedFlagPatterns('I have a mild cough')
        expect(flags).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // AUTO-REJECT LOGIC
  // ============================================================================

  describe('checkAutoReject', () => {
    it('should reject emergency symptoms', () => {
      const result = checkAutoReject(
        [],
        { isEmergency: true, matchedKeywords: ['chest pain'] },
        false,
        false,
        false
      )
      expect(result.shouldReject).toBe(true)
      expect(result.category).toBe('emergency_symptoms')
    })

    it('should reject controlled substances', () => {
      const result = checkAutoReject(
        [],
        { isEmergency: false, matchedKeywords: [] },
        true, // isControlledSubstance
        false,
        false
      )
      expect(result.shouldReject).toBe(true)
      expect(result.category).toBe('controlled_substance')
    })

    it('should reject first-time high-risk cases', () => {
      const result = checkAutoReject(
        [],
        { isEmergency: false, matchedKeywords: [] },
        false,
        true, // isFirstTimeHighRisk
        false
      )
      expect(result.shouldReject).toBe(true)
      expect(result.category).toBe('first_time_high_risk')
    })

    it('should reject outside GP scope', () => {
      const result = checkAutoReject(
        [],
        { isEmergency: false, matchedKeywords: [] },
        false,
        false,
        true // isOutsideScope
      )
      expect(result.shouldReject).toBe(true)
      expect(result.category).toBe('outside_gp_scope')
    })

    it('should reject on red flag that forces decline', () => {
      const flags: ClinicalFlag[] = [{
        code: 'RF_CHEST_PAIN',
        severity: 'emergency',
        category: 'cardiovascular',
        description: 'Chest pain',
        clinicianGuidance: 'Test',
        forcesNeedsCall: false,
        forcesDecline: true,
      }]

      const result = checkAutoReject(
        flags,
        { isEmergency: false, matchedKeywords: [] },
        false,
        false,
        false
      )
      expect(result.shouldReject).toBe(true)
      expect(result.category).toBe('red_flag_presentation')
    })

    it('should not reject clean requests', () => {
      const result = checkAutoReject(
        [],
        { isEmergency: false, matchedKeywords: [] },
        false,
        false,
        false
      )
      expect(result.shouldReject).toBe(false)
      expect(result.category).toBeUndefined()
    })
  })

  // ============================================================================
  // ASYNC BLOCKING LOGIC
  // ============================================================================

  describe('checkAsyncBlocked', () => {
    it('should block async for critical clinical flags', () => {
      const flags: ClinicalFlag[] = [{
        code: 'TEST',
        severity: 'critical',
        category: 'test',
        description: 'Test',
        clinicianGuidance: 'Test',
        forcesNeedsCall: false,
        forcesDecline: false,
      }]

      const result = checkAsyncBlocked(flags, false, 'med_cert')
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('clinician_discomfort')
    })

    it('should block async for new diagnosis', () => {
      const result = checkAsyncBlocked([], false, 'med_cert', {
        isNewDiagnosis: true,
      })
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('new_diagnosis')
    })

    it('should block async for new long-term medication', () => {
      const result = checkAsyncBlocked([], false, 'med_cert', {
        isNewLongTermMed: true,
      })
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('new_long_term_medication')
    })

    it('should block async for symptom escalation', () => {
      const result = checkAsyncBlocked([], false, 'med_cert', {
        hasSymptomEscalation: true,
      })
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('symptom_escalation')
    })

    it('should block async for ambiguous history', () => {
      const result = checkAsyncBlocked([], false, 'med_cert', {
        hasAmbiguousHistory: true,
      })
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('ambiguous_history')
    })

    it('should allow async for clean requests', () => {
      const result = checkAsyncBlocked([], false, 'med_cert')
      expect(result.blocked).toBe(false)
    })
  })

  // ============================================================================
  // MAIN TRIAGE EVALUATION
  // ============================================================================

  describe('evaluateTriage', () => {
    it('should suggest decline for emergency symptoms', () => {
      const result = evaluateTriage({
        requestId: 'test-1',
        requestType: 'med_cert',
        freeTextSymptoms: 'I have severe chest pain',
      })

      expect(result.suggestedOutcome).toBe('declined')
      expect(result.isAutoRejected).toBe(true)
      expect(result.flags.length).toBeGreaterThan(0)
    })

    it('should suggest needs_call when async blocked', () => {
      const result = evaluateTriage({
        requestId: 'test-2',
        requestType: 'med_cert',
        freeTextSymptoms: 'I had a blackout yesterday',
        additionalContext: {
          hasAmbiguousHistory: true,
        },
      })

      expect(result.asyncBlocked).toBe(true)
      expect(result.suggestedOutcome).toBe('needs_call')
    })

    it('should suggest needs_call for flags that force call', () => {
      const result = evaluateTriage({
        requestId: 'test-3',
        requestType: 'med_cert',
        freeTextSymptoms: 'I have been self-harm lately',
      })

      expect(result.flags.some(f => f.forcesNeedsCall)).toBe(true)
    })

    it('should suggest approved for clean requests', () => {
      const result = evaluateTriage({
        requestId: 'test-4',
        requestType: 'med_cert',
        freeTextSymptoms: 'I have a mild cold and need time off work',
      })

      expect(result.suggestedOutcome).toBe('approved')
      expect(result.isAutoRejected).toBe(false)
      expect(result.asyncBlocked).toBe(false)
    })

    it('should include context in result', () => {
      const result = evaluateTriage({
        requestId: 'test-5',
        requestType: 'repeat_rx',
        patientId: 'patient-123',
        isFirstRequest: true,
      })

      expect(result.context.requestId).toBe('test-5')
      expect(result.context.requestType).toBe('repeat_rx')
      expect(result.context.patientId).toBe('patient-123')
      expect(result.context.isFirstRequest).toBe(true)
    })
  })

  // ============================================================================
  // CLINICIAN DECISION VALIDATION
  // ============================================================================

  describe('validateClinicianDecision', () => {
    it('should warn when approving despite critical flags', () => {
      const triageResult = evaluateTriage({
        requestId: 'test-6',
        requestType: 'med_cert',
        freeTextSymptoms: 'I have severe abdominal pain', // Critical flag
      })

      const validation = validateClinicianDecision('approved', triageResult)
      expect(validation.valid).toBe(true) // Clinician always has authority
      expect(validation.warnings.length).toBeGreaterThan(0)
      expect(validation.warnings.some(w => w.includes('critical flag'))).toBe(true)
    })

    it('should warn when approving async-blocked request', () => {
      const triageResult = evaluateTriage({
        requestId: 'test-7',
        requestType: 'med_cert',
        additionalContext: { isNewDiagnosis: true },
      })

      const validation = validateClinicianDecision('approved', triageResult)
      expect(validation.warnings.some(w => w.includes('async'))).toBe(true)
    })

    it('should warn when overriding auto-reject', () => {
      const triageResult = evaluateTriage({
        requestId: 'test-8',
        requestType: 'med_cert',
        isControlledSubstance: true,
      })

      const validation = validateClinicianDecision('approved', triageResult)
      expect(validation.warnings.some(w => w.includes('auto-reject'))).toBe(true)
    })

    it('should have no warnings for clean approval', () => {
      const triageResult = evaluateTriage({
        requestId: 'test-9',
        requestType: 'med_cert',
        freeTextSymptoms: 'I have a mild cold',
      })

      const validation = validateClinicianDecision('approved', triageResult)
      expect(validation.warnings).toHaveLength(0)
    })
  })

  // ============================================================================
  // FINAL SAFETY RULE
  // ============================================================================

  describe('applyFinalSafetyRule', () => {
    it('should return needs_call when clinician is unsure', () => {
      const result = applyFinalSafetyRule('approved', true)
      expect(result).toBe('needs_call')
    })

    it('should preserve outcome when clinician is sure', () => {
      const result = applyFinalSafetyRule('approved', false)
      expect(result).toBe('approved')
    })

    it('should preserve declined when clinician is sure', () => {
      const result = applyFinalSafetyRule('declined', false)
      expect(result).toBe('declined')
    })
  })
})
