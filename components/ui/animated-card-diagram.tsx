"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Card Components
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AnimatedCardDiagram({ className, ...props }: CardProps) {
  return (
    <div
      role="region"
      aria-labelledby="card-title"
      aria-describedby="card-description"
      className={cn(
        "group/animated-card relative w-[356px] overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function DiagramCardBody({ className, ...props }: CardProps) {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-col space-y-1.5 border-t border-border p-4",
        className
      )}
      {...props}
    />
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DiagramCardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function DiagramCardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function DiagramCardVisual({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("h-[180px] w-[356px] overflow-hidden", className)}
      {...props}
    />
  );
}

// Visual Component with animated diagram
interface VisualProps {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
}

export function AnimatedDiagramVisual({
  mainColor = "hsl(var(--primary))",
  secondaryColor = "hsl(var(--secondary))",
  gridColor = "hsl(var(--muted-foreground) / 0.15)",
}: VisualProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          "--color": mainColor,
          "--secondary-color": secondaryColor,
        } as React.CSSProperties}
      />
      <div className="relative h-[180px] w-[356px] overflow-hidden rounded-t-lg">
        <DonutChart
          hovered={hovered}
          color={mainColor}
          secondaryColor={secondaryColor}
        />
        <InfoBadge color={mainColor} />
        <GradientOverlay color={mainColor} />
        <FloatingTags
          color={mainColor}
          secondaryColor={secondaryColor}
          hovered={hovered}
        />
        <EllipseGradient color={mainColor} />
        <GridLayer color={gridColor} />
      </div>
    </>
  );
}

interface LayerProps {
  color: string;
  secondaryColor?: string;
  hovered?: boolean;
}

const EllipseGradient: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 z-[5] flex h-full w-full items-center justify-center">
      <svg
        width="356"
        height="196"
        viewBox="0 0 356 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="356" height="180" fill="url(#paint0_radial_diagram)" />
        <defs>
          <radialGradient
            id="paint0_radial_diagram"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(178 98) rotate(90) scale(98 178)"
          >
            <stop stopColor={color} stopOpacity="0.25" />
            <stop offset="0.34" stopColor={color} stopOpacity="0.15" />
            <stop offset="1" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

const GridLayer: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div
      style={{ "--grid-color": color } as React.CSSProperties}
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full bg-transparent bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:20px_20px] bg-center opacity-70 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
    />
  );
};

const DonutChart: React.FC<LayerProps> = ({ hovered, color, secondaryColor }) => {
  const [mainProgress, setMainProgress] = useState(12.5);
  const [secondaryProgress, setSecondaryProgress] = useState(0);

  useEffect(() => {
    if (!hovered) return;

    const timeout = setTimeout(() => {
      setMainProgress(66);
      setSecondaryProgress(100);
    }, 200);

    return () => {
      clearTimeout(timeout);
    };
  }, [hovered]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const mainDashoffset = circumference - (mainProgress / 100) * circumference;
  const secondaryDashoffset =
    circumference - (secondaryProgress / 100) * circumference;

  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute top-0 left-0 z-[7] flex h-[360px] w-[356px] transform items-center justify-center transition-transform duration-500 group-hover/animated-card:-translate-y-[90px] group-hover/animated-card:scale-110">
      <div className="relative flex h-[120px] w-[120px] items-center justify-center text-muted-foreground">
        <div className="donut-chart-container relative">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              opacity={0.2}
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={secondaryColor}
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={secondaryDashoffset}
              transform="rotate(-90 50 50)"
              style={{
                transition:
                  "stroke-dashoffset 0.5s cubic-bezier(0.6, 0.6, 0, 1)",
              }}
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={color}
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={mainDashoffset}
              transform="rotate(-90 50 50)"
              style={{
                transition:
                  "stroke-dashoffset 0.5s cubic-bezier(0.6, 0.6, 0, 1)",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-gilroy text-xl text-foreground">
              {hovered
                ? secondaryProgress > 66
                  ? secondaryProgress
                  : mainProgress
                : mainProgress}
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoBadge: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div
      className="relative h-full w-[356px]"
      style={{ "--color": color } as React.CSSProperties}
    >
      <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[6] flex w-[356px] translate-y-0 items-start justify-center bg-transparent p-4 transition-transform duration-500 group-hover/animated-card:translate-y-full">
        <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] rounded-md border border-border bg-background/25 px-2 py-1.5 opacity-100 backdrop-blur-sm transition-opacity duration-500 group-hover/animated-card:opacity-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color)]" />
            <p className="text-xs text-foreground">
              Real-time Analytics
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live data visualization
          </p>
        </div>
      </div>
    </div>
  );
};

const GradientOverlay: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[6] flex translate-y-full items-center justify-center opacity-0 transition-all duration-500 group-hover/animated-card:translate-y-0 group-hover/animated-card:opacity-100">
      <svg
        width="356"
        height="180"
        viewBox="0 0 356 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="356" height="180" fill="url(#paint0_linear_overlay)" />
        <defs>
          <linearGradient
            id="paint0_linear_overlay"
            x1="178"
            y1="0"
            x2="178"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.35" stopColor={color} stopOpacity="0" />
            <stop offset="1" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const FloatingTags: React.FC<LayerProps> = ({ color, secondaryColor, hovered }) => {
  const items = [
    { id: 1, translateX: "100", translateY: "50", text: "Consultations" },
    { id: 2, translateX: "100", translateY: "-50", text: "Prescriptions" },
    { id: 3, translateX: "125", translateY: "0", text: "Certificates" },
    { id: 4, translateX: "-125", translateY: "0", text: "Telehealth" },
    { id: 5, translateX: "-100", translateY: "50", text: "Express" },
    { id: 6, translateX: "-100", translateY: "-50", text: "Secure" },
  ];

  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[7] flex items-center justify-center opacity-0 transition-opacity duration-500 group-hover/animated-card:opacity-100">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute flex items-center justify-center gap-1 rounded-full border border-border bg-background/70 px-1.5 py-0.5 backdrop-blur-sm transition-all duration-500"
          style={{
            transform: hovered
              ? `translate(${item.translateX}px, ${item.translateY}px)`
              : "translate(0px, 0px)",
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: index < 3 ? color : secondaryColor }}
          />
          <span className="ml-1 text-[10px] text-foreground">
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
};
