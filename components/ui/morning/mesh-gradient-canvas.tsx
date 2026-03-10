"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const LIGHT_BLOBS = [
  { color: "rgba(186, 218, 246, 0.12)", x: "20%", y: "30%", size: "60%" },
  { color: "rgba(240, 180, 160, 0.10)", x: "70%", y: "20%", size: "50%" },
  { color: "rgba(250, 245, 235, 0.08)", x: "40%", y: "70%", size: "55%" },
];

const DARK_BLOBS = [
  { color: "rgba(30, 50, 80, 0.12)", x: "20%", y: "30%", size: "60%" },
  { color: "rgba(50, 40, 70, 0.08)", x: "70%", y: "20%", size: "50%" },
  { color: "rgba(20, 40, 60, 0.10)", x: "40%", y: "70%", size: "55%" },
];

// Each blob gets a slightly different parallax speed for depth
const PARALLAX_SPEEDS = [-0.08, -0.12, -0.05];

export function MeshGradientCanvas() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Create parallax transforms — each blob moves at a different rate
  const y0 = useTransform(scrollYProgress, [0, 1], ["0%", `${PARALLAX_SPEEDS[0] * 100}%`]);
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", `${PARALLAX_SPEEDS[1] * 100}%`]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", `${PARALLAX_SPEEDS[2] * 100}%`]);
  const parallaxYs = [y0, y1, y2];

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Light mode blobs */}
      <div className="absolute inset-0 dark:opacity-0 transition-opacity duration-700">
        {LIGHT_BLOBS.map((blob, i) => (
          <motion.div
            key={`light-${i}`}
            className="absolute rounded-full mix-blend-soft-light"
            style={{
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              width: blob.size,
              height: blob.size,
              left: blob.x,
              top: blob.y,
              translateX: "-50%",
              translateY: "-50%",
              y: prefersReducedMotion ? 0 : parallaxYs[i],
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: [0, 40, -30, 0],
                    scale: [1, 1.15, 0.9, 1],
                  }
            }
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 3,
            }}
          />
        ))}
      </div>

      {/* Dark mode blobs */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-700">
        {DARK_BLOBS.map((blob, i) => (
          <motion.div
            key={`dark-${i}`}
            className="absolute rounded-full mix-blend-soft-light"
            style={{
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              width: blob.size,
              height: blob.size,
              left: blob.x,
              top: blob.y,
              translateX: "-50%",
              translateY: "-50%",
              y: prefersReducedMotion ? 0 : parallaxYs[i],
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: [0, 40, -30, 0],
                    scale: [1, 1.15, 0.9, 1],
                  }
            }
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
