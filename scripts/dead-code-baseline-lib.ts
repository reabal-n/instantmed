export type DeadCodeMode = "full" | "production"

export interface DeadCodeKey {
  mode: DeadCodeMode
  issueType: string
  file: string
  symbol: string
}

export interface DeadCodeComparison {
  newKeys: string[]
  staleKeys: string[]
}

export interface KnipJsonReport {
  issues: Array<Record<string, unknown> & { file: string }>
}

export function assertCanonicalDeadCodeKeys(
  keys: unknown,
): asserts keys is string[] {
  if (!Array.isArray(keys) || !keys.every((key) => typeof key === "string")) {
    throw new Error("Dead-code baseline keys must be strings")
  }

  const canonicalKeys = [...new Set(keys)].sort()
  if (
    canonicalKeys.length !== keys.length ||
    canonicalKeys.some((key, index) => key !== keys[index])
  ) {
    throw new Error(
      "Dead-code baseline keys must be sorted and unique; run pnpm deadcode:baseline",
    )
  }
}

export function serializeKey(key: DeadCodeKey): string {
  return `${key.mode}|${key.issueType}|${normalizePath(key.file)}|${normalizePath(key.symbol)}`
}

export function normalizeKnipReport(
  mode: DeadCodeMode,
  report: KnipJsonReport,
): string[] {
  const keys = new Set<string>()

  for (const issueGroup of report.issues) {
    for (const [issueType, items] of Object.entries(issueGroup)) {
      if (issueType === "file" || issueType === "owners" || !Array.isArray(items)) {
        continue
      }

      for (const item of items) {
        keys.add(
          serializeKey({
            mode,
            issueType,
            file: issueGroup.file,
            symbol: readIssueName(issueType, item),
          }),
        )
      }
    }
  }

  return [...keys].sort()
}

export function compareDeadCodeKeys(
  currentKeys: string[],
  baselineKeys: string[],
): DeadCodeComparison {
  const current = new Set(currentKeys)
  const baseline = new Set(baselineKeys)

  return {
    newKeys: [...current].filter((key) => !baseline.has(key)).sort(),
    staleKeys: [...baseline].filter((key) => !current.has(key)).sort(),
  }
}

function readIssueName(issueType: string, item: unknown): string {
  if (issueType === "duplicates" && Array.isArray(item)) {
    return item.map((member) => readIssueName(issueType, member)).sort().join(",")
  }
  if (typeof item === "string") return item
  if (
    item &&
    typeof item === "object" &&
    "name" in item &&
    typeof item.name === "string"
  ) {
    return item.name
  }

  throw new Error(`Unsupported Knip ${issueType} issue shape`)
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "")
}
