/**
 * Condition pages data - SEO landing pages for health conditions
 * Single source of truth for app/conditions/[slug]
 *
 * Data is split into category files under ./conditions/ for maintainability.
 * This file re-exports everything so existing consumers don't need to change.
 */

export interface ConditionData {
  name: string
  slug: string
  description: string
  searchIntent: string
  symptoms: string[]
  whenToSeek: string[]
  whenEmergency: string[]
  canWeHelp: {
    yes: string[]
    no: string[]
  }
  commonQuestions: Array<{ q: string; a: string }>
  relatedConditions: string[]
  serviceType: "med-cert" | "consult" | "both"
  ctaText: string
  ctaHref: string
  stats: {
    avgTime: string
    satisfaction: string
  }
  /** Clinical perspective - 2-3 paragraphs of doctor-level insight unique to this condition */
  doctorPerspective?: string
  /** Australian-specific health statistics for this condition */
  auStats?: string[]
  /** Typical recovery timeline and return-to-work guidance */
  recoveryTimeline?: {
    typical: string
    returnToWork: string
    whenToReassess: string
  }
  /** Self-care tips beyond the generic "rest and fluids" */
  selfCareTips?: string[]
  /** Reviewed date in YYYY-MM format */
  reviewedDate?: string
  /**
   * Treatment information with named medications.
   * Sources: Therapeutic Guidelines (eTG), PBS Schedule, TGA.
   * Educational content only -- does not replace clinical assessment.
   */
  treatmentInfo?: {
    /** Brief overview of the treatment approach for this condition */
    overview: string
    /** First-line medications commonly used */
    medications: Array<{
      /** Generic drug name, e.g. "Sildenafil" */
      genericName: string
      /** Brand names available in Australia, e.g. ["Viagra"] */
      brandNames: string[]
      /** Drug class, e.g. "PDE5 inhibitor" */
      drugClass: string
      /** Typical dosing, e.g. "50mg as needed, max once daily" */
      typicalDose: string
      /** PBS listing status */
      pbsListed: boolean
      /** PBS note if relevant, e.g. "PBS listed for BPH, not for ED" */
      pbsNote?: string
      /** Whether a prescription is required (S4/S8) */
      prescriptionRequired: boolean
      /** Whether InstantMed can prescribe this via telehealth */
      availableOnline: boolean
      /** 2-4 key clinical points about this medication */
      keyPoints: string[]
    }>
    /** Clinical guideline source and year */
    guidelineSource: string
    /** When specialist referral is recommended */
    whenToSeeSpecialist: string
  }
}

// Re-export everything from the split category files
export {
  conditionsData,
  dermatologyConditions,
  entConditions,
  gastrointestinalConditions,
  getAllConditionSlugs,
  getConditionBySlug,
  mentalHealthConditions,
  metabolicConditions,
  musculoskeletalConditions,
  neurologicalConditions,
  respiratoryConditions,
  womensHealthConditions,
} from "./conditions/index"
