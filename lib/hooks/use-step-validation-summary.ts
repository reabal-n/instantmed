"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Manages the "add these to continue" blocking-reason summary shown when a
 * patient taps Continue before a step is complete.
 *
 * Keeping the button always-clickable (no disabled prop) prevents silent
 * grey-out dead ends on mobile — especially in the sticky CTA — where the
 * only feedback would otherwise be "nothing happened." The button uses
 * variant="secondary" when incomplete and the summary tells the patient
 * exactly what to fill in.
 *
 * Usage:
 *   const { validationSummary, showBlockingReasons } = useStepValidationSummary(
 *     isComplete,
 *     useCallback(() => {
 *       const reasons: string[] = []
 *       if (!field) reasons.push("the field label")
 *       return reasons
 *     }, [field])
 *   )
 *
 *   // In handleNext:
 *   if (!isComplete) { showBlockingReasons(); return }
 *   onNext()
 *
 *   // In JSX (above the button):
 *   {validationSummary.length > 0 && (
 *     <Alert variant="destructive" role="alert" aria-live="assertive">
 *       <AlertDescription>
 *         {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
 *         {validationSummary.join(", ")}.
 *       </AlertDescription>
 *     </Alert>
 *   )}
 */
export function useStepValidationSummary(
  canContinue: boolean,
  computeReasons: () => string[]
) {
  const [validationSummary, setValidationSummary] = useState<string[]>([])

  // Auto-clear the moment the step becomes completable
  useEffect(() => {
    if (canContinue && validationSummary.length > 0) {
      setValidationSummary([])
    }
  }, [canContinue, validationSummary.length])

  const showBlockingReasons = useCallback(() => {
    setValidationSummary(computeReasons())
  }, [computeReasons])

  return { validationSummary, showBlockingReasons }
}
