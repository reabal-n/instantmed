/**
 * Medication → dedicated-service routing.
 *
 * Some medicines have a dedicated InstantMed service with its own safety
 * screening (ED; hair loss; women's health). When one is entered into the
 * generic repeat-prescription / prescription flow, we route the patient to
 * that service rather than silently letting it through the generic path.
 *
 * HOW A MATCH IS DECIDED — three inputs, strictly ranked:
 *  1. The MEDICINE text. Only a medicine can trigger a steer or a checkout
 *     block. Generic ingredient names are matched typo-tolerantly (patients
 *     misspell "sildenafil"/"finasteride" constantly); brands are exact.
 *  2. The structured `routing_context` answer — the patient's explicit
 *     "what do I take this for" selection, offered only when the medicine is
 *     genuinely multi-indication. This is the ONLY exemption input. It
 *     replaced free-text inference (negation regexes, clause scoping,
 *     affirmative markers) after two review rounds proved that inferring
 *     intent from free text either refused care on a passing mention or let
 *     denials unlock the lane. Do not reintroduce free-text exemption parsing.
 *  3. The free-text indication. It can only ever RAISE a flag_only mention
 *     (a condition named beside a medicine we can't identify); it can never
 *     block and never exempt.
 *
 * Exemption asymmetry, deliberate:
 *  - Deterministic medicine facts (a BPH-only brand, a BPH-only dose, Loniten)
 *    exempt silently → null. Nothing was claimed, so there is nothing to flag.
 *  - Patient ATTESTATION (a routing-context selection) always leaves a
 *    doctor-visible flag. The options are on screen, so a selection is
 *    self-reported and cheap — the reviewer sees exactly what was claimed.
 *  - A PDE5 inhibitor is flagged even on its PAH-only brands: the nitrate
 *    interaction applies whatever it is taken for.
 *
 * The enforcement tiers (hard/soft/flag_only) and why each service sits where
 * it does are documented on `DedicatedServiceEnforcement` below. Server-side
 * backstops: the checkout block in lib/validation/repeat-script-schema.ts and
 * the doctor flags in lib/clinical/derive-intake-flags.ts — never client-only.
 *
 * UTI antibiotics are intentionally out of scope: acute antibiotic courses are
 * not repeat scripts, so patients don't reach repeat-Rx with one.
 */

import { textMatchesTermFuzzily } from "./fuzzy-term-match"

export type DedicatedServiceSubtype = "ed" | "hair_loss" | "womens_health"

/**
 * How a match is enforced end-to-end.
 *
 *  - "hard": the medication step steers with NO escape and checkout refuses
 *    (`requiresConsult`). ED + hair loss, per operator decision 2026-08-05 —
 *    the $29.95 repeat lane was both underpricing the $49.95 consult and
 *    skipping screening the dedicated flow owns (ED: nitrates + cardiac).
 *  - "soft": steer with an explicit escape, no checkout block. Contraceptive
 *    pills only — continuing the same pill is deliberately a cheap repeat.
 *  - "flag_only": no steer, no block; the doctor sees the
 *    `dedicated_service_medication` flag. PAH-brand PDE5 inhibitors, and any
 *    exemption made by patient attestation.
 */
// Not exported: callers branch on `match.enforcement` through
// DedicatedServiceMatch and never need the alias by name (the dead-code
// ratchet fails on an export nothing imports).
type DedicatedServiceEnforcement = "hard" | "soft" | "flag_only"

/**
 * The structured "what do I take this for" answer. Written by the medication
 * step (`routing_context` / `routingContext`), read by checkout validation and
 * flag derivation. Unknown values normalise to null and fail toward routing.
 */
export type RoutingContext =
  | "erectile_dysfunction"
  | "pulmonary_hypertension"
  | "prostate_bph"
  | "hair_loss"
  | "blood_pressure"

const ROUTING_CONTEXT_VALUES: ReadonlyArray<RoutingContext> = [
  "erectile_dysfunction",
  "pulmonary_hypertension",
  "prostate_bph",
  "hair_loss",
  "blood_pressure",
]

