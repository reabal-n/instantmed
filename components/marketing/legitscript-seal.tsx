import Image from "next/image"

import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { cn } from "@/lib/utils"

/**
 * LegitScript certification seal.
 *
 * InstantMed holds LegitScript Healthcare Merchant Certification -
 * the verification standard used by Google, Bing, Meta and major payment
 * processors for telehealth merchants.
 *
 * Display rules (from LegitScript):
 * - Must link to the verification page (checker_keywords=instantmed.com.au)
 * - Native size is 73×79 - do not scale smaller aggressively via CSS
 * - Opens in a new tab
 */

const LEGITSCRIPT_VERIFY_URL =
  "https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au"

// Native seal dimensions per LegitScript spec
const NATIVE_WIDTH = 73
const NATIVE_HEIGHT = 79

interface LegitScriptSealProps {
  /** `xs` = ~44×48 (hero proof row), `sm` = ~58×63 (inline trust rows), `md` = native 73×79 (dedicated blocks) */
  size?: "xs" | "sm" | "md"
  className?: string
}

export function LegitScriptSeal({ size = "sm", className }: LegitScriptSealProps) {
  const targetHeight = size === "md" ? NATIVE_HEIGHT : size === "sm" ? 63 : 48
  const scale = targetHeight / NATIVE_HEIGHT
  const width = Math.round(NATIVE_WIDTH * scale)
  const height = Math.round(NATIVE_HEIGHT * scale)

  return (
    <a
      href={LEGITSCRIPT_VERIFY_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={`${getApprovedClaim("legitscript_tooltip")} Verify certification for instantmed.com.au.`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md transition-opacity hover:opacity-80",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      <Image
        src="/logos/legitscript.png"
        alt={`${getApprovedClaim("legitscript_label")} - verify approval for instantmed.com.au`}
        width={width}
        height={height}
        unoptimized
        className="h-auto w-auto rounded-md dark:bg-white/95 dark:p-1"
        style={{ width, height }}
      />
    </a>
  )
}
