"use client"

import {
  MedicationSearch as PBSMedicationSearch,
  type SelectedPBSProduct,
} from "@/components/shared/medication-search"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Simplified medication selection used by flow step components.
 * Bridges the gap between the detailed `SelectedPBSProduct` shape
 * and the lighter data the flow store needs to persist.
 */
export interface MedicationSelection {
  medicationId: string | null
  name: string
  isManualEntry?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSelection(product: SelectedPBSProduct | null): MedicationSelection | null {
  if (!product) return null
  return {
    medicationId: product.pbs_code === "MANUAL" || product.pbs_code === "UNKNOWN" ? null : product.pbs_code,
    name: product.drug_name,
    isManualEntry: product.pbs_code === "MANUAL" || product.pbs_code === "UNKNOWN",
  }
}

function toProduct(selection: MedicationSelection | null): SelectedPBSProduct | null {
  if (!selection) return null
  return {
    pbs_code: selection.medicationId ?? (selection.isManualEntry ? "MANUAL" : "UNKNOWN"),
    drug_name: selection.name,
    form: null,
    strength: null,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MedicationSearchProps {
  value: MedicationSelection | null
  onChange: (medication: MedicationSelection | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Flow-adapted wrapper around the shared PBS MedicationSearch.
 *
 * Accepts / emits the simpler `MedicationSelection` shape used by the flow store
 * while internally delegating to the full `SelectedPBSProduct` component.
 */
export function MedicationSearch({
  value,
  onChange,
  disabled,
  className,
}: MedicationSearchProps) {
  const handleChange = (product: SelectedPBSProduct | null) => {
    onChange(toSelection(product))
  }

  return (
    <PBSMedicationSearch
      value={toProduct(value)}
      onChange={handleChange}
      disabled={disabled}
      className={className}
    />
  )
}
