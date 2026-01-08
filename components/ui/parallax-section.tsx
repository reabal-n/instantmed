"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Performance: Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Parallax speed (0-1). Higher = more movement */
  speed?: number;
  /** Enable floating animation */
  floating?: boolean;
}

/**
 * ParallaxSection - Wraps content with parallax scrolling effect
 * Creates floating effect as user scrolls
 */
export function ParallaxSection({
  children,
  className,
  speed = 0.3,
  floating = true,
}: ParallaxSectionProps) {
  const [offset, setOffset] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    // Skip parallax if user prefers reduced motion
    if (prefersReducedMotion) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const handleScroll = () => {
      // Throttle to ~60fps
      const now = Date.now();
      if (now - lastScrollTime.current < 16) return;
      lastScrollTime.current = now;

      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionTop = rect.top;
      const sectionHeight = rect.height;

      // Calculate visibility
      const isInViewport =
        sectionTop < windowHeight && sectionTop + sectionHeight > 0;
      setIsVisible(isInViewport);

      if (isInViewport && floating) {
        // Calculate parallax offset based on scroll position
        const scrollProgress =
          (windowHeight - sectionTop) / (windowHeight + sectionHeight);
        const parallaxOffset = (scrollProgress - 0.5) * 100 * speed;
        setOffset(parallaxOffset);
      } else {
        setOffset(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed, floating]);

  // Skip parallax animation if reduced motion is preferred
  const shouldAnimate = !prefersReducedMotion && floating;

  return (
    <motion.div
      ref={sectionRef}
      className={cn("relative", className)}
      initial={{ opacity: 0, y: shouldAnimate ? 20 : 0 }}
      animate={{
        opacity: isVisible ? 1 : 1,
        y: shouldAnimate ? offset : 0,
      }}
      transition={{
        opacity: { duration: 0.3 },
        y: shouldAnimate ? {
          type: "spring",
          stiffness: 100,
          damping: 30,
        } : { duration: 0 },
      }}
      style={{
        transform: shouldAnimate ? `translate3d(0, ${offset}px, 0)` : undefined,
        willChange: shouldAnimate ? 'transform' : 'auto',
      }}
      // Accessibility: Ensure proper focus management
      tabIndex={-1}
      aria-label="Content section"
    >
      {children}
    </motion.div>
  );
}