/** Display labels shared by the intake chips and doctor-flag reasons. */
export const ROUTING_CONTEXT_LABELS: Record<RoutingContext, string> = {
  erectile_dysfunction: "Erectile dysfunction",
  pulmonary_hypertension: "Pulmonary hypertension",
  prostate_bph: "Prostate / BPH",
  hair_loss: "Hair loss",
  blood_pressure: "Blood pressure",
}

// Not exported: consumers pass the raw answer to the detector, which
// normalises internally (the dead-code ratchet fails on an unused export).
function normalizeRoutingContext(value: unknown): RoutingContext | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return (ROUTING_CONTEXT_VALUES as ReadonlyArray<string>).includes(normalized)
    ? (normalized as RoutingContext)
    : null
}

export interface DedicatedServiceMatch {
  /** Consult subtype to deep-link into (`/request?service=consult&subtype=…`). */
  subtype: DedicatedServiceSubtype
  /** Human label for CTAs / flag detail, e.g. "Hair Loss". */
  serviceLabel: string
  /** Why it matched — surfaced to the doctor as the flag detail. */
  reason: string
  /** How the match is enforced in the UI and at checkout. */
  enforcement: DedicatedServiceEnforcement
  /**
   * Present when the medicine is multi-indication and the patient's structured
   * answer decides the route. The UI renders exactly these options; absent for
   * single-indication brands (no question to ask).
   */
  contextOptions?: ReadonlyArray<RoutingContext>
}

// ---------------------------------------------------------------------------
// Contraceptive pills: active ingredients + common Australian brands.
// Combined + progestogen-only. Not exhaustive — the doctor flag catches the
// long tail; this covers the medicines patients actually type.
const OCP_PATTERNS: ReadonlyArray<RegExp> = [
  // Active ingredients (combined + POP)
  /ethinyl[o]?estradiol/i,
  /\blevonorgestrel\b/i,
  /\bdrospirenone\b/i,
  /\bdesogestrel\b/i,
  /\bgestodene\b/i,
  /\bnorethisterone\b/i,
  /\bcyproterone\b/i, // Diane/Estelle/Brenda — also acne; UI escape covers that
  /\bdienogest\b/i,
  /\bnomegestrol\b/i,
  // Common AU combined-pill brands
  /\bmicrogynon\b/i,
  /\blevlen\b/i,
  /\bnordette\b/i,
  /\bmonofeme\b/i,
  /\btrifeme\b/i,
  /\btriquilar\b/i,
  /\blogynon\b/i,
  /\bfemme[\s-]?tab\b/i,
  /\blenest\b/i,
  /\bloette\b/i,
  /\byasmin\b/i,
  /\byaz\b/i,
  /\bpetibelle\b/i,
  /\bmarvelon\b/i,
  /\bmadeleine\b/i,
  /\bbrevinor\b/i,
  /\bnorimin\b/i,
  /\bnorinyl\b/i,
  /\bvalette\b/i,
  /\bqlaira\b/i,
  /\bzoely\b/i,
  /\bdiane[\s-]?35\b/i,
  /\bestelle[\s-]?35\b/i,
  /\bbrenda[\s-]?35\b/i,
  /\bjuliet[\s-]?35\b/i,
  /\blaila[\s-]?35\b/i,
  // Progestogen-only pills
  /\bslinda\b/i,
  /\bmicrolut\b/i,
  /\bnoriday\b/i,
  /\bcerazette\b/i,
]

// ---------------------------------------------------------------------------
// PDE5 inhibitors.
// Brands that exist ONLY as ED products — no question to ask.
const ED_DEFINITE_BRANDS: ReadonlyArray<RegExp> = [
  /\bviagra\b/i,
  /\bspedra\b/i,
  /\bvedafil\b/i,
  /\bsilvasta\b/i,
  /\bsilagra\b/i,
  /\btadacip\b/i,
  /\bkamagra\b/i,
]

