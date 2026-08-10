import { describe, expect, it } from "vitest"

import { deriveIntakeFlags } from "@/lib/clinical/derive-intake-flags"
import { detectDedicatedServiceForMedication } from "@/lib/clinical/medication-service-routing"

describe("detectDedicatedServiceForMedication", () => {
  it("routes hair-loss medicines to hair_loss", () => {
    for (const name of ["Finasteride", "finasteride 1mg", "Propecia", "Finpecia", "Minoxidil", "Rogaine", "Regaine"]) {
      expect(detectDedicatedServiceForMedication(name)?.subtype).toBe("hair_loss")
    }
  })

  it("does NOT route BPH / prostate 5α-reductase inhibitors (legitimate repeats)", () => {
    for (const name of ["Proscar", "finasteride 5 mg", "finasteride 5mg", "Avodart", "Duodart", "dutasteride 0.5 mg", "tamsulosin for prostate"]) {
      expect(detectDedicatedServiceForMedication(name)).toBeNull()
    }
  })

  it("routes oral contraceptive pills to womens_health (brands + active ingredients)", () => {
    for (const name of [
      "Microgynon 30",
      "Yasmin",
      "Yaz",
      "Levlen ED",
      "levonorgestrel + ethinylestradiol",
      "Slinda",
      "Cerazette",
      "Diane-35",
    ]) {
      expect(detectDedicatedServiceForMedication(name)?.subtype).toBe("womens_health")
    }
  })

  it("leaves ordinary repeat medicines (and out-of-scope UTI antibiotics) alone", () => {
    for (const name of ["Atorvastatin", "Metformin", "Sertraline", "Amoxicillin", "Trimethoprim", "Nitrofurantoin", "Cephalexin"]) {
      expect(detectDedicatedServiceForMedication(name)).toBeNull()
    }
  })

  it("is null-safe for empty / missing input", () => {
    expect(detectDedicatedServiceForMedication("")).toBeNull()
    expect(detectDedicatedServiceForMedication(undefined)).toBeNull()
    expect(detectDedicatedServiceForMedication(null)).toBeNull()
  })

  it("routes PDE5 inhibitors to ed with hard enforcement", () => {
    for (const name of [
      "Sildenafil",
      "sildenafil 100mg tablet",
      "Viagra",
      "CIALIS 20mg",
      "tadalafil",
      "vardenafil",
      "Levitra",
      "avanafil",
      "Spedra",
      "Vedafil 50mg",
      "silvasta",
    ]) {
      const match = detectDedicatedServiceForMedication(name)
      expect(match?.subtype).toBe("ed")
      expect(match?.enforcement).toBe("hard")
    }
  })

  it("covers the PAH-indicated PDE5 brands so the doctor still sees the interaction", () => {
    for (const name of ["Revatio 20mg", "Adcirca 20mg"]) {
      expect(detectDedicatedServiceForMedication(name)?.subtype).toBe("ed")
    }
  })

  it("downgrades PAH-only PDE5 brands to flag_only with no question", () => {
    // Revatio/Adcirca exist only as PAH products; the doctor is still told
    // because the nitrate interaction applies whatever the indication.
    for (const medicine of ["Revatio 20mg", "Adcirca 20mg"]) {
      const match = detectDedicatedServiceForMedication(medicine)
      expect(match?.subtype, medicine).toBe("ed")
      expect(match?.enforcement, medicine).toBe("flag_only")
      expect(match?.contextOptions, medicine).toBeUndefined()
    }
  })

  it("exempts an ambiguous PDE5 inhibitor ONLY via the structured context token", () => {
    // Free-text indications no longer exempt — two review rounds proved that
    // inferring intent from free text either refused care or leaked the lane.
    expect(detectDedicatedServiceForMedication("sildenafil 20mg", "pulmonary hypertension")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("tadalafil 5mg", "BPH")?.enforcement).toBe("hard")

    for (const token of ["pulmonary_hypertension", "prostate_bph"] as const) {
      const match = detectDedicatedServiceForMedication("sildenafil 100mg", "", token)
      expect(match?.enforcement, token).toBe("flag_only")
      expect(match?.reason, token).toContain("patient selected")
    }
    // The routed condition (or garbage) keeps the steer.
    expect(detectDedicatedServiceForMedication("sildenafil", "", "erectile_dysfunction")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("sildenafil", "", "definitely-not-a-token")?.enforcement).toBe("hard")
  })

  it("never exempts on dose alone — only a stated indication does", () => {
    // tadalafil 5mg is the ED daily preset; sildenafil 20mg is trivially
    // orderable as an ED dose. Both stay hard without a stated context.
    expect(detectDedicatedServiceForMedication("tadalafil 5mg")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("sildenafil 20mg")?.enforcement).toBe("hard")
  })

  it("never hard-blocks an unrelated repeat because the indication mentions a condition", () => {
    // Regression: concatenating medicine + indication let a statin be refused
    // at checkout because the patient mentioned erectile dysfunction.
    for (const [medicine, indication] of [
      ["Atorvastatin 20mg", "cholesterol, I also have erectile dysfunction"],
      ["Metformin 500mg", "diabetes and impotence"],
      ["Sertraline 50mg", "depression — some hair loss too"],
    ] as const) {
      const match = detectDedicatedServiceForMedication(medicine, indication)
      expect(match?.enforcement, medicine).toBe("flag_only")
    }
  })

  it("flags, but does not block, a service named only in the indication", () => {
    // Penegra is a real sildenafil brand we do not list. We cannot prove it is
    // a PDE5 inhibitor, so the doctor is told rather than the patient refused.
    const match = detectDedicatedServiceForMedication("Penegra 100mg", "erectile dysfunction")
    expect(match?.subtype).toBe("ed")
    expect(match?.enforcement).toBe("flag_only")
  })

  it("treats oral minoxidil for hypertension as an ordinary repeat", () => {
    // Loniten is the BP-only brand — deterministic, silent exemption. Generic
    // minoxidil needs the patient's structured answer, which always flags.
    expect(detectDedicatedServiceForMedication("Loniten")).toBeNull()
    expect(detectDedicatedServiceForMedication("minoxidil (Loniten) 10 mg")).toBeNull()

    const attested = detectDedicatedServiceForMedication("minoxidil 10 mg", "hypertension", "blood_pressure")
    expect(attested?.enforcement).toBe("flag_only")
    expect(attested?.reason).toContain("Blood pressure")

    // Free-text hypertension alone no longer exempts.
    expect(detectDedicatedServiceForMedication("minoxidil 10 mg", "hypertension")?.enforcement).toBe("hard")
  })

  it("still routes minoxidil taken for hair", () => {
    expect(detectDedicatedServiceForMedication("minoxidil 5%", "hair loss")?.enforcement).toBe("hard")
  })

  it("requires an AFFIRMATIVE exemption — a denial must not unlock the generic lane", () => {
    // The steer copy names the exempting conditions, so a bare marker match
    // effectively published the escape words. Negated context must not exempt.
    for (const [medicine, indication] of [
      ["finasteride 1 mg", "no high blood pressure"],
      ["minoxidil 5%", "not BPH"],
      ["finasteride 1mg", "never had prostate problems"],
      ["minoxidil 5%", "nil hypertension"],
      ["minoxidil 5%", "don't have blood pressure problems"],
      ["finasteride 1mg", "didn't get this for my prostate"],
    ] as const) {
      const match = detectDedicatedServiceForMedication(medicine, indication)
      expect(match?.enforcement, `${medicine} | ${indication}`).toBe("hard")
    }

    for (const [medicine, indication] of [
      ["sildenafil", "not for pulmonary hypertension"],
      ["tadalafil 5mg", "no prostate issues"],
      // Contractions are negations too — "haven't got pulmonary hypertension"
      // must not read as a PAH claim.
      ["sildenafil", "haven't got pulmonary hypertension"],
      ["tadalafil 5mg", "doesn't relate to my prostate"],
    ] as const) {
      const match = detectDedicatedServiceForMedication(medicine, indication)
      expect(match?.enforcement, `${medicine} | ${indication}`).toBe("hard")
    }
  })

  it("does not split a decimal dose when scoping clauses", () => {
    // "dutasteride 0.5 mg" must not become "dutasteride 0" + "5 mg", which
    // silently lost the BPH exemption.
    expect(detectDedicatedServiceForMedication("dutasteride 0.5 mg")).toBeNull()
    expect(detectDedicatedServiceForMedication("dutasteride 0.5mg", "prostate")).toBeNull()
  })

  it("binds each context token to the medicine class it can plausibly excuse", () => {
    // A prostate token says nothing about minoxidil, and a blood-pressure
    // token says nothing about finasteride or a PDE5 inhibitor.
    expect(detectDedicatedServiceForMedication("minoxidil 5%", "", "prostate_bph")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("finasteride 1mg", "", "blood_pressure")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("sildenafil", "", "hair_loss")?.enforcement).toBe("hard")
    // …and each token works for its own class, always flagged (attestation).
    expect(detectDedicatedServiceForMedication("finasteride 1mg", "", "prostate_bph")?.enforcement).toBe("flag_only")
    expect(detectDedicatedServiceForMedication("minoxidil 5%", "", "blood_pressure")?.enforcement).toBe("flag_only")
    // Deterministic medicine facts still exempt silently — nothing was claimed.
    expect(detectDedicatedServiceForMedication("finasteride 5mg", "prostate")).toBeNull()
  })

  it("asks the question only for multi-indication medicines", () => {
    // Single-indication brands are decisive — no question, no options.
    expect(detectDedicatedServiceForMedication("Viagra")?.contextOptions).toBeUndefined()
    expect(detectDedicatedServiceForMedication("Propecia")?.contextOptions).toBeUndefined()
    // Ambiguous generics carry exactly their class's options.
    expect(detectDedicatedServiceForMedication("sildenafil")?.contextOptions).toEqual([
      "erectile_dysfunction", "pulmonary_hypertension", "prostate_bph",
    ])
    expect(detectDedicatedServiceForMedication("finasteride 1mg")?.contextOptions).toEqual([
      "hair_loss", "prostate_bph",
    ])
    expect(detectDedicatedServiceForMedication("minoxidil")?.contextOptions).toEqual([
      "hair_loss", "blood_pressure",
    ])
  })

  it("catches real-world typos of the generic ingredients", () => {
    // 2 of 2 production repeat requests on 2026-08-06 misspelled their
    // medicine. Long generic names get typo tolerance; brands stay exact.
    for (const typo of ["sildenafl", "sidenafil", "tadalafl", "finasterde", "finastride", "minoxidl", "dutasterid"]) {
      expect(detectDedicatedServiceForMedication(typo)?.enforcement, typo).toBe("hard")
    }
  })

  it("never fuzzy-matches ordinary Australian repeat medicines (collision corpus)", () => {
    // The named hazard: Silvasta (a sildenafil brand, exact-matched) must not
    // drag Simvastatin in via fuzz — the length gate keeps them apart.
    for (const medicine of [
      "Simvastatin 40mg", "Atorvastatin", "Rosuvastatin", "Pravastatin",
      "Sertraline", "Escitalopram", "Citalopram", "Fluoxetine", "Venlafaxine",
      "Mirtazapine", "Metformin", "Perindopril", "Ramipril", "Amlodipine",
      "Telmisartan", "Candesartan", "Irbesartan", "Pantoprazole",
      "Esomeprazole", "Omeprazole", "Salbutamol", "Budesonide",
      "Levothyroxine", "Rivaroxaban", "Apixaban", "Tamsulosin", "Tramadol",
      // The two real typos from production on 2026-08-06:
      "Clopidigrel", "Propanolol",
    ]) {
      expect(detectDedicatedServiceForMedication(medicine), medicine).toBeNull()
    }
  })

  it("keeps every-day contraceptive packs on women's health, not ED", () => {
    // "ED" on an AU pill pack means "every day". OCP is matched first so the
    // bare `ed` token can never steal a contraceptive repeat.
    for (const name of ["Levlen ED", "Microgynon 30 ED", "Femme-Tab ED 20/100"]) {
      expect(detectDedicatedServiceForMedication(name)?.subtype).toBe("womens_health")
    }
  })

  it("does not match drug names hidden inside ordinary words", () => {
    // The indication answer is part of the scan text, so everyday phrasing has
    // to stay clear of the brand patterns — "spe(cialis)t" is the sharp one.
    for (const text of [
      "Rosuvastatin — prescribed by my specialist",
      "Ventolin, take as needed",
      "Sertraline, my med list is up to date",
    ]) {
      expect(detectDedicatedServiceForMedication(text)).toBeNull()
    }
  })

  it("pins the enforcement tier of the existing classes", () => {
    expect(detectDedicatedServiceForMedication("finasteride 1mg")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("Microgynon 30")?.enforcement).toBe("soft")
  })
})

