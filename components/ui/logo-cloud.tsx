"use client";

import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

export function LogoCloud({ 
  className, 
  logos, 
  title = "Trusted by experts.",
  subtitle = "Used by healthcare leaders.",
  showHeader = true,
  ...props 
}: LogoCloudProps) {
  return (
    <div {...props} className={cn("relative", className)}>
      {/* Background glow effect */}
      <div
        aria-hidden="true"
        className={cn(
          "-z-10 -top-1/2 -translate-x-1/2 pointer-events-none absolute left-1/2 h-[120vmin] w-[120vmin] rounded-b-full",
          "bg-[radial-gradient(ellipse_at_center,hsl(var(--foreground)/0.1),transparent_50%)]",
          "blur-[30px]"
        )}
      />

      <section className="relative mx-auto max-w-3xl">
        {showHeader && (
          <>
            <h2 className="mb-5 text-center font-medium text-foreground text-xl tracking-tight md:text-3xl">
              <span className="text-muted-foreground">{title}</span>
              <br />
              <span className="font-semibold">{subtitle}</span>
            </h2>
            <div className="mx-auto my-5 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
          </>
        )}

        <div
          className={cn(
            "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]"
          )}
        >
          <InfiniteSlider gap={42} reverse speed={80} speedOnHover={25}>
            {logos.map((logo) => (
              <div key={`logo-${logo.alt}`} className="flex items-center justify-center">
                {logo.src.startsWith('http') ? (
                  <img
                    alt={logo.alt}
                    className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert grayscale hover:grayscale-0 transition-all duration-300"
                    height={logo.height || 20}
                    loading="lazy"
                    src={logo.src}
                    width={logo.width || "auto"}
                  />
                ) : (
                  <Image
                    alt={logo.alt}
                    className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert grayscale hover:grayscale-0 transition-all duration-300"
                    height={logo.height || 20}
                    width={logo.width || 100}
                    src={logo.src}
                  />
                )}
              </div>
            ))}
          </InfiniteSlider>
        </div>

        {showHeader && (
          <div className="mt-5 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
        )}
      </section>
    </div>
  );
}

// Default healthcare partner logos
export const healthcareLogos: Logo[] = [
  { src: "https://svgl.app/library/vercel_wordmark.svg", alt: "Telehealth Platform" },
  { src: "https://svgl.app/library/stripe-wordmark.svg", alt: "Secure Payments" },
  { src: "https://svgl.app/library/supabase_wordmark_light.svg", alt: "Data Security" },
  { src: "https://svgl.app/library/cloudflare_light.svg", alt: "CDN Provider" },
  { src: "https://svgl.app/library/twilio-wordmark.svg", alt: "SMS Provider" },
  { src: "https://svgl.app/library/google_cloud_wordmark_light.svg", alt: "Cloud Infrastructure" },
];
