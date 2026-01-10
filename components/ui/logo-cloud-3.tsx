"use client";

import Image from "next/image";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";
import React from "react";

type Logo = {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  Component?: React.ComponentType<{ className?: string }>; // For SVG components
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
        className
      )}
    >
      <InfiniteSlider gap={42} reverse speed={80} speedOnHover={25}>
        {logos.map((logo, index) => {
          if (logo.Component) {
            // Render SVG component
            return (
              <div
                key={`logo-${logo.alt}-${index}`}
                className="pointer-events-none select-none flex items-center justify-center h-5 md:h-6 shrink-0"
              >
                <logo.Component className="h-5 md:h-6 w-auto opacity-80 hover:opacity-100 transition-opacity" />
              </div>
            );
          }
          // Render image
          return (
            <Image
              alt={logo.alt}
              src={logo.src || ""}
              width={logo.width || 80}
              height={logo.height || 20}
              className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert opacity-80 hover:opacity-100 transition-opacity"
              key={`logo-${logo.alt}-${index}`}
              loading="lazy"
            />
          );
        })}
      </InfiniteSlider>
    </div>
  );
}
