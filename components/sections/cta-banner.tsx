"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  type ServiceId,
  useServiceAvailability,
} from "@/components/providers/service-availability-provider"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
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
  /** Optional click handler on the primary CTA. */
  onCtaClick?: () => void;
  /** Optional disabled state — flips the CTA into a "Contact us" link. */
  isDisabled?: boolean;
  /** Optional live service kill switch for server-owned landing pages. */
  availabilityServiceId?: ServiceId;
  /** When provided, renders a price line below the CTA. e.g. `29.95`. */
  price?: number;
  /**
   * Optional small line under the price/refund row. e.g. "Takes about 2 minutes"
   * — service-specific reassurance used by service-page final CTAs.
   */
  microcopy?: string;
  /** Render the card immediately instead of waiting for scroll reveal. */
  revealInstant?: boolean;
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
  onCtaClick,
  isDisabled,
  availabilityServiceId,
  price,
  microcopy,
  revealInstant = false,
  className,
  id,
}: CTABannerProps) {
  const availability = useServiceAvailability();
  const isUnavailable = isDisabled
    ?? (availabilityServiceId
      ? availability.isServiceDisabled(availabilityServiceId)
      : false);
  const resolvedHref = isUnavailable ? "/contact" : ctaHref;
  const resolvedCtaText = isUnavailable ? "Contact us" : ctaText;
  return (
    <section id={id} className={cn("py-8 sm:py-10 lg:py-16 px-4 sm:px-6", className)}>
      <Reveal instant={revealInstant} className="mx-auto max-w-5xl rounded-2xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] p-6 sm:p-8 lg:p-12 text-left relative overflow-hidden">
        <Heading level="h1" as="h2">
          {title}
        </Heading>
        {subtitle && (
          <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-lg min-h-12 h-auto py-3 px-6"
            onClick={onCtaClick}
          >
            <Link href={resolvedHref}>
              {resolvedCtaText}
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

        {/* Optional price line — service-page CTAs surface the headline price
            here so users see it at the conversion moment without re-scrolling. */}
        {price !== undefined && (
          <p className="mt-4 text-sm font-medium text-foreground">
            ${price.toFixed(2)}
            <span className="text-muted-foreground font-normal"> &middot; No account required</span>
          </p>
        )}

        {microcopy && (
          <p className="mt-1 text-sm text-muted-foreground">{microcopy}</p>
        )}

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
