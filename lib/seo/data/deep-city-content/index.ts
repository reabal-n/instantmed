/**
 * Barrel file for deep city content modules.
 * Re-exports everything and constructs the combined DEEP_CITY_CONTENT object
 * so existing consumers don't need to change.
 */

import type { DeepCityContent } from "../deep-city-content"
import { ACT_CITIES } from "./act"
import { crossBorderCities } from "./cross-border"
import { NSW_CITIES } from "./nsw"
import { NT_CITIES } from "./nt"
import { QLD_CITIES } from "./qld"
import { SA_CITIES } from "./sa"
import { TAS_CITIES } from "./tas"
import { VIC_CITIES } from "./vic"
import { WA_CITIES } from "./wa"

export {
  ACT_CITIES,
  crossBorderCities,
  NSW_CITIES,
  NT_CITIES,
  QLD_CITIES,
  SA_CITIES,
  TAS_CITIES,
  VIC_CITIES,
  WA_CITIES,
}

/** Combined deep city content record -- identical shape to the original monolith */
export const DEEP_CITY_CONTENT: Record<string, DeepCityContent> = {
  ...NSW_CITIES,
  ...VIC_CITIES,
  ...QLD_CITIES,
  ...WA_CITIES,
  ...SA_CITIES,
  ...TAS_CITIES,
  ...ACT_CITIES,
  ...NT_CITIES,
  ...crossBorderCities,
}
