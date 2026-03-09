"use client";

import { motion, useMotionValue, useSpring, useMotionTemplate, useReducedMotion } from "framer-motion";
import { type ReactNode, useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface PerspectiveTiltCardProps {
  children: ReactNode;
  className?: string;
  maxRotation?: number;
  spotlightOpacity?: number;
  variant?: "glass" | "solid" | "gradient" | "outline";
}

const variantStyles = {
  glass:
    "bg-card/75 dark:bg-white/10 backdrop-blur-xl border border-border/50 dark:border-white/10",
  solid:
    "bg-white dark:bg-white/5 border border-border dark:border-white/10 shadow-sm",
  gradient:
    "bg-gradient-to-br from-sky-50 to-dawn-50 dark:from-background dark:to-muted/30 border border-border",
  outline:
    "bg-transparent border border-border hover:bg-card/50 dark:hover:bg-white/5",
};

export function PerspectiveTiltCard({
  children,
  className,
  maxRotation = 6,
  spotlightOpacity = 0.15,
  variant = "glass",
}: PerspectiveTiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);

  const springConfig = { stiffness: 120, damping: 20, mass: 1 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const spotlightBackground = useMotionTemplate`radial-gradient(circle at ${spotlightX}% ${spotlightY}%, rgba(255,255,255,${spotlightOpacity}), transparent 60%)`;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);

    rotateX.set(-percentY * maxRotation);
    rotateY.set(percentX * maxRotation);
    spotlightX.set(((e.clientX - rect.left) / rect.width) * 100);
    spotlightY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    spotlightX.set(50);
    spotlightY.set(50);
  };

  if (prefersReducedMotion) {
    return (
      <div className={cn("rounded-2xl p-6", variantStyles[variant], className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn("relative rounded-2xl p-6 overflow-hidden", variantStyles[variant], className)}
      style={{
        perspective: 800,
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        boxShadow: "0 20px 40px hsl(var(--primary) / 0.08)",
        borderColor: "hsl(var(--primary) / 0.3)",
      }}
      transition={{ duration: 0.25 }}
    >
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: spotlightBackground,
        }}
      />
      <div style={{ transform: "translateZ(0)" }}>{children}</div>
    </motion.div>
  );
}
