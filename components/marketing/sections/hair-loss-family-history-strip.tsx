import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HairLossFamilyHistoryStripProps {
  className?: string
}

/**
 * Thin server component - family-history risk framing + single CTA.
 *
 * Intentionally no client hooks and no framer-motion. The landing page
 * owns any section-level analytics capture; this component just renders.
 */
export function HairLossFamilyHistoryStrip({
  className,
}: HairLossFamilyHistoryStripProps) {
  return (
    <section
      aria-label="Family history and hair loss risk"
      className={cn("py-10 lg:py-14", className)}
    >
      <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card",
            "p-6 text-center lg:p-8",
          )}
        >
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Family history matters
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-sm leading-relaxed text-muted-foreground">
            If a parent had hair loss at your age or earlier, your risk
            roughly doubles. Starting treatment while follicles are still
            alive preserves far more hair than waiting - the earlier you
            act, the more you have to work with.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg">
              <Link href="/request?service=consult&subtype=hair_loss">
                Start your assessment
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
