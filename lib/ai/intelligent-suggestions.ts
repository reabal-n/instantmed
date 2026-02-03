/**
 * AI-Powered Intelligent Suggestions
 * 
 * Provides intelligent suggestions for medication, symptoms, and triage
 * using machine learning and heuristics.
 */

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("ai-suggestions")

export interface MedicationSuggestion {
  name: string
  strength: string
  form: string
  pbsCode: string
  confidence: number
  reason: string
}

export interface SymptomSuggestion {
  symptom: string
  severity: 'mild' | 'moderate' | 'severe'
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  possibleConditions: string[]
  recommendations: string[]
  confidence: number
}

export interface TriageSuggestion {
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  estimatedWaitTime: string
  recommendations: string[]
  redFlags: string[]
  confidence: number
  requiresInPerson: boolean
}

export interface FormCompletionSuggestion {
  fieldName: string
  suggestedValue: string
  confidence: number
  reason: string
}

class IntelligentSuggestionsEngine {
  private static instance: IntelligentSuggestionsEngine
  private isEnabled: boolean

  private constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_AI === 'true'
  }

  static getInstance(): IntelligentSuggestionsEngine {
    if (!IntelligentSuggestionsEngine.instance) {
      IntelligentSuggestionsEngine.instance = new IntelligentSuggestionsEngine()
    }
    return IntelligentSuggestionsEngine.instance
  }

  // Suggest medications based on symptoms and user input
  async suggestMedications(
    userInput: string,
    _symptoms: string[] = []
  ): Promise<MedicationSuggestion[]> {
    if (!this.isEnabled) {
      return []
    }

    try {
      // This would integrate with an AI service in production
      // For now, use heuristic-based suggestions
      
      const suggestions: MedicationSuggestion[] = []
      const normalizedInput = userInput.toLowerCase().trim()

      // Common medication mappings
      const medicationMap: Record<string, Partial<MedicationSuggestion>> = {
        'paracetamol': {
          name: 'Paracetamol',
          strength: '500mg',
          form: 'Tablets',
          pbsCode: '8964P',
          confidence: 0.9,
          reason: 'Common pain reliever'
        },
        'ibuprofen': {
          name: 'Ibuprofen',
          strength: '400mg',
          form: 'Tablets',
          pbsCode: '4352P',
          confidence: 0.85,
          reason: 'Anti-inflammatory pain reliever'
        },
        'amoxicillin': {
          name: 'Amoxicillin',
          strength: '500mg',
          form: 'Capsules',
          pbsCode: '5088P',
          confidence: 0.8,
          reason: 'Common antibiotic'
        },
        'metformin': {
          name: 'Metformin',
          strength: '500mg',
          form: 'Tablets',
          pbsCode: '9235P',
          confidence: 0.85,
          reason: 'Diabetes medication'
        },
        'salbutamol': {
          name: 'Salbutamol',
          strength: '100mcg',
          form: 'Inhaler',
          pbsCode: '1879P',
          confidence: 0.8,
          reason: 'Asthma inhaler'
        }
      }

      // Find matches
      for (const [key, medication] of Object.entries(medicationMap)) {
        if (normalizedInput.includes(key)) {
          suggestions.push({
            ...medication,
            name: medication.name!,
            strength: medication.strength!,
            form: medication.form!,
            pbsCode: medication.pbsCode!,
            confidence: medication.confidence!,
            reason: medication.reason!
          })
        }
      }

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence)

      logger.info("Medication suggestions generated", { 
        count: suggestions.length, 
        userInput 
      })

      return suggestions.slice(0, 5) // Return top 5 suggestions
    } catch (error) {
      logger.error("Failed to generate medication suggestions", { error })
      return []
    }
  }

  // Analyze symptoms and provide suggestions
  async analyzeSymptoms(symptoms: string[]): Promise<SymptomSuggestion[]> {
    if (!this.isEnabled) {
      return []
    }

    try {
      const suggestions: SymptomSuggestion[] = []

      // Symptom analysis logic
      for (const symptom of symptoms) {
        const normalizedSymptom = symptom.toLowerCase()
        let suggestion: SymptomSuggestion | null = null

        // Headache analysis
        if (normalizedSymptom.includes('headache')) {
          suggestion = {
            symptom: 'Headache',
            severity: normalizedSymptom.includes('severe') ? 'severe' : 
                     normalizedSymptom.includes('mild') ? 'mild' : 'moderate',
            urgency: normalizedSymptom.includes('migraine') ? 'high' : 'medium',
            possibleConditions: ['Migraine', 'Tension Headache', 'Sinus Headache'],
            recommendations: [
              'Rest in quiet environment',
              'Stay hydrated',
              'Consider over-the-counter pain relief',
              'Monitor for worsening symptoms'
            ],
            confidence: 0.8
          }
        }
        // Fever analysis
        else if (normalizedSymptom.includes('fever') || normalizedSymptom.includes('temperature')) {
          suggestion = {
            symptom: 'Fever',
            severity: normalizedSymptom.includes('high') ? 'severe' : 'moderate',
            urgency: normalizedSymptom.includes('high') ? 'high' : 'medium',
            possibleConditions: ['Viral Infection', 'Bacterial Infection', 'Inflammation'],
            recommendations: [
              'Monitor temperature regularly',
              'Stay hydrated',
              'Rest',
              'Seek medical attention if fever persists > 3 days'
            ],
            confidence: 0.85
          }
        }
        // Cough analysis
        else if (normalizedSymptom.includes('cough')) {
          suggestion = {
            symptom: 'Cough',
            severity: normalizedSymptom.includes('severe') ? 'severe' : 'moderate',
            urgency: normalizedSymptom.includes('persistent') ? 'medium' : 'low',
            possibleConditions: ['Common Cold', 'Bronchitis', 'Allergies', 'COVID-19'],
            recommendations: [
              'Stay hydrated',
              'Use cough suppressants if needed',
              'Avoid irritants',
              'Monitor for shortness of breath'
            ],
            confidence: 0.75
          }
        }
        // Gastrointestinal issues
        else if (normalizedSymptom.includes('nausea') || normalizedSymptom.includes('vomiting')) {
          suggestion = {
            symptom: 'Gastrointestinal Distress',
            severity: normalizedSymptom.includes('severe') ? 'severe' : 'moderate',
            urgency: normalizedSymptom.includes('persistent') ? 'high' : 'medium',
            possibleConditions: ['Gastroenteritis', 'Food Poisoning', 'Migraine', 'Pregnancy'],
            recommendations: [
              'Stay hydrated with small sips',
              'Eat bland foods',
              'Rest',
              'Seek medical attention if severe or persistent'
            ],
            confidence: 0.8
          }
        }

        if (suggestion) {
          suggestions.push(suggestion)
        }
      }

      // Sort by urgency and confidence
      suggestions.sort((a, b) => {
        const urgencyOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const aUrgency = urgencyOrder[a.urgency] || 0
        const bUrgency = urgencyOrder[b.urgency] || 0
        
        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency
        }
        
        return b.confidence - a.confidence
      })

      logger.info("Symptom analysis completed", { 
        symptomsCount: symptoms.length,
        suggestionsCount: suggestions.length 
      })

      return suggestions
    } catch (error) {
      logger.error("Failed to analyze symptoms", { error })
      return []
    }
  }

  // Provide triage suggestions
  async generateTriageSuggestion(
    symptoms: string[], 
    duration: string,
    severity: string
  ): Promise<TriageSuggestion | null> {
    if (!this.isEnabled) {
      return null
    }

    try {
      const symptomAnalysis = await this.analyzeSymptoms(symptoms)
      const hasHighUrgency = symptomAnalysis.some(s => s.urgency === 'high' || s.urgency === 'urgent')
      const hasSevereSymptoms = severity.toLowerCase().includes('severe')
      const isLongDuration = duration.toLowerCase().includes('week') || duration.toLowerCase().includes('month')

      let urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
      let estimatedWaitTime = '2-4 hours'
      let requiresInPerson = false

      // Determine urgency
      if (hasHighUrgency || hasSevereSymptoms) {
        urgency = 'high'
        estimatedWaitTime = '30 minutes - 1 hour'
        requiresInPerson = true
      } else if (isLongDuration) {
        urgency = 'medium'
        estimatedWaitTime = '1-2 hours'
      } else {
        urgency = 'low'
        estimatedWaitTime = '4-6 hours'
      }

      // Check for red flags
      const redFlags: string[] = []
      
      if (symptoms.some(s => s.toLowerCase().includes('chest') && s.toLowerCase().includes('pain'))) {
        redFlags.push('Chest pain - requires immediate attention')
        urgency = 'urgent'
        estimatedWaitTime = 'Immediate'
        requiresInPerson = true
      }
      
      if (symptoms.some(s => s.toLowerCase().includes('breath') || s.toLowerCase().includes('short'))) {
        redFlags.push('Breathing difficulties - requires immediate attention')
        urgency = 'urgent'
        estimatedWaitTime = 'Immediate'
        requiresInPerson = true
      }
      
      if (symptoms.some(s => s.toLowerCase().includes('head') && s.toLowerCase().includes('injury'))) {
        redFlags.push('Head injury - requires immediate attention')
        urgency = 'urgent'
        estimatedWaitTime = 'Immediate'
        requiresInPerson = true
      }

      const recommendations: string[] = [
        'Monitor symptoms closely',
        'Rest and stay hydrated',
        'Avoid strenuous activity'
      ]

      if (urgency === 'urgent') {
        recommendations.unshift('Seek immediate medical attention')
        recommendations.unshift('Call emergency services if symptoms worsen')
      } else if (urgency === 'high') {
        recommendations.unshift('Consult with a doctor as soon as possible')
      } else {
        recommendations.push('Consider over-the-counter remedies if appropriate')
      }

      const suggestion: TriageSuggestion = {
        urgency,
        estimatedWaitTime,
        recommendations,
        redFlags,
        confidence: 0.85,
        requiresInPerson
      }

      logger.info("Triage suggestion generated", { 
        urgency, 
        redFlagsCount: redFlags.length,
        requiresInPerson 
      })

      return suggestion
    } catch (error) {
      logger.error("Failed to generate triage suggestion", { error })
      return null
    }
  }

  // Suggest form field completions
  async suggestFormCompletion(
    fieldType: string,
    partialInput: string,
    _context: Record<string, unknown> = {}
  ): Promise<FormCompletionSuggestion[]> {
    if (!this.isEnabled) {
      return []
    }

    try {
      const suggestions: FormCompletionSuggestion[] = []
      const normalizedInput = partialInput.toLowerCase().trim()

      // Address suggestions
      if (fieldType === 'address' && normalizedInput.length > 3) {
        // This would integrate with AddressFinder API
        // For now, return mock suggestions
        const commonAddresses = [
          '123 Main Street, Sydney NSW 2000',
          '456 George Street, Melbourne VIC 3000',
          '789 Queen Street, Brisbane QLD 4000'
        ]

        for (const address of commonAddresses) {
          if (address.toLowerCase().includes(normalizedInput)) {
            suggestions.push({
              fieldName: 'address',
              suggestedValue: address,
              confidence: 0.9,
              reason: 'Address match found'
            })
          }
        }
      }

      // Medication name suggestions
      else if (fieldType === 'medication' && normalizedInput.length > 2) {
        const medicationSuggestions = await this.suggestMedications(normalizedInput)
        
        for (const med of medicationSuggestions) {
          suggestions.push({
            fieldName: 'medication',
            suggestedValue: med.name,
            confidence: med.confidence,
            reason: med.reason
          })
        }
      }

      // Symptom suggestions
      else if (fieldType === 'symptom' && normalizedInput.length > 2) {
        const commonSymptoms = [
          'Headache', 'Fever', 'Cough', 'Nausea', 'Fatigue',
          'Sore throat', 'Body aches', 'Stomach pain', 'Dizziness'
        ]

        for (const symptom of commonSymptoms) {
          if (symptom.toLowerCase().includes(normalizedInput)) {
            suggestions.push({
              fieldName: 'symptom',
              suggestedValue: symptom,
              confidence: 0.8,
              reason: 'Common symptom match'
            })
          }
        }
      }

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence)

      logger.info("Form completion suggestions generated", { 
        fieldType, 
        suggestionsCount: suggestions.length 
      })

      return suggestions.slice(0, 3) // Return top 3 suggestions
    } catch (error) {
      logger.error("Failed to generate form completion suggestions", { error })
      return []
    }
  }

  // Get intelligent health tips based on context
  async getHealthTips(context: {
    symptoms?: string[]
    medications?: string[]
    season?: string
    location?: string
  }): Promise<string[]> {
    if (!this.isEnabled) {
      return []
    }

    try {
      const tips: string[] = []
      const { symptoms, medications: _medications, season, location } = context

      // Seasonal tips
      if (season === 'winter') {
        tips.push('Stay warm and dry to prevent colds and flu')
        tips.push('Consider getting a flu shot if you haven\'t already')
        tips.push('Increase vitamin D intake during shorter days')
      } else if (season === 'summer') {
        tips.push('Stay hydrated and use sun protection')
        tips.push('Be aware of heat-related illnesses')
        tips.push('Protect against insect bites')
      }

      // Symptom-specific tips
      if (symptoms) {
        const analysis = await this.analyzeSymptoms(symptoms)
        for (const suggestion of analysis) {
          tips.push(...suggestion.recommendations.slice(0, 2)) // Add top 2 recommendations
        }
      }

      // Location-specific tips
      if (location && location.toLowerCase().includes('australia')) {
        tips.push('Be aware of Australian sun safety guidelines')
        tips.push('Know your local medical services and emergency numbers')
      }

      // Remove duplicates and limit
      const uniqueTips = [...new Set(tips)].slice(0, 5)

      logger.info("Health tips generated", { tipsCount: uniqueTips.length })

      return uniqueTips
    } catch (error) {
      logger.error("Failed to generate health tips", { error })
      return []
    }
  }
}

// Export singleton instance
export const intelligentSuggestions = IntelligentSuggestionsEngine.getInstance()

// React hook for easy usage
export function useIntelligentSuggestions() {
  const engine = IntelligentSuggestionsEngine.getInstance()

  return {
    suggestMedications: engine.suggestMedications.bind(engine),
    analyzeSymptoms: engine.analyzeSymptoms.bind(engine),
    generateTriage: engine.generateTriageSuggestion.bind(engine),
    suggestFormCompletion: engine.suggestFormCompletion.bind(engine),
    getHealthTips: engine.getHealthTips.bind(engine)
  }
}
