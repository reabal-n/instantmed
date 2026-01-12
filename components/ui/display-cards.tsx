"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  iconBgClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName: _iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
  iconBgClassName = "bg-blue-800",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[11rem] md:min-h-[12rem] w-[18rem] sm:w-[20rem] md:w-[22rem] max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-4rem)] skew-y-0 md:-skew-y-[8deg] select-none flex-col justify-between gap-3 md:gap-4 rounded-xl border-2 bg-muted/70 backdrop-blur-sm px-4 py-4 md:px-6 md:py-5 transition-all duration-700 md:after:absolute md:after:-right-1 md:after:top-[-5%] md:after:h-[110%] md:after:w-[18rem] md:after:bg-gradient-to-l md:after:from-background md:after:to-transparent md:after:content-[''] hover:border-white/20 hover:bg-muted",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full p-1.5", iconBgClassName)}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-base font-semibold leading-tight", titleClassName)}>{title}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">{description}</p>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <>
      {/* Mobile: Stack vertically */}
      <div className="flex flex-col gap-6 md:hidden w-full">
        {displayCards.map((cardProps, index) => (
          <div key={index} className="w-full flex justify-center">
            <DisplayCard {...cardProps} className={cardProps.className?.replace(/\[grid-area:stack\]/g, '') || ''} />
          </div>
        ))}
      </div>
      
      {/* Desktop: Stacked cards */}
      <div className="hidden md:grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700 min-h-[280px] lg:min-h-[320px] w-full overflow-visible py-2 md:py-3">
        {displayCards.map((cardProps, index) => (
          <DisplayCard key={index} {...cardProps} />
        ))}
      </div>
    </>
  );
}
