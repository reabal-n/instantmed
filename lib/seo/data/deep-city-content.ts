/**
 * Deep content for Australian city location pages.
 * Provides 1,500+ words of unique, genuinely useful content per city
 * covering local health stats, telehealth regulations, pharmacy info,
 * and city-specific healthcare context.
 *
 * Data is split into state/region files under ./deep-city-content/ for maintainability.
 * This file re-exports everything so existing consumers don't need to change.
 */

export interface DeepCitySection {
  title: string
  paragraphs: string[]
}

export interface DeepCityHealthStat {
  label: string
  value: string
  context: string
}

export interface DeepCityContent {
  healthStats: DeepCityHealthStat[]
  sections: DeepCitySection[]
  pharmacyInfo: DeepCitySection
  telehealthRegulations: DeepCitySection
  additionalFaqs: Array<{ q: string; a: string }>
}

// Re-export everything from the split state files
export {
  ACT_CITIES,
  crossBorderCities,
  DEEP_CITY_CONTENT,
  NSW_CITIES,
  NT_CITIES,
  QLD_CITIES,
  SA_CITIES,
  TAS_CITIES,
  VIC_CITIES,
  WA_CITIES,
} from "./deep-city-content/index"
