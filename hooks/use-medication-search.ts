import { useState, useCallback } from "react"
import type { SelectedArtgProduct } from "@/components/intake/medication-search"

/**
 * Hook for integrating ARTG medication search into intake forms.
 *
 * Tracks:
 * - medication_search_used: whether the patient interacted with search
 * - medication_selected: whether they selected a result
 * - selected_artg_id: the ARTG ID if selected
 * - selected_medication_name: the product name
 *
 * Per MEDICATION_SEARCH_SPEC.md section 5: Interaction Logging
 */

export interface MedicationSearchState {
  searchUsed: boolean
  selected: SelectedArtgProduct | null
}

export interface MedicationSearchActions {
  setSelected: (product: SelectedArtgProduct | null) => void
  markSearchUsed: () => void
  reset: () => void
  getAuditData: () => {
    medication_search_used: boolean
    medication_selected: boolean
    selected_artg_id: string | null
    selected_medication_name: string | null
  }
}

export function useMedicationSearch(): [
  MedicationSearchState,
  MedicationSearchActions
] {
  const [searchUsed, setSearchUsed] = useState(false)
  const [selected, setSelectedState] = useState<SelectedArtgProduct | null>(
    null
  )

  const setSelected = useCallback((product: SelectedArtgProduct | null) => {
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
      selected_artg_id: selected?.artg_id ?? null,
      selected_medication_name: selected?.product_name ?? null,
    }
  }, [searchUsed, selected])

  return [
    { searchUsed, selected },
    { setSelected, markSearchUsed, reset, getAuditData },
  ]
}
