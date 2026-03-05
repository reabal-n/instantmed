"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps } from "./types";

interface CTABannerProps extends SectionProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  secondaryText?: string;
  secondaryHref?: string;
}

export function CTABanner({
  title,
  subtitle,
  ctaText,
  ctaHref,
  secondaryText,
  secondaryHref,
  className,
  id,
}: CTABannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <motion.div
        ref={ref}
        className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-sky-50 via-white to-[#FFF5EB] dark:from-[#141D30] dark:via-[#1A2340] dark:to-[#141D30] border border-border/50 p-12 text-center shadow-lg"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.98 }}
        animate={
          prefersReducedMotion
            ? {}
            : isInView
              ? { opacity: 1, y: 0, scale: 1 }
              : {}
        }
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {secondaryText && secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryText}
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
}
