import { searchPBSItemsEnhanced } from "@/lib/pbs/client"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("clinical-decision-support")

export interface DrugInteraction {
  drug1: string
  drug2: string
  severity: "mild" | "moderate" | "severe"
  description: string
}

// Common drug interactions database (simplified - extend as needed)
const KNOWN_INTERACTIONS: DrugInteraction[] = [
  { drug1: "warfarin", drug2: "aspirin", severity: "severe", description: "Increased bleeding risk" },
  { drug1: "metformin", drug2: "contrast dye", severity: "severe", description: "Risk of lactic acidosis" },
  { drug1: "ssri", drug2: "tramadol", severity: "severe", description: "Serotonin syndrome risk" },
  { drug1: "ace inhibitor", drug2: "potassium", severity: "moderate", description: "Hyperkalaemia risk" },
  { drug1: "statin", drug2: "macrolide", severity: "moderate", description: "Increased myopathy risk" },
]

export function checkDrugInteractions(
  medication: string,
  currentMedications: string[]
): DrugInteraction[] {
  const interactions: DrugInteraction[] = []
  const medLower = medication.toLowerCase()

  for (const current of currentMedications) {
    const currentLower = current.toLowerCase()
    for (const interaction of KNOWN_INTERACTIONS) {
      if (
        (medLower.includes(interaction.drug1) && currentLower.includes(interaction.drug2)) ||
        (medLower.includes(interaction.drug2) && currentLower.includes(interaction.drug1))
      ) {
        interactions.push(interaction)
      }
    }
  }

  return interactions
}

export interface PBSClinicalInfo {
  pbsListed: boolean
  pbsCode?: string
  maxQuantity?: number
  repeatsAllowed?: number
  restrictions?: string
}

export async function getPBSClinicalInfo(medicationName: string): Promise<PBSClinicalInfo> {
  try {
    const results = await searchPBSItemsEnhanced(medicationName, 1)

    if (results.length === 0) {
      return { pbsListed: false }
    }

    const item = results[0]
    return {
      pbsListed: true,
      pbsCode: item.pbs_code,
    }
  } catch (error) {
    log.error("PBS lookup failed", { medication: medicationName })
    return { pbsListed: false }
  }
}