// Brands that exist ONLY as PAH products — kept as a repeat, always flagged
// (the nitrate interaction applies whatever a PDE5 inhibitor is taken for).
const PAH_DEFINITE_BRANDS: ReadonlyArray<RegExp> = [
  /\brevatio\b/i,
  /\badcirca\b/i,
]

// Multi-indication PDE5 signals: generic ingredients (typo-tolerant — all are
// long names patients misspell) and the dual-indication brands (Cialis 5 mg is
// TGA-approved for BPH/LUTS; Levitra generics exist). Dose NEVER disambiguates
// a PDE5 inhibitor: tadalafil 5 mg daily is also the ED daily preset and
// sildenafil 20 mg (the PAH strength) is trivially orderable as an ED dose.
const ED_AMBIGUOUS_INGREDIENTS: ReadonlyArray<string> = [
  "sildenafil",
  "tadalafil",
  "vardenafil",
  "avanafil",
]
const ED_AMBIGUOUS_BRANDS: ReadonlyArray<RegExp> = [
  /\bcialis\b/i,
  /\blevitra\b/i,
]

const PDE5I_CONTEXT_OPTIONS: ReadonlyArray<RoutingContext> = [
  "erectile_dysfunction",
  "pulmonary_hypertension",
  "prostate_bph",
]

// ---------------------------------------------------------------------------
// Hair-loss family.
// Brands that exist ONLY as hair products — no question to ask.
const HAIR_DEFINITE_BRANDS: ReadonlyArray<RegExp> = [
  /\bpropecia\b/i,
  /\bfinpecia\b/i,
  /\brogaine\b/i,
  /\bregaine\b/i,
]

// 5α-reductase inhibitors (typo-tolerant): hair at 1 mg finasteride, prostate
// at 5 mg finasteride / 0.5 mg dutasteride. Unlike the PDE5 doses, these dose
// rules are a REAL dose-to-indication mapping, so they exempt deterministically
// below without asking the patient anything.
const FIVE_ARI_INGREDIENTS: ReadonlyArray<string> = [
  "finasteride",
  "dutasteride",
]

// Deterministic prostate facts in the medicine text: BPH-only brands, BPH-only
// doses, or a tamsulosin co-medication. Ordinary repeats — null, no flag.
const BPH_DEFINITE: ReadonlyArray<RegExp> = [
  /\bproscar\b/i,
  /\bavodart\b/i,
  /\bduodart\b/i,
  /\bcombodart\b/i,
  /\btamsulosin\b/i,
  /finasteride[^0-9]{0,10}5\s*mg/i,
  /dutasteride[^0-9]{0,10}0\.?5\s*mg/i,
]

const FIVE_ARI_CONTEXT_OPTIONS: ReadonlyArray<RoutingContext> = [
  "hair_loss",
  "prostate_bph",
]

// Minoxidil (typo-tolerant): 5% topical is the hair product; ORAL minoxidil
// (Loniten, PBS-listed 10 mg) is an antihypertensive for severe refractory
// hypertension. Dose cannot discriminate reliably, so only the Loniten brand
// exempts deterministically; otherwise the patient's structured answer decides.
const MINOXIDIL_INGREDIENT = "minoxidil"
const BP_DEFINITE: ReadonlyArray<RegExp> = [/\bloniten\b/i]

const MINOXIDIL_CONTEXT_OPTIONS: ReadonlyArray<RoutingContext> = [
  "hair_loss",
  "blood_pressure",
]

// ---------------------------------------------------------------------------
// Indication-only signals. These describe a CONDITION, not a medicine, so they
// can never hard-block: a patient mentioning erectile dysfunction beside an
// unrelated repeat (a statin, an antidepressant) must still be able to check
// out. They raise a flag_only match so the doctor sees the mention.
// Deliberately explicit phrases — the bare "ED" token is NOT used here, because
// it is too easily produced by ordinary free text.
const INDICATION_ONLY_SIGNALS: ReadonlyArray<{ subtype: DedicatedServiceSubtype; serviceLabel: string; pattern: RegExp }> = [
  { subtype: "ed", serviceLabel: "Erectile Dysfunction", pattern: /erectile\s*dysfunction/i },
  { subtype: "ed", serviceLabel: "Erectile Dysfunction", pattern: /\bimpotence\b/i },
  { subtype: "hair_loss", serviceLabel: "Hair Loss", pattern: /\bhair\s*(loss|regrow(th)?|growth)\b/i },
  { subtype: "womens_health", serviceLabel: "Women's Health", pattern: /\bcontracepti(on|ve)\b/i },
  { subtype: "womens_health", serviceLabel: "Women's Health", pattern: /\bbirth\s*control\b/i },
]