describe("weight-management routing (service live 2026-08-07)", () => {
  it("hard-steers weight-only GLP-1 brands with no question", () => {
    for (const name of ["Wegovy", "Saxenda", "Zepbound 2.5mg"]) {
      const match = detectDedicatedServiceForMedication(name)
      expect(match?.subtype, name).toBe("weight_loss")
      expect(match?.enforcement, name).toBe("hard")
      expect(match?.contextOptions, name).toBeUndefined()
    }
  })

  it("asks the weight-vs-diabetes question for dual-indication GLP-1s", () => {
    for (const name of ["Ozempic 1mg", "Victoza", "Mounjaro", "Rybelsus", "semaglutide", "tirzepatide", "liraglutide"]) {
      const match = detectDedicatedServiceForMedication(name)
      expect(match?.subtype, name).toBe("weight_loss")
      expect(match?.enforcement, name).toBe("hard")
      expect(match?.contextOptions, name).toEqual(["weight_management", "type_2_diabetes"])
    }
  })

  it("keeps a diabetic's GLP-1 repeat via the structured token — always flagged", () => {
    // The original D2 concern: Ozempic-for-diabetes must never be walled out.
    const match = detectDedicatedServiceForMedication("Ozempic 1mg", "type 2 diabetes", "type_2_diabetes")
    expect(match?.enforcement).toBe("flag_only")
    expect(match?.reason).toContain("Type 2 diabetes")
    // Free text alone does NOT exempt — the token does.
    expect(detectDedicatedServiceForMedication("Ozempic 1mg", "type 2 diabetes")?.enforcement).toBe("hard")
  })

  it("catches GLP-1 ingredient typos", () => {
    for (const typo of ["semaglutid", "semmaglutide", "tirzepatid"]) {
      expect(detectDedicatedServiceForMedication(typo)?.subtype, typo).toBe("weight_loss")
    }
  })

  it("flags but never steers weight-only out-of-scope medicines (D-B)", () => {
    // Steering phentermine into a consult that would decline it is
    // pay-to-be-refused churn; the doctor declines in the cheap lane instead.
    for (const name of ["Phentermine 30mg", "Duromine", "Metermine", "Orlistat", "Xenical"]) {
      const match = detectDedicatedServiceForMedication(name)
      expect(match?.subtype, name).toBe("weight_loss")
      expect(match?.enforcement, name).toBe("flag_only")
      expect(match?.contextOptions, name).toBeUndefined()
    }
  })

  it("leaves ordinary metabolic medicines alone", () => {
    for (const name of ["Metformin 500mg", "Empagliflozin", "Atorvastatin"]) {
      expect(detectDedicatedServiceForMedication(name), name).toBeNull()
    }
  })
})

