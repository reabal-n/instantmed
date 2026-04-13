"use client"

// ---------------------------------------------------------------------------
// Norwood-scale scalp icons -- top-down bird's eye view
// Progressive hair thinning from full coverage to extensive loss.
// 64x64 viewBox, currentColor, 1.5px stroke.
// ---------------------------------------------------------------------------

/** Shared head outline: oval ~56x48 centered with subtle ear bumps */
function HeadOutline() {
  return (
    <>
      {/* Main scalp oval */}
      <ellipse
        cx="32"
        cy="30"
        rx="22"
        ry="26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Left ear hint */}
      <path
        d="M10.5 32 C9 34, 9 38, 10.5 40"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right ear hint */}
      <path
        d="M53.5 32 C55 34, 55 38, 53.5 40"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  )
}

/** SVG wrapper with consistent props */
function ScalpSvg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <HeadOutline />
      {children}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// 1. Full dense hair -- no loss
// ---------------------------------------------------------------------------

export function ScalpNone({ className }: { className?: string }) {
  return (
    <ScalpSvg className={className}>
      {/* Dense hair strokes across entire scalp */}
      {/* Front row */}
      <path d="M20 12 C19 9, 21 7, 22 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 10 C24 7, 26 5, 27 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 8 C29.5 5, 31 4, 32 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 8 C34.5 5, 36 4, 37 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 10 C39 7, 41 5, 42 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 12 C43 9, 45 7, 45 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Second row */}
      <path d="M17 18 C16 15, 18 14, 19 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 15 C22 12, 24 11, 25 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 13 C27 10, 29 9, 30 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33 13 C32 10, 34 9, 35 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 13 C37 10, 39 9, 40 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 15 C42 12, 44 11, 45 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 18 C46 15, 48 14, 48 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Middle row */}
      <path d="M15 24 C14 21, 16 20, 17 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21 C20 18, 22 17, 23 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 19 C26 16, 28 15, 29 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 18 C31 15, 33 14, 34 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 19 C36 16, 38 15, 39 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 21 C42 18, 44 17, 45 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M49 24 C48 21, 50 20, 50 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crown area */}
      <path d="M24 27 C23 24, 25 23, 26 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 25 C29 22, 31 21, 32 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 25 C35 22, 37 21, 38 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 27 C41 24, 43 23, 43 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Back rows */}
      <path d="M18 33 C17 30, 19 29, 20 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 31 C25 28, 27 27, 28 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 30 C31 27, 33 26, 34 29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 31 C37 28, 39 27, 40 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 33 C45 30, 47 29, 47 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower back */}
      <path d="M20 39 C19 36, 21 35, 22 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 37 C27 34, 29 33, 30 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 37 C33 34, 35 33, 36 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 39 C41 36, 43 35, 44 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom fringe */}
      <path d="M24 44 C23 41, 25 40, 26 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 43 C31 40, 33 39, 34 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 44 C39 41, 41 40, 42 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ScalpSvg>
  )
}

// ---------------------------------------------------------------------------
// 2. Mild -- slight widening at temples, rest dense
// ---------------------------------------------------------------------------