// ---------------------------------------------------------------------------
// Weight-loss-class medicines. The weight-loss service is GATED (reserved
// $89.95, not launched — docs/CLINICAL.md keeps it manual-review-only), so
// there is no live destination to steer anyone to.
//
// ⚠️ Flag-only here is an INTERIM visibility measure awaiting an operator /
// clinical decision (D2 in docs/plans/2026-08-05-repeat-rx-dedicated-service-
// routing.md) — NOT a settled policy. It was an assistant default, and the
// diabetes-protection rationale first recorded for it was disproved by the
// data: every observed request stated a weight-management indication and none
// stated diabetes. The doctor decides with the flag and the stated indication
// until the operator rules.
const GATED_WEIGHT_LOSS_PATTERNS: ReadonlyArray<RegExp> = [
  /\bsemaglutide\b/i,
  /\bozempic\b/i,
  /\bwegovy\b/i,
  /\brybelsus\b/i,
  /\btirzepatide\b/i,
  /\bmounjaro\b/i,
  /\bzepbound\b/i,
  /\bliraglutide\b/i,
  /\bsaxenda\b/i,
  /\bvictoza\b/i,
  /\bphentermine\b/i,
  /\bduromine\b/i,
  /\bmetermine\b/i,
  /\borlistat\b/i,
  /\bxenical\b/i,
]

export interface GatedServiceMatch {
  /** Human label for the flag detail, e.g. "Weight loss". */
  serviceLabel: string
  /** Why it matched — surfaced to the doctor as the flag detail. */
  reason: string
}

/**
 * Medicines whose dedicated service is not live yet. There is nowhere to route
 * the patient, so these never steer and never block — they raise the
 * `gated_service_medication` doctor flag and nothing else.
 */
export function detectGatedServiceMedication(
  scanText: string | undefined | null,
): GatedServiceMatch | null {
  if (typeof scanText !== "string" || !scanText.trim()) return null
  const text = scanText.toLowerCase()

  if (GATED_WEIGHT_LOSS_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      serviceLabel: "Weight loss",
      reason: "weight-loss-class medicine — the weight-loss service is gated; confirm the indication",
    }
  }

  return null
}

/**
 * Classify a repeat request into a dedicated service, or null if it belongs in
 * the generic repeat/prescription flow.
 *
 * INTENT BINDING — the inputs are never concatenated for drug matching:
 *  - a steer or a checkout block requires the DRUG in `medicationText`;
 *  - `routingContext` (the structured patient answer) is the only exemption
 *    input, and an exemption by attestation is always flag_only, never null;
 *  - `indicationText` can only raise a flag_only mention.
 */
