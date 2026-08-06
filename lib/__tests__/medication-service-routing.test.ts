import { describe, expect, it } from "vitest"

import { deriveIntakeFlags } from "@/lib/clinical/derive-intake-flags"
import {
  detectDedicatedServiceForMedication,
  detectGatedServiceMedication,
} from "@/lib/clinical/medication-service-routing"

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

  it("downgrades a PDE5 inhibitor with stated BPH / PAH context to flag_only", () => {
    for (const [medicine, indication] of [
      ["Revatio 20mg", ""],
      ["Adcirca 20mg", "pulmonary arterial hypertension"],
      ["sildenafil 20mg", "pulmonary hypertension"],
      ["tadalafil 5mg", "BPH"],
      ["tadalafil", "prostate symptoms"],
    ] as const) {
      const match = detectDedicatedServiceForMedication(medicine, indication)
      expect(match?.subtype, medicine).toBe("ed")
      expect(match?.enforcement, medicine).toBe("flag_only")
    }
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
    // Oral minoxidil (Loniten, PBS 10 mg) is an antihypertensive for severe
    // refractory hypertension. Dose cannot discriminate it from the 5% topical
    // hair product, so the stated indication must exempt it.
    for (const [medicine, indication] of [
      ["minoxidil 10 mg", "hypertension"],
      ["Minoxidil 10mg", "severe refractory high blood pressure"],
      ["Loniten", ""],
    ] as const) {
      expect(detectDedicatedServiceForMedication(medicine, indication), medicine).toBeNull()
    }
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
    ] as const) {
      const match = detectDedicatedServiceForMedication(medicine, indication)
      expect(match?.enforcement, `${medicine} | ${indication}`).toBe("hard")
    }

    for (const [medicine, indication] of [
      ["sildenafil", "not for pulmonary hypertension"],
      ["tadalafil 5mg", "no prostate issues"],
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

  it("scopes negation to its own clause", () => {
    // "no allergies" must not poison a genuine exemption in the next clause.
    expect(detectDedicatedServiceForMedication("minoxidil 10mg", "no allergies, for my blood pressure")).toBeNull()
    expect(detectDedicatedServiceForMedication("finasteride 5mg", "no side effects; prostate")).toBeNull()
  })

  it("binds each exemption to the medicine class it can plausibly excuse", () => {
    // A prostate indication says nothing about minoxidil, and a blood-pressure
    // indication says nothing about finasteride.
    expect(detectDedicatedServiceForMedication("minoxidil 5%", "prostate")?.enforcement).toBe("hard")
    expect(detectDedicatedServiceForMedication("finasteride 1mg", "hypertension")?.enforcement).toBe("hard")
    // …and each still works for its own class.
    expect(detectDedicatedServiceForMedication("minoxidil 10mg", "hypertension")).toBeNull()
    expect(detectDedicatedServiceForMedication("finasteride 5mg", "prostate")).toBeNull()
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

describe("detectGatedServiceMedication", () => {
  it("flags weight-loss-class medicines (GLP-1, phentermine, orlistat)", () => {
    for (const name of [
      "semaglutide",
      "Ozempic 1mg",
      "Wegovy",
      "Rybelsus 7mg",
      "tirzepatide",
      "Mounjaro",
      "Zepbound",
      "liraglutide",
      "Saxenda",
      "Victoza",
      "phentermine 30mg",
      "Duromine",
      "Metermine",
      "orlistat",
      "Xenical",
    ]) {
      expect(detectGatedServiceMedication(name)?.serviceLabel).toBe("Weight loss")
    }
  })

  it("leaves ordinary repeat medicines alone", () => {
    for (const name of ["atorvastatin 20mg", "metformin 500mg", "Sertraline"]) {
      expect(detectGatedServiceMedication(name)).toBeNull()
    }
  })

  it("is null-safe for empty / missing input", () => {
    expect(detectGatedServiceMedication("")).toBeNull()
    expect(detectGatedServiceMedication(undefined)).toBeNull()
    expect(detectGatedServiceMedication(null)).toBeNull()
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
