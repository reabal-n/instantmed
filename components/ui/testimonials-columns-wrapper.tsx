"use client";

import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/ui/motion";

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

  return (
    <section className={cn("relative", className)}>
      <div className="container z-10 mx-auto px-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border border-dawn-200/40 dark:border-border bg-dawn-50/50 dark:bg-accent-teal/10 py-1 px-3 rounded-lg text-xs text-dawn-700 dark:text-accent-teal font-medium">{badgeText}</div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mt-4 text-center text-foreground">
            {title}
          </h2>
          <p className="text-center mt-3 text-muted-foreground dark:text-foreground/60 text-sm">
            {subtitle}
          </p>
        </motion.div>

        {/* Desktop: vertical scrolling columns */}
        <div className="hidden md:flex justify-center gap-4 mt-8 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[420px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>

        {/* Mobile: horizontal swipe carousel */}
        <div
          role="region"
          aria-label="Patient testimonials"
          className="md:hidden mt-8 -mx-4 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-4 pb-4 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
        >
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="snap-center shrink-0 w-[280px] p-5 rounded-2xl border border-border/30 dark:border-border/50 shadow-md shadow-primary/[0.05] dark:shadow-none bg-white dark:bg-card"
            >
              <div className="text-muted-foreground dark:text-foreground/70 leading-relaxed text-sm">
                {testimonial.text}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {testimonial.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="font-medium tracking-tight leading-4 truncate text-sm">{testimonial.name}</div>
                  <div className="leading-4 opacity-60 dark:opacity-75 tracking-tight text-xs truncate">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

