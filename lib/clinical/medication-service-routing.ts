/**
 * Medication → dedicated-service routing.
 *
 * Some medicines have a dedicated InstantMed service with its own safety
 * screening (ED; hair loss; women's health). When one is entered into the
 * generic repeat-prescription / prescription flow, we route the patient to
 * that service rather than silently letting it through the generic path.
 *
 * Routing is TIERED (see `DedicatedServiceEnforcement`) because the three
 * services do not share one intent story:
 *  - finasteride/dutasteride are also BPH (prostate) medicines — a 5 mg
 *    finasteride (Proscar) or dutasteride 0.5 mg (Avodart/Duodart) repeat is a
 *    legitimate repeat prescription, NOT hair loss, so those are excluded.
 *  - PDE5 inhibitors are also PAH (Revatio, sildenafil 20 mg) and BPH
 *    (low-dose daily tadalafil) medicines, so a *stated* non-ED context keeps
 *    the repeat and tells the doctor instead.
 *  - "continue my current pill" is deliberately a cheap repeat, not a consult
 *    (see lib/request/consult-subtypes.ts + womens-health-type-step.tsx).
 * A doctor-visible flag (lib/clinical/derive-intake-flags.ts) plus the
 * checkout block in lib/validation/repeat-script-schema.ts are the server-side
 * backstops, so the decision is never client-only.
 *
 * UTI antibiotics are intentionally out of scope: acute antibiotic courses are
 * not repeat scripts, so patients don't reach repeat-Rx with one.
 */

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
 *    `dedicated_service_medication` flag. A PDE5 inhibitor whose stated
 *    indication is BPH/PAH — a legitimate repeat, but self-reported, so the
 *    reviewer is told rather than the patient being waved through silently.
 */
// Not exported: callers branch on `match.enforcement` through
// DedicatedServiceMatch and never need the alias by name (the dead-code
// ratchet fails on an export nothing imports).
type DedicatedServiceEnforcement = "hard" | "soft" | "flag_only"

export interface DedicatedServiceMatch {
  /** Consult subtype to deep-link into (`/request?service=consult&subtype=…`). */
  subtype: DedicatedServiceSubtype
  /** Human label for CTAs / flag detail, e.g. "Hair Loss". */
  serviceLabel: string
  /** Why it matched — surfaced to the doctor as the flag detail. */
  reason: string
  /** How the match is enforced in the UI and at checkout. */
  enforcement: DedicatedServiceEnforcement
}

// Hair-loss signal: dedicated hair brands + the generic 5α-reductase / minoxidil
// names. These are matched against the MEDICINE text only (see the intent-binding
// note on the classifier). Generic "finasteride"/"dutasteride"/"minoxidil" are
// ambiguous (hair vs prostate vs blood pressure) and are disambiguated by
// HAIR_LOSS_EXEMPTION_MARKERS below.
const HAIR_LOSS_PATTERNS: ReadonlyArray<RegExp> = [
  /\bpropecia\b/i,
  /\bfinpecia\b/i,
  /\bfinasteride\b/i,
  /\bdutasteride\b/i,
  /\bminoxidil\b/i,
  /\brogaine\b/i,
  /\bregaine\b/i,
]

// Stated non-cosmetic context for a 5α-reductase inhibitor or minoxidil. These
// are ordinary repeats and must NOT be routed to hair loss:
//  - BPH / prostate (finasteride 5 mg, dutasteride 0.5 mg, Proscar, Avodart)
//  - hypertension — ORAL minoxidil (Loniten, PBS-listed 10 mg) is an
//    antihypertensive for severe refractory hypertension, NOT a hair medicine.
//    Dose cannot discriminate it (topical 5% is the hair product), so the
//    stated indication is what exempts it.
const HAIR_LOSS_EXEMPTION_MARKERS: ReadonlyArray<RegExp> = [
  /\bproscar\b/i,
  /\bavodart\b/i,
  /\bduodart\b/i,
  /\bcombodart\b/i,
  /\bloniten\b/i,
  /\btamsulosin\b/i,
  /\bprostate\b/i,
  /\bbph\b/i,
  /benign\s+prostatic/i,
  /\bluts\b/i,
  /hypertension/i,
  /\bhtn\b/i,
  /blood\s*pressure/i,
  // finasteride 5 mg (Proscar) — BPH dose. 1 mg is the hair dose.
  /finasteride[^0-9]{0,10}5\s*mg/i,
  // dutasteride 0.5 mg — BPH dose.
  /dutasteride[^0-9]{0,10}0\.?5\s*mg/i,
]

// Oral contraceptive pill: active ingredients + common Australian brands.
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

