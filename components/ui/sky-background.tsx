"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface SkyBackgroundProps {
  className?: string;
  /** Use as full-page background (fixed position) */
  fullPage?: boolean;
}

/**
 * SkyBackground - Simplified morning sky with CSS animations
 * 5 clouds across 3 layers, pure CSS drift, minimal JS
 * Only visible in light mode (dark mode uses NightSkyBackground)
 */
export const SkyBackground = ({
  className,
  fullPage = false,
}: SkyBackgroundProps) => {
  // Minimal scroll listener for parallax CSS variable
  useEffect(() => {
    let ticking = false;
    const updateScrollY = () => {
      document.documentElement.style.setProperty('--scroll-y', String(window.scrollY));
      ticking = false;
    };
    
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollY);
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (fullPage) {
    return (
      <div
        className={cn(
          "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
          "opacity-100 dark:opacity-0 transition-opacity duration-700",
          className
        )}
        aria-hidden="true"
      >
        {/* Sky gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, 
              #B8D4E8 0%, 
              #D4E6F1 20%, 
              #E8F1F8 45%, 
              #F5F9FC 70%,
              #FDFEFE 100%
            )`,
          }}
        />
        
        {/* Single sun glow - CSS animation */}
        <div
          className="absolute -top-20 -right-20 w-[500px] h-[500px] animate-sun-glow"
          style={{
            background: `radial-gradient(circle, 
              rgba(255, 240, 220, 0.45) 0%, 
              rgba(255, 230, 200, 0.2) 35%,
              transparent 70%
            )`,
          }}
        />
        
        {/* Dawn warmth at horizon */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, 
              rgba(254, 243, 232, 0.2) 0%, 
              transparent 30%
            )`,
          }}
        />

        {/* Back layer - 2 large slow clouds */}
        <div className="absolute inset-0 sky-layer-back motion-safe:animate-cloud-drift">
          <div className="cloud cloud-back-1" />
          <div className="cloud cloud-back-2" />
        </div>
        
        {/* Mid layer - 2 medium clouds */}
        <div className="absolute inset-0 sky-layer-mid motion-safe:animate-cloud-drift">
          <div className="cloud cloud-mid-1" />
          <div className="cloud cloud-mid-2" />
        </div>
        
        {/* Front layer - 1 small cloud */}
        <div className="absolute inset-0 sky-layer-front motion-safe:animate-cloud-drift">
          <div className="cloud cloud-front-1" />
        </div>
      </div>
    );
  }

  return null;
};