export function ScalpMild({ className }: { className?: string }) {
  return (
    <ScalpSvg className={className}>
      {/* Front row -- temples thinned (first and last strokes removed) */}
      <path d="M25 10 C24 7, 26 5, 27 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 8 C29.5 5, 31 4, 32 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 8 C34.5 5, 36 4, 37 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 10 C39 7, 41 5, 42 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Faint temple remnants */}
      <path d="M20 12 C19 9, 21 7, 22 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M44 12 C43 9, 45 7, 45 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      {/* Second row -- slight thinning at edges */}
      <path d="M17 18 C16 15, 18 14, 19 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      <path d="M23 15 C22 12, 24 11, 25 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 13 C27 10, 29 9, 30 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33 13 C32 10, 34 9, 35 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 13 C37 10, 39 9, 40 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 15 C42 12, 44 11, 45 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 18 C46 15, 48 14, 48 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      {/* Middle row -- full */}
      <path d="M15 24 C14 21, 16 20, 17 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21 C20 18, 22 17, 23 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 19 C26 16, 28 15, 29 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 18 C31 15, 33 14, 34 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 19 C36 16, 38 15, 39 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 21 C42 18, 44 17, 45 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M49 24 C48 21, 50 20, 50 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crown area -- full */}
      <path d="M24 27 C23 24, 25 23, 26 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 25 C29 22, 31 21, 32 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 25 C35 22, 37 21, 38 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 27 C41 24, 43 23, 43 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Back rows -- full */}
      <path d="M18 33 C17 30, 19 29, 20 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 31 C25 28, 27 27, 28 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 30 C31 27, 33 26, 34 29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 31 C37 28, 39 27, 40 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 33 C45 30, 47 29, 47 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower back */}
      <path d="M20 39 C19 36, 21 35, 22 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 37 C27 34, 29 33, 30 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 37 C33 34, 35 33, 36 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 39 C41 36, 43 35, 44 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom fringe */}
      <path d="M24 44 C23 41, 25 40, 26 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 43 C31 40, 33 39, 34 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 44 C39 41, 41 40, 42 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ScalpSvg>
  )
}

// ---------------------------------------------------------------------------
// 3. Moderate -- visible temple recession + slight crown thinning
// ---------------------------------------------------------------------------

export function ScalpModerate({ className }: { className?: string }) {
  return (
    <ScalpSvg className={className}>
      {/* Front row -- temples clearly receded */}
      <path d="M28 9 C27 6, 29 5, 30 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 8 C31.5 5, 33 4, 34 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 9 C36 6, 38 5, 39 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Second row -- sides thinned */}
      <path d="M23 15 C22 12, 24 11, 25 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M28 13 C27 10, 29 9, 30 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33 13 C32 10, 34 9, 35 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 13 C37 10, 39 9, 40 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 15 C42 12, 44 11, 45 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      {/* Middle row -- sides full, center starting to thin */}
      <path d="M15 24 C14 21, 16 20, 17 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21 C20 18, 22 17, 23 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 19 C26 16, 28 15, 29 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 18 C31 15, 33 14, 34 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      <path d="M37 19 C36 16, 38 15, 39 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 21 C42 18, 44 17, 45 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M49 24 C48 21, 50 20, 50 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crown area -- thinning */}
      <path d="M24 27 C23 24, 25 23, 26 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 25 C29 22, 31 21, 32 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M36 25 C35 22, 37 21, 38 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M42 27 C41 24, 43 23, 43 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Back rows -- mostly full */}
      <path d="M18 33 C17 30, 19 29, 20 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 31 C25 28, 27 27, 28 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 30 C31 27, 33 26, 34 29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      <path d="M38 31 C37 28, 39 27, 40 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 33 C45 30, 47 29, 47 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower back */}
      <path d="M20 39 C19 36, 21 35, 22 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 37 C27 34, 29 33, 30 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 37 C33 34, 35 33, 36 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 39 C41 36, 43 35, 44 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom fringe */}
      <path d="M24 44 C23 41, 25 40, 26 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 43 C31 40, 33 39, 34 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 44 C39 41, 41 40, 42 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ScalpSvg>
  )
}

// ---------------------------------------------------------------------------
// 4. Crown -- clear crown circle with sparse strokes + moderate temples
// ---------------------------------------------------------------------------