// PDE5 inhibitors: active ingredients + AU brands. The ED service owns these —
// it runs the nitrate hard block and cardiac screen that the generic repeat
// flow never asks for. The last three patterns read the indication answer
// ("what is this medication for?"), which is how an unlisted brand still
// routes — and is exactly what the patients in the 2026-08-05 review typed.
// PDE5 inhibitors, by ingredient and AU brand. Matched against the MEDICINE
// text only. Brand coverage includes the non-ED-indicated brands (Revatio and
// Adcirca are PAH products) so the reviewing doctor still sees a PDE5 inhibitor
// on the request — the nitrate interaction exists whatever it is taken for.
const ED_PATTERNS: ReadonlyArray<RegExp> = [
  /\bsildenafil\b/i,
  /\btadalafil\b/i,
  /\bvardenafil\b/i,
  /\bavanafil\b/i,
  /\bviagra\b/i,
  /\bcialis\b/i,
  /\blevitra\b/i,
  /\bspedra\b/i,
  /\bvedafil\b/i,
  /\bsilvasta\b/i,
  /\bsilagra\b/i,
  /\btadacip\b/i,
  /\bkamagra\b/i,
  /\brevatio\b/i,
  /\badcirca\b/i,
]

// Stated non-ED context for a PDE5 inhibitor: pulmonary arterial hypertension
// (Revatio, Adcirca) or BPH/LUTS (low-dose daily tadalafil). These downgrade
// hard → flag_only rather than to null: unlike the hair-loss exemptions, a PDE5
// inhibitor still carries the nitrate interaction whatever it treats, so the
// doctor is always told.
//
// Dose NEVER exempts. Tadalafil 5 mg daily is also the ED daily preset, and
// sildenafil 20 mg (the PAH strength) is trivially orderable as an ED dose —
// only a stated clinical context exempts.
const ED_REPEAT_CONTEXT_MARKERS: ReadonlyArray<RegExp> = [
  /\brevatio\b/i,
  /\badcirca\b/i,
  /pulmonary\s+(?:arterial\s+)?hypertension/i,
  /\bpah\b/i,
  /\bprostate\b/i,
  /\bbph\b/i,
  /benign\s+prostatic/i,
  /\bluts\b/i,
]

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

// Weight-loss-class medicines. The weight-loss service is GATED (reserved
// $89.95, not launched — docs/CLINICAL.md keeps it manual-review-only), so
// there is no live destination to steer anyone to. These are deliberately
// flag-only rather than blocked: several are ALSO legitimate type-2-diabetes
// repeats (Ozempic, Victoza, Mounjaro), and blocking would wall diabetic
// patients out of a medicine they have taken for years. The doctor decides
// with the flag and the patient's stated indication in view.
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
      reason: "weight-loss-class medicine, service gated; may also be a diabetes repeat",
    }
  }

  return null
}

/**
 * Classify a repeat request into a dedicated service, or null if it belongs in
 * the generic repeat/prescription flow.
 *
 * INTENT BINDING — the two arguments are deliberately NOT concatenated before
 * matching drug patterns, and this is load-bearing for care access:
 *  - A steer or a checkout block requires the DRUG to be named in
 *    `medicationText`. Only a medicine can be routed to a medicine's service.
 *  - `indicationText` may only ever SOFTEN (a stated prostate/PAH/hypertension
 *    context) or raise a flag_only mention. It can never escalate to a block.
 * Matching drug patterns across a concatenated blob let an unrelated repeat be
 * refused at checkout because the patient mentioned a condition in passing
 * ("atorvastatin — cholesterol, I also have ED"). Do not reintroduce that.
 */
export function detectDedicatedServiceForMedication(
  medicationText: string | undefined | null,
  indicationText?: string | undefined | null,
): DedicatedServiceMatch | null {
  const medicine = typeof medicationText === "string" ? medicationText.toLowerCase() : ""
  const indication = typeof indicationText === "string" ? indicationText.toLowerCase() : ""
  if (!medicine.trim() && !indication.trim()) return null

  // Context that softens a match may be stated in either field — a patient can
  // write "Proscar" as the medicine or "for my prostate" as the indication.
  const context = `${medicine} ${indication}`

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

  if (ED_PATTERNS.some((pattern) => pattern.test(medicine))) {
    const statedNonEdContext = ED_REPEAT_CONTEXT_MARKERS.some((pattern) => pattern.test(context))
    return {
      subtype: "ed",
      serviceLabel: "Erectile Dysfunction",
      reason: statedNonEdContext
        ? "PDE5 inhibitor kept as a repeat — patient states a BPH/PAH indication"
        : "PDE5 inhibitor — prescribed through the ED service (nitrate + cardiac screening)",
      enforcement: statedNonEdContext ? "flag_only" : "hard",
    }
  }

  if (HAIR_LOSS_PATTERNS.some((pattern) => pattern.test(medicine))) {
    // A stated prostate or blood-pressure indication makes this an ordinary
    // repeat, with no flag: unlike a PDE5 inhibitor, these carry no
    // service-specific interaction the doctor needs warning about.
    const exempt = HAIR_LOSS_EXEMPTION_MARKERS.some((pattern) => pattern.test(context))
    if (!exempt) {
      return {
        subtype: "hair_loss",
        serviceLabel: "Hair Loss",
        reason: "Hair-loss medicine — has a dedicated hair loss pathway",
        enforcement: "hard",
      }
    }
    return null
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
