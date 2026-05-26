import { ArrowRight } from "lucide-react"
import Link from "next/link"

import type { CommercialInternalLink } from "@/lib/seo/commercial-links"
import { cn } from "@/lib/utils"

interface CommercialIntentLinksSectionProps {
  eyebrow?: string
  title: string
  body: string
  links: CommercialInternalLink[]
  compactLinks?: CommercialInternalLink[]
  /**
   * Rendering style for the `compactLinks` row.
   * - `"pill"` (default): rounded border + bg pills.
   * - `"inline"`: quiet text links separated by a thin divider. Use when
   *   the pill chrome reads as SEO directory bait on a high-trust surface
   *   (Tier 1 review 2026-05-25, /medical-certificate #4).
   */
  compactStyle?: "pill" | "inline"
  className?: string
}

export function CommercialIntentLinksSection({
  eyebrow = "Popular searches",
  title,
  body,
  links,
  compactLinks,
  compactStyle = "pill",
  className,
}: CommercialIntentLinksSectionProps) {
  return (
    <section
      aria-label={title}
      className={cn("px-4 py-12 sm:px-6 lg:py-14", className)}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-lg border border-border/60 bg-white p-4 shadow-sm shadow-primary/[0.04] transition-colors hover:border-primary/40 dark:border-white/15 dark:bg-card dark:shadow-none"
            >
              <span className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground group-hover:text-primary">
                {link.label}
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </span>
              {link.description && (
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                  {link.description}
                </span>
              )}
            </Link>
          ))}
        </div>

        {compactLinks && compactLinks.length > 0 && (
          compactStyle === "inline" ? (
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              <span className="mr-2 font-medium text-foreground/80">
                See also:
              </span>
              {compactLinks.map((link, i) => (
                <span key={link.href}>
                  {i > 0 && (
                    <span className="mx-1.5 text-border" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <Link
                    href={link.href}
                    className="underline decoration-border/60 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary/60"
                  >
                    {link.label}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {compactLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border/60 bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary dark:border-white/15 dark:bg-card"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}
