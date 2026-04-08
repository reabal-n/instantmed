"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { scrollRevealConfig, useReducedMotion } from "@/components/ui/motion";

// Persists across React StrictMode's simulated remount — DOM nodes are preserved.
const _played = new WeakSet<Element>()

interface ClipPathImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  direction?: "bottom" | "left" | "right" | "top";
}

const clipPaths = {
  bottom: { hidden: "inset(100% 0 0 0)", visible: "inset(0 0 0 0)" },
  top: { hidden: "inset(0 0 100% 0)", visible: "inset(0 0 0 0)" },
  left: { hidden: "inset(0 100% 0 0)", visible: "inset(0 0 0 0)" },
  right: { hidden: "inset(0 0 0 100%)", visible: "inset(0 0 0 0)" },
};

export function ClipPathImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  direction = "bottom",
}: ClipPathImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  if (isInView && ref.current) _played.add(ref.current)
  const alreadyPlayed = ref.current != null && _played.has(ref.current)
  const shouldAnimate = alreadyPlayed || isInView

  const clip = clipPaths[direction];

  return (
    <motion.div
      ref={ref}
      className={cn("overflow-hidden rounded-2xl", className)}
      initial={prefersReducedMotion ? {} : { clipPath: alreadyPlayed ? clip.visible : clip.hidden }}
      animate={
        prefersReducedMotion
          ? {}
          : shouldAnimate
            ? { clipPath: clip.visible }
            : { clipPath: clip.hidden }
      }
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        initial={prefersReducedMotion ? {} : { scale: alreadyPlayed ? 1 : 1.02 }}
        animate={
          prefersReducedMotion
            ? {}
            : shouldAnimate
              ? { scale: 1 }
              : { scale: 1.02 }
        }
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          priority={priority}
        />
      </motion.div>
    </motion.div>
  );
}
