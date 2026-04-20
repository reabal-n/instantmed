"use client";

import { motion } from "framer-motion";

import { useReducedMotion } from "@/components/ui/motion";
import { SectionPill } from "@/components/ui/section-pill";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { cn } from "@/lib/utils";

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

interface TestimonialsColumnsWrapperProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  badgeText?: string;
  className?: string;
}

export function TestimonialsColumnsWrapper({
  testimonials,
  title = "What our users say",
  subtitle = "See what our customers have to say about us.",
  badgeText = "Testimonials",
  className,
}: TestimonialsColumnsWrapperProps) {
  const prefersReducedMotion = useReducedMotion()

  // Split testimonials into 3 columns
  const firstColumn = testimonials.slice(0, Math.ceil(testimonials.length / 3));
  const secondColumn = testimonials.slice(
    Math.ceil(testimonials.length / 3),
    Math.ceil((testimonials.length * 2) / 3)
  );
  const thirdColumn = testimonials.slice(Math.ceil((testimonials.length * 2) / 3));

  const hasHeader = title || subtitle || badgeText

  return (
    <section className={cn("relative", className)}>
      <div className="container z-10 mx-auto px-4">
        {hasHeader && (
          <motion.div
            initial={prefersReducedMotion ? {} : { y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
          >
            {badgeText && (
              <div className="flex justify-center">
                <SectionPill>{badgeText}</SectionPill>
              </div>
            )}

            {title && (
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mt-4 text-center text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-center mt-3 text-muted-foreground dark:text-foreground/60 text-sm">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex justify-center gap-4 mt-8 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[420px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
}

