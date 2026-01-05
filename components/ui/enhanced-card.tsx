"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/ui/glowing-effect";

interface EnhancedCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  useGlowCard?: boolean;
  useSpotlight?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export function EnhancedCard({
  children,
  className,
  glowColor = "blue",
  useGlowCard = false,
  useSpotlight = true,
  hoverable = true,
  onClick,
}: EnhancedCardProps) {
  const baseClasses = cn(
    "rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300",
    hoverable && "hover:shadow-lg hover:-translate-y-1 cursor-pointer",
    onClick && "cursor-pointer",
    className
  );

  const content = (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );

  if (useSpotlight) {
    const spotlightColors = {
      blue: "oklch(0.65 0.15 220 / 0.08)",
      purple: "oklch(0.65 0.15 280 / 0.08)",
      green: "oklch(0.65 0.15 150 / 0.08)",
      red: "oklch(0.65 0.15 0 / 0.08)",
      orange: "oklch(0.65 0.15 30 / 0.08)",
    };

    return (
      <Spotlight color={spotlightColors[glowColor]} size={250}>
        {content}
      </Spotlight>
    );
  }

  return content;
}

