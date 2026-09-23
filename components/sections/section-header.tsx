import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  align?: "left" | "center";
  className?: string;
  titleAs?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  pill,
  title,
  subtitle,
  align = "left",
  className,
  titleAs = "h2",
}: SectionHeaderProps) {
  const Title = titleAs;
  return (
    <div
      className={cn(
        "mb-12 max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {pill && pill.toLowerCase() !== title.toLowerCase() && <p className="mb-3 text-sm font-medium text-muted-foreground">{pill}</p>}
      <Title className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] text-foreground text-balance">{title}</Title>

      {subtitle && (
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
