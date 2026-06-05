const REVIEW_PAY_SERVICES = new Set(["prescription", "repeat-script"])

export function shouldTrackIntakeComplete({
  currentStepId,
  serviceType,
}: {
  currentStepId: string | null | undefined
  serviceType: string | null | undefined
}): boolean {
  if (!currentStepId || !serviceType) return false
  if (currentStepId === "checkout") return true
  return currentStepId === "review" && REVIEW_PAY_SERVICES.has(serviceType)
}
