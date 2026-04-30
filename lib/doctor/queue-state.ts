export function removeCompletedIntakeFromQueue<T extends { id: string }>(
  intakes: T[],
  intakeId: string,
): { remaining: T[]; nextIntake: T | null } {
  const currentIndex = intakes.findIndex((intake) => intake.id === intakeId)
  if (currentIndex === -1) {
    return { remaining: intakes, nextIntake: null }
  }

  const remaining = intakes.filter((intake) => intake.id !== intakeId)
  return {
    remaining,
    nextIntake: remaining[currentIndex] ?? remaining[currentIndex - 1] ?? null,
  }
}
