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

  it("routes an unlisted brand named as ED in the indication text", () => {
    const match = detectDedicatedServiceForMedication("Silagra 100mg for erectile dysfunction")
    expect(match?.subtype).toBe("ed")
    expect(match?.enforcement).toBe("hard")
  })

  it("downgrades a PDE5 inhibitor with stated BPH / PAH context to flag_only", () => {
    for (const name of [
      "Revatio 20mg",
      "sildenafil 20mg pulmonary hypertension",
      "tadalafil 5mg for BPH",
      "tadalafil daily prostate symptoms",
    ]) {
      const match = detectDedicatedServiceForMedication(name)
      expect(match?.subtype).toBe("ed")
      expect(match?.enforcement).toBe("flag_only")
    }
  })

  it("does NOT exempt tadalafil 5mg on dose alone (5mg daily is also the ED preset)", () => {
    expect(detectDedicatedServiceForMedication("tadalafil 5mg")?.enforcement).toBe("hard")
  })

  it("keeps every-day contraceptive packs on women's health, not ED", () => {
    // "ED" on an AU pill pack means "every day". OCP is matched first so the
    // bare `ed` token can never steal a contraceptive repeat.
    for (const name of ["Levlen ED", "Microgynon 30 ED", "Femme-Tab ED 20/100"]) {
      expect(detectDedicatedServiceForMedication(name)?.subtype).toBe("womens_health")
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