export function detectDedicatedServiceForMedication(
  medicationText: string | undefined | null,
  indicationText?: string | undefined | null,
  routingContextInput?: unknown,
): DedicatedServiceMatch | null {
  const medicine = typeof medicationText === "string" ? medicationText.toLowerCase() : ""
  const indication = typeof indicationText === "string" ? indicationText.toLowerCase() : ""
  if (!medicine.trim() && !indication.trim()) return null
  const routingContext = normalizeRoutingContext(routingContextInput)

  // Women's health (OCP) first — pill brands are unambiguous and never overlap
  // with the hair-loss / prostate 5α-reductase inhibitors.
  if (OCP_PATTERNS.some((pattern) => pattern.test(medicine))) {
    return {
      subtype: "womens_health",
      serviceLabel: "Women's Health",
      reason: "Contraceptive pill — has a dedicated women's health pathway",
      enforcement: "soft",
    }
  }

  // PDE5 inhibitors.
  if (PAH_DEFINITE_BRANDS.some((pattern) => pattern.test(medicine))) {
    return {
      subtype: "ed",
      serviceLabel: "Erectile Dysfunction",
      reason: "PAH-indicated PDE5 inhibitor brand kept as a repeat — nitrate interaction still applies",
      enforcement: "flag_only",
    }
  }
  const edDefinite = ED_DEFINITE_BRANDS.some((pattern) => pattern.test(medicine))
  const edAmbiguous =
    ED_AMBIGUOUS_BRANDS.some((pattern) => pattern.test(medicine))
    || ED_AMBIGUOUS_INGREDIENTS.some((term) => textMatchesTermFuzzily(medicine, term))
  if (edDefinite || edAmbiguous) {
    if (!edDefinite && (routingContext === "pulmonary_hypertension" || routingContext === "prostate_bph")) {
      return {
        subtype: "ed",
        serviceLabel: "Erectile Dysfunction",
        reason: `PDE5 inhibitor kept as a repeat — patient selected ${ROUTING_CONTEXT_LABELS[routingContext]}`,
        enforcement: "flag_only",
        contextOptions: PDE5I_CONTEXT_OPTIONS,
      }
    }
    return {
      subtype: "ed",
      serviceLabel: "Erectile Dysfunction",
      reason: "PDE5 inhibitor — prescribed through the ED service (nitrate + cardiac screening)",
      enforcement: "hard",
      ...(edDefinite ? {} : { contextOptions: PDE5I_CONTEXT_OPTIONS }),
    }
  }

  // Hair-loss family.
  if (HAIR_DEFINITE_BRANDS.some((pattern) => pattern.test(medicine))) {
    return {
      subtype: "hair_loss",
      serviceLabel: "Hair Loss",
      reason: "Hair-loss medicine — has a dedicated hair loss pathway",
      enforcement: "hard",
    }
  }
  if (FIVE_ARI_INGREDIENTS.some((term) => textMatchesTermFuzzily(medicine, term))) {
    if (BPH_DEFINITE.some((pattern) => pattern.test(medicine))) return null
    if (routingContext === "prostate_bph") {
      return {
        subtype: "hair_loss",
        serviceLabel: "Hair Loss",
        reason: "5α-reductase inhibitor kept as a repeat — patient selected Prostate / BPH",
        enforcement: "flag_only",
        contextOptions: FIVE_ARI_CONTEXT_OPTIONS,
      }
    }
    return {
      subtype: "hair_loss",
      serviceLabel: "Hair Loss",
      reason: "Hair-loss medicine — has a dedicated hair loss pathway",
      enforcement: "hard",
      contextOptions: FIVE_ARI_CONTEXT_OPTIONS,
    }
  }
  if (textMatchesTermFuzzily(medicine, MINOXIDIL_INGREDIENT)) {
    if (BP_DEFINITE.some((pattern) => pattern.test(medicine))) return null
    if (routingContext === "blood_pressure") {
      return {
        subtype: "hair_loss",
        serviceLabel: "Hair Loss",
        reason: "Minoxidil kept as a repeat — patient selected Blood pressure",
        enforcement: "flag_only",
        contextOptions: MINOXIDIL_CONTEXT_OPTIONS,
      }
    }
    return {
      subtype: "hair_loss",
      serviceLabel: "Hair Loss",
      reason: "Hair-loss medicine — has a dedicated hair loss pathway",
      enforcement: "hard",
      contextOptions: MINOXIDIL_CONTEXT_OPTIONS,
    }
  }

  // No known medicine matched. The indication may still name a service — worth
  // telling the doctor, never worth refusing the request.
  for (const signal of INDICATION_ONLY_SIGNALS) {
    if (signal.pattern.test(indication)) {
      return {
        subtype: signal.subtype,
        serviceLabel: signal.serviceLabel,
        reason: `Patient describes a ${signal.serviceLabel} indication on a medicine we could not identify as one`,
        enforcement: "flag_only",
      }
    }
  }

  return null
}
