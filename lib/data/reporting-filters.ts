import { filterSeededE2EIntakes, type SeededE2EFilterOptions } from "@/lib/data/seeded-e2e-data"

type ReportingFilterQuery = {
  or(column: string): unknown
  not(column: string, operator: string, value: string): unknown
}

export interface ReportingFilterOptions extends SeededE2EFilterOptions {
  includeExcludedFromReporting?: boolean
}

/**
 * Canonical live-reporting filter for business metrics.
 *
 * Use this for revenue, conversion, KPI, and monitoring reads. Do not use it
 * for clinical queues or support recovery, where an excluded test row may still
 * need to be visible to an authorised operator.
 */
export function filterReportableIntakes<T extends ReportingFilterQuery>(
  query: T,
  options: ReportingFilterOptions = {},
): T {
  if (options.includeExcludedFromReporting) {
    return filterSeededE2EIntakes(query, options)
  }

  const withoutExcluded = query.or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false") as T
  return filterSeededE2EIntakes(withoutExcluded, options)
}
