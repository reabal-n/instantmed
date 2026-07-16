import type { UnifiedStepId } from "@/types/services"

interface DeriveRequestStepProgressInput {
  stepIds: readonly UnifiedStepId[]
  currentStepId: UnifiedStepId
  furthestVisitedStepId: UnifiedStepId | null
  stepsNeedingRevalidation: readonly UnifiedStepId[]
}

export interface RequestStepProgress {
  currentIndex: number
  furthestVisitedIndex: number
  firstRevalidationIndex: number | null
  maxReachableIndex: number
}

export function deriveRequestStepProgress({
  stepIds,
  currentStepId,
  furthestVisitedStepId,
  stepsNeedingRevalidation,
}: DeriveRequestStepProgressInput): RequestStepProgress {
  const resolvedCurrentIndex = stepIds.indexOf(currentStepId)
  const currentIndex = resolvedCurrentIndex >= 0 ? resolvedCurrentIndex : 0
  const resolvedFurthestVisitedIndex = furthestVisitedStepId
    ? stepIds.indexOf(furthestVisitedStepId)
    : -1
  const furthestVisitedIndex = Math.max(
    currentIndex,
    resolvedFurthestVisitedIndex >= 0 ? resolvedFurthestVisitedIndex : currentIndex,
  )
  const revalidationIndexes = stepsNeedingRevalidation
    .map((stepId) => stepIds.indexOf(stepId))
    .filter((index) => index >= 0)
  const firstRevalidationIndex = revalidationIndexes.length > 0
    ? Math.min(...revalidationIndexes)
    : null

  return {
    currentIndex,
    furthestVisitedIndex,
    firstRevalidationIndex,
    maxReachableIndex: firstRevalidationIndex === null
      ? furthestVisitedIndex
      : Math.min(furthestVisitedIndex, firstRevalidationIndex),
  }
}
