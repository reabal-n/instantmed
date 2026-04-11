// Minimal root loading state - NavigationProgress bar (in layout.tsx) handles
// the visual loading feedback. A full-screen loader here causes a jarring flash
// on every navigation. Transparent placeholder keeps layout stable.
export default function Loading() {
  return (
    <div
      className="min-h-[60vh]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading</span>
    </div>
  )
}
