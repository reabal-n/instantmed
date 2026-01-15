import { useState, useCallback } from "react"
import type { SelectedPBSProduct } from "@/components/intake/medication-search"

/**
 * Hook for integrating PBS medication search into intake forms.
 *
 * Tracks:
 * - medication_search_used: whether the patient interacted with search
 * - medication_selected: whether they selected a result
 * - selected_pbs_code: the PBS code if selected
 * - selected_medication_name: the drug name
 *
 * Per MEDICATION_SEARCH_SPEC.md section 5: Interaction Logging
 */

export interface MedicationSearchState {
  searchUsed: boolean
  selected: SelectedPBSProduct | null
}

export interface MedicationSearchActions {
  setSelected: (product: SelectedPBSProduct | null) => void
  markSearchUsed: () => void
  reset: () => void
  getAuditData: () => {
    medication_search_used: boolean
    medication_selected: boolean
    selected_pbs_code: string | null
    selected_medication_name: string | null
  }
}

export function useMedicationSearch(): [
  MedicationSearchState,
  MedicationSearchActions
] {
  const [searchUsed, setSearchUsed] = useState(false)
  const [selected, setSelectedState] = useState<SelectedPBSProduct | null>(
    null
  )

  const setSelected = useCallback((product: SelectedPBSProduct | null) => {
    setSelectedState(product)
    if (product) {
      setSearchUsed(true)
    }
  }, [])

  const markSearchUsed = useCallback(() => {
    setSearchUsed(true)
  }, [])

  const reset = useCallback(() => {
    setSearchUsed(false)
    setSelectedState(null)
  }, [])

  const getAuditData = useCallback(() => {
    return {
      medication_search_used: searchUsed,
      medication_selected: selected !== null,
      selected_pbs_code: selected?.pbs_code ?? null,
      selected_medication_name: selected?.drug_name ?? null,
    }
  }, [searchUsed, selected])

  return [
    { searchUsed, selected },
    { setSelected, markSearchUsed, reset, getAuditData },
  ]
}
