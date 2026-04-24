"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { TrustBadgeRow } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import type { PresetEntry } from "@/lib/marketing/trust-badges";
import { cn } from "@/lib/utils";

import type { SectionProps } from "./types";

interface CTABannerProps extends SectionProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  secondaryText?: string;
  secondaryHref?: string;
  /** Optional trust badge row below CTA (preset name or badge entries) */
  trustBadgePreset?: string;
  trustBadges?: PresetEntry[];
}

export function CTABanner({
  title,
  subtitle,
  ctaText,
  ctaHref,
  secondaryText,
  secondaryHref,
  trustBadgePreset,
  trustBadges,
  className,
  id,
}: CTABannerProps) {
  return (
    <section id={id} className={cn("py-8 sm:py-10 lg:py-16 px-4", className)}>
      <Reveal className="mx-auto max-w-4xl rounded-3xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] p-6 sm:p-8 lg:p-16 text-center relative overflow-hidden">
        <h2 className="text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            <Link href={ctaHref}>
              {ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {secondaryText && secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border"
            >
              {secondaryText}
            </Link>
          )}
        </div>

        {/* Refund reassurance */}
        <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Full refund if we can&apos;t help - no questions asked
        </p>

        {/* Optional trust badge row */}
        {(trustBadgePreset || trustBadges) && (
          <div className="mt-6 pt-4 border-t border-border/30">
            <TrustBadgeRow preset={trustBadgePreset} badges={trustBadges} className="gap-3" />
          </div>
        )}
      </Reveal>
    </section>
  );
}