export function ScalpCrown({ className }: { className?: string }) {
  return (
    <ScalpSvg className={className}>
      {/* Front row -- only center strokes remain */}
      <path d="M30 9 C29.5 6, 31 5, 32 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 9 C34.5 6, 36 5, 37 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Second row -- sparse */}
      <path d="M28 13 C27 10, 29 9, 30 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      <path d="M33 13 C32 10, 34 9, 35 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 13 C37 10, 39 9, 40 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      {/* Middle row -- sides only */}
      <path d="M15 24 C14 21, 16 20, 17 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21 C20 18, 22 17, 23 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 19 C26 16, 28 15, 29 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      <path d="M37 19 C36 16, 38 15, 39 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      <path d="M43 21 C42 18, 44 17, 45 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M49 24 C48 21, 50 20, 50 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crown area -- sparse, faint (clear thinning circle) */}
      <path d="M30 25 C29 22, 31 21, 32 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      <path d="M36 25 C35 22, 37 21, 38 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      {/* Back rows -- thinning in center */}
      <path d="M18 33 C17 30, 19 29, 20 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 31 C25 28, 27 27, 28 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M38 31 C37 28, 39 27, 40 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M46 33 C45 30, 47 29, 47 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower back -- sides dense */}
      <path d="M20 39 C19 36, 21 35, 22 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 37 C27 34, 29 33, 30 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 37 C33 34, 35 33, 36 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 39 C41 36, 43 35, 44 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom fringe */}
      <path d="M24 44 C23 41, 25 40, 26 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 43 C31 40, 33 39, 34 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 44 C39 41, 41 40, 42 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ScalpSvg>
  )
}

// ---------------------------------------------------------------------------
// 5. Advanced -- large bare crown, deep temple recession, only sides/back dense
// ---------------------------------------------------------------------------

export function ScalpAdvanced({ className }: { className?: string }) {
  return (
    <ScalpSvg className={className}>
      {/* Front row -- minimal center island */}
      <path d="M31 9 C30.5 6, 32 5, 33 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      {/* Second row -- mostly gone */}
      <path d="M33 13 C32 10, 34 9, 35 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      {/* Middle row -- only edges */}
      <path d="M15 24 C14 21, 16 20, 17 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21 C20 18, 22 17, 23 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 21 C42 18, 44 17, 45 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M49 24 C48 21, 50 20, 50 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crown area -- bare, one faint remnant */}
      <path d="M33 24 C32 21, 34 20, 35 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      {/* Back rows -- sides only */}
      <path d="M18 33 C17 30, 19 29, 20 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 31 C25 28, 27 27, 28 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      <path d="M38 31 C37 28, 39 27, 40 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      <path d="M46 33 C45 30, 47 29, 47 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower back -- dense sides */}
      <path d="M20 39 C19 36, 21 35, 22 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 37 C27 34, 29 33, 30 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 37 C33 34, 35 33, 36 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 39 C41 36, 43 35, 44 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom fringe */}
      <path d="M24 44 C23 41, 25 40, 26 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 43 C31 40, 33 39, 34 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 44 C39 41, 41 40, 42 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ScalpSvg>
  )
}

// ---------------------------------------------------------------------------
// 6. Extensive -- only fringe around sides and back, top mostly bare
// ---------------------------------------------------------------------------

export function ScalpExtensive({ className }: { className?: string }) {
  return (
    <ScalpSvg className={className}>
      {/* Top and crown completely bare -- just a couple faint wisps */}
      <path d="M32 17 C31 14, 33 13, 34 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      <path d="M30 26 C29 23, 31 22, 32 25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
      {/* Middle -- only extreme edges */}
      <path d="M14 26 C13 23, 15 22, 16 25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 26 C49 23, 51 22, 51 25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Back rows -- only sides */}
      <path d="M16 33 C15 30, 17 29, 18 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 33 C47 30, 49 29, 49 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower back -- fringe band */}
      <path d="M18 39 C17 36, 19 35, 20 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 38 C23 35, 25 34, 26 37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 37 C29 34, 31 33, 32 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 37 C35 34, 37 33, 38 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 38 C41 35, 43 34, 44 37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 39 C45 36, 47 35, 48 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom fringe -- dense horseshoe */}
      <path d="M20 44 C19 41, 21 40, 22 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 44 C26 41, 28 40, 29 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 43 C33 40, 35 39, 36 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M41 44 C40 41, 42 40, 43 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ScalpSvg>
  )
}