describe("deriveIntakeFlags — dedicated_service_medication", () => {
  const repeatBase = { category: "prescription", subtype: "repeat" as const }
  const complete = { current_dose: "one daily", prescribed_before: true, dose_changed: false }

  it("flags a finasteride repeat for the doctor (hair loss)", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: { medications: [{ name: "Finasteride", strength: "1 mg", form: "tablet", pbsCode: "1234" }], ...complete },
    })
    const flag = flags.find((f) => f.code === "dedicated_service_medication")
    expect(flag).toBeDefined()
    expect(flag?.severity).toBe("attention")
    expect(flag?.detail).toContain("Hair Loss")
  })

  it("flags an OCP repeat for the doctor (women's health)", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: { medications: [{ name: "Microgynon", strength: "30", form: "tablet", pbsCode: "1234" }], ...complete },
    })
    const flag = flags.find((f) => f.code === "dedicated_service_medication")
    expect(flag?.detail).toContain("Women's Health")
  })

  it("does NOT flag a BPH finasteride 5mg repeat", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: { medications: [{ name: "Finasteride", strength: "5 mg", form: "tablet", pbsCode: "1234" }], ...complete },
    })
    expect(flags.find((f) => f.code === "dedicated_service_medication")).toBeUndefined()
  })

  it("does NOT flag an ordinary repeat medicine", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: { medications: [{ name: "Atorvastatin", strength: "20 mg", form: "tablet", pbsCode: "1234" }], ...complete },
    })
    expect(flags.find((f) => f.code === "dedicated_service_medication")).toBeUndefined()
  })
})
