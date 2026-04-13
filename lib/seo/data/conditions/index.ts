/**
 * Barrel file for condition category modules.
 * Re-exports everything and constructs the combined conditionsData object
 * so existing consumers don't need to change.
 */

import type { ConditionData } from "../conditions"
import { dermatologyConditions } from "./dermatology"
import { entConditions } from "./ent"
import { gastrointestinalConditions } from "./gastrointestinal"
import { mentalHealthConditions } from "./mental-health"
import { metabolicConditions } from "./metabolic"
import { musculoskeletalConditions } from "./musculoskeletal"
import { neurologicalConditions } from "./neurological"
import { respiratoryConditions } from "./respiratory"
import { womensHealthConditions } from "./womens-health"

export {
  dermatologyConditions,
  entConditions,
  gastrointestinalConditions,
  mentalHealthConditions,
  metabolicConditions,
  musculoskeletalConditions,
  neurologicalConditions,
  respiratoryConditions,
  womensHealthConditions,
}

/** Combined conditions record -- identical shape to the original monolith */
export const conditionsData: Record<string, ConditionData> = {
  ...respiratoryConditions,
  ...musculoskeletalConditions,
  ...dermatologyConditions,
  ...gastrointestinalConditions,
  ...mentalHealthConditions,
  ...entConditions,
  ...womensHealthConditions,
  ...metabolicConditions,
  ...neurologicalConditions,
}

export function getConditionBySlug(slug: string): ConditionData | undefined {
  return conditionsData[slug]
}

export function getAllConditionSlugs(): string[] {
  return Object.keys(conditionsData)
}
