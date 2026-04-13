/**
 * Barrel file for symptom category modules.
 * Re-exports everything and constructs the combined symptoms object
 * so existing consumers don't need to change.
 */

import type { SymptomData } from "../symptoms"
import { cardiovascularSymptoms } from "./cardiovascular"
import { dermatologySymptoms } from "./dermatology"
import { gastrointestinalSymptoms } from "./gastrointestinal"
import { generalSystemicSymptoms } from "./general-systemic"
import { painSymptoms } from "./pain-musculoskeletal"
import { respiratorySymptoms } from "./respiratory"
import { sensorySleepSymptoms } from "./sensory-sleep"
import { urologicalSymptoms } from "./urological"

export {
  cardiovascularSymptoms,
  dermatologySymptoms,
  gastrointestinalSymptoms,
  generalSystemicSymptoms,
  painSymptoms,
  respiratorySymptoms,
  sensorySleepSymptoms,
  urologicalSymptoms,
}

/** Combined symptoms record -- identical shape to the original monolith */
export const symptoms: Record<string, SymptomData> = {
  ...respiratorySymptoms,
  ...painSymptoms,
  ...generalSystemicSymptoms,
  ...gastrointestinalSymptoms,
  ...urologicalSymptoms,
  ...dermatologySymptoms,
  ...cardiovascularSymptoms,
  ...sensorySleepSymptoms,
}
