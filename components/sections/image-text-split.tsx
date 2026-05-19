import { type ReactNode } from "react";

import { ClipPathImage } from "@/components/ui/morning/clip-path-image";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { cn } from "@/lib/utils";

import type { SectionProps } from "./types";

interface ImageTextSplitProps extends SectionProps {
  title: string;
  highlightWords?: string[];
  description: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "left" | "right";
  children?: ReactNode;
}

export function ImageTextSplit({
  title,
  highlightWords,
  description,
  imageSrc,
  imageAlt,
  imagePosition = "right",
  children,
  className,
  id,
}: ImageTextSplitProps) {
  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <div
        className={cn(
          "mx-auto max-w-5xl flex flex-col gap-12 items-center",
          "lg:flex-row lg:gap-16",
          imagePosition === "left" && "lg:flex-row-reverse"
        )}
      >
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          <WordReveal
            text={title}
            as="h2"
            highlightWords={highlightWords}
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:justify-start"
          />
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {description}
          </p>
          {children && (
            <div className="mt-6">
              {children}
            </div>
          )}
        </div>

        {/* Image */}
        <div className="hidden lg:block w-64 xl:w-80 shrink-0">
          <ClipPathImage
            src={imageSrc}
            alt={imageAlt}
            width={1200}
            height={900}
            className="aspect-[4/3] rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
            direction={imagePosition === "right" ? "left" : "right"}
          />
        </div>
      </div>
    </section>
  );
}
