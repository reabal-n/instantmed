"use client";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SkyBackgroundProps {
  className?: string;
  /** Use as full-page background (fixed position) */
  fullPage?: boolean;
}

/**
 * SkyBackground - Blue sky with clouds background matching Dreelio style
 * Features parallax scrolling and floating cloud animations
 */
export const SkyBackground = ({
  className,
  fullPage = false,
}: SkyBackgroundProps) => {
  const [scrollY, setScrollY] = useState(0);
  const [animationOffset, setAnimationOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Use an interval to update animation offset instead of calling Date.now() in render
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationOffset(Date.now());
    }, 100); // Update every 100ms for smooth animation
    return () => clearInterval(interval);
  }, []);
  
  // Pre-calculate sine values to avoid impure function calls in render
  const cloudOffsets = useMemo(() => ({
    cloud1: Math.sin(animationOffset / 5000) * 10,
    cloud2: Math.sin(animationOffset / 6000 + 1) * 12,
    cloud3: Math.sin(animationOffset / 5500 + 2) * 8,
    cloud4: Math.sin(animationOffset / 4800 + 0.5) * 6,
    cloud5: Math.sin(animationOffset / 7000 + 3) * 5,
    cloud6: Math.sin(animationOffset / 6500 + 4) * 7,
    cloud7: Math.sin(animationOffset / 8000 + 5) * 4,
  }), [animationOffset]);

  if (fullPage) {
    return (
      <div
        className={cn(
          "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
          className
        )}
        aria-hidden="true"
      >
        {/* Sky gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, 
              #87CEEB 0%, 
              #B0E0E6 30%, 
              #E0F6FF 60%, 
              #F0F8FF 100%
            )`,
          }}
        />

        {/* Cloud 1 - Left side, large prominent cloud */}
        <motion.div
          className="absolute"
          style={{
            width: "450px",
            height: "220px",
            left: "-80px",
            top: "8%",
            background: "white",
            borderRadius: "220px",
            filter: "blur(25px)",
            opacity: 0.95,
            boxShadow: `
              200px 0 0 -40px white,
              120px 70px 0 -30px white,
              280px 40px 0 -50px white,
              160px 100px 0 -35px white,
              320px 20px 0 -45px white
            `,
          }}
          animate={{
            x: scrollY * 0.1,
            y: scrollY * 0.05 + cloudOffsets.cloud1,
          }}
          transition={{
            x: { type: "spring", stiffness: 50, damping: 30 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Cloud 2 - Right side, middle - large and prominent */}
        <motion.div
          className="absolute"
          style={{
            width: "500px",
            height: "250px",
            right: "-100px",
            top: "35%",
            background: "white",
            borderRadius: "250px",
            filter: "blur(28px)",
            opacity: 0.92,
            boxShadow: `
              220px 0 0 -45px white,
              130px 80px 0 -35px white,
              300px 50px 0 -55px white,
              180px 110px 0 -40px white,
              350px 30px 0 -50px white
            `,
          }}
          animate={{
            x: -scrollY * 0.08,
            y: scrollY * 0.03 + cloudOffsets.cloud2,
          }}
          transition={{
            x: { type: "spring", stiffness: 50, damping: 30 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Cloud 3 - Left side, bottom - medium size */}
        <motion.div
          className="absolute"
          style={{
            width: "380px",
            height: "190px",
            left: "-60px",
            bottom: "12%",
            background: "white",
            borderRadius: "190px",
            filter: "blur(22px)",
            opacity: 0.9,
            boxShadow: `
              180px 0 0 -35px white,
              100px 60px 0 -28px white,
              240px 35px 0 -45px white,
              140px 90px 0 -32px white
            `,
          }}
          animate={{
            x: scrollY * 0.12,
            y: scrollY * 0.04 + cloudOffsets.cloud3,
          }}
          transition={{
            x: { type: "spring", stiffness: 50, damping: 30 },
            y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Cloud 4 - Right side, top - medium prominent */}
        <motion.div
          className="absolute"
          style={{
            width: "350px",
            height: "175px",
            right: "-50px",
            top: "15%",
            background: "white",
            borderRadius: "175px",
            filter: "blur(20px)",
            opacity: 0.88,
            boxShadow: `
              160px 0 0 -30px white,
              90px 55px 0 -25px white,
              210px 30px 0 -40px white,
              130px 80px 0 -28px white
            `,
          }}
          animate={{
            x: -scrollY * 0.15,
            y: scrollY * 0.06 + cloudOffsets.cloud4,
          }}
          transition={{
            x: { type: "spring", stiffness: 50, damping: 30 },
            y: { duration: 4.8, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Cloud 5 - Center-left, floating */}
        <motion.div
          className="absolute"
          style={{
            width: "320px",
            height: "160px",
            left: "8%",
            top: "55%",
            background: "white",
            borderRadius: "160px",
            filter: "blur(18px)",
            opacity: 0.85,
            boxShadow: `
              150px 0 0 -25px white,
              80px 50px 0 -20px white,
              190px 25px 0 -35px white,
              110px 70px 0 -22px white
            `,
          }}
          animate={{
            y: scrollY * 0.02 + cloudOffsets.cloud5,
          }}
          transition={{
            y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Cloud 6 - Right side, lower */}
        <motion.div
          className="absolute"
          style={{
            width: "340px",
            height: "170px",
            right: "5%",
            bottom: "20%",
            background: "white",
            borderRadius: "170px",
            filter: "blur(20px)",
            opacity: 0.87,
            boxShadow: `
              160px 0 0 -28px white,
              90px 55px 0 -22px white,
              200px 30px 0 -38px white,
              120px 75px 0 -25px white
            `,
          }}
          animate={{
            y: scrollY * 0.025 + cloudOffsets.cloud6,
          }}
          transition={{
            y: { duration: 6.5, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Cloud 7 - Upper center, smaller accent */}
        <motion.div
          className="absolute"
          style={{
            width: "280px",
            height: "140px",
            left: "50%",
            top: "5%",
            transform: "translateX(-50%)",
            background: "white",
            borderRadius: "140px",
            filter: "blur(16px)",
            opacity: 0.8,
            boxShadow: `
              130px 0 0 -20px white,
              70px 45px 0 -18px white,
              170px 25px 0 -32px white
            `,
          }}
          animate={{
            y: scrollY * 0.03 + cloudOffsets.cloud7,
          }}
          transition={{
            y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </div>
    );
  }

  return null;
};

