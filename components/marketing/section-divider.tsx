import { cn } from "@/lib/utils"

interface SectionDividerProps {
  variant?: "wave" | "curve" | "slant"
  flip?: boolean
  className?: string
}

/**
 * Subtle SVG section dividers to break up flat section stacking.
 * Use between homepage sections for visual rhythm.
 */
export function SectionDivider({
  variant = "wave",
  flip = false,
  className,
}: SectionDividerProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden leading-none -my-px",
        flip && "rotate-180",
        className,
      )}
      aria-hidden="true"
    >
      {variant === "wave" && (
        <svg
          viewBox="0 0 1440 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-8 sm:h-10 lg:h-12"
          preserveAspectRatio="none"
        >
          <path
            d="M0 24C240 4 480 44 720 24C960 4 1200 44 1440 24V48H0V24Z"
            className="fill-background dark:fill-background"
          />
        </svg>
      )}

      {variant === "curve" && (
        <svg
          viewBox="0 0 1440 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-6 sm:h-8 lg:h-10"
          preserveAspectRatio="none"
        >
          <path
            d="M0 48C0 48 360 0 720 0C1080 0 1440 48 1440 48H0Z"
            className="fill-background dark:fill-background"
          />
        </svg>
      )}

      {variant === "slant" && (
        <svg
          viewBox="0 0 1440 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-6 sm:h-8 lg:h-10"
          preserveAspectRatio="none"
        >
          <path
            d="M0 48L1440 0V48H0Z"
            className="fill-background dark:fill-background"
          />
        </svg>
      )}
    </div>
  )
}
