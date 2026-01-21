"use client";

import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "framer-motion";
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border py-1 px-3 rounded-lg text-xs">{badgeText}</div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mt-4 text-center">
            {title}
          </h2>
          <p className="text-center mt-3 opacity-75 text-muted-foreground text-sm">
            {subtitle}
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 mt-8 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[600px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
}

