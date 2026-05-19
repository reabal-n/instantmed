import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { SectionProps } from "./types";

interface Badge {
  icon: ReactNode;
  label: string;
}

interface LogoBadgeStripProps extends SectionProps {
  badges: Badge[];
}

export function LogoBadgeStrip({
  badges,
  className,
  id,
}: LogoBadgeStripProps) {
  return (
    <section id={id} className={cn("py-10 px-4", className)}>
      <div
        className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-6"
      >
        {badges.map((badge) => (
          <div
            key={badge.label}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 dark:bg-white/[0.06] px-4 py-2 text-xs text-muted-foreground"
          >
            <span className="text-primary">{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
