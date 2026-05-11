export type NormalizedMedicationProduct = Record<string, unknown> & {
  drug_name: string
  strength?: string
  form?: string
  pbs_code?: string
}

export interface NormalizedMedicationEntry {
  product: NormalizedMedicationProduct | null
  name: string
  strength?: string
  form?: string
  pbsCode?: string
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function stringAnswer(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function stringArrayAnswer(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

export function normalizeMedicationProductAnswer(value: unknown): NormalizedMedicationProduct | null {
  if (!isPlainRecord(value)) return null

  const drugName = stringAnswer(value.drug_name)
  if (!drugName) return null

  const rest = { ...value }
  delete rest.drug_name
  delete rest.strength
  delete rest.form
  delete rest.pbs_code
  const product: NormalizedMedicationProduct = {
    ...rest,
    drug_name: drugName,
  }
  const strength = stringAnswer(value.strength)
  const form = stringAnswer(value.form)
  const pbsCode = stringAnswer(value.pbs_code)

  if (strength) product.strength = strength
  if (form) product.form = form
  if (pbsCode) product.pbs_code = pbsCode

  return product
}

function normalizeMedicationEntryAnswer(value: unknown): NormalizedMedicationEntry | null {
  if (!isPlainRecord(value)) return null

  const product = normalizeMedicationProductAnswer(value.product)
  const name = stringAnswer(value.name) || product?.drug_name || ""
  const strength = stringAnswer(value.strength) || product?.strength || ""
  const form = stringAnswer(value.form) || product?.form || ""
  const pbsCode = stringAnswer(value.pbsCode) || product?.pbs_code || ""

  if (!product && !name && !strength && !form && !pbsCode) {
    return null
  }

  return {
    product,
    name,
    strength,
    form,
    pbsCode,
  }
}

export function normalizeMedicationEntriesAnswer(value: unknown): NormalizedMedicationEntry[] {
  if (!Array.isArray(value)) return []

  return value
    .map(normalizeMedicationEntryAnswer)
    .filter((item): item is NormalizedMedicationEntry => item !== null)
}
