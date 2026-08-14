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
 * Use this for revenue, conversion, KPI, and explicitly reportable operational
 * monitoring reads. Do not apply it to a live clinical queue or general support
 * recovery by default, where an excluded row may still need authorised action.
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
