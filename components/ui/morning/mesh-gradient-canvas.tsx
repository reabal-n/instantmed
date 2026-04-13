"use client";

import { usePathname } from "next/navigation";
import { useEffect,useState } from "react";

const DASHBOARD_PREFIXES = ["/patient", "/doctor", "/admin"];

/**
 * Subtle ambient background - static radial gradients.
 * No JS animation, no blend modes, no scroll listeners.
 * Pure CSS: zero runtime cost, same visual effect.
 */
export function MeshGradientCanvas() {
  const pathname = usePathname();

  // Skip on mobile - decorative only
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  const isDashboard = DASHBOARD_PREFIXES.some(p => pathname?.startsWith(p));
  if (isDashboard) return null;
  if (!isDesktop) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Light mode */}
      <div className="absolute inset-0 dark:opacity-0">
        <div
          className="absolute rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(186,218,246,0.18) 0%, transparent 70%)",
            width: "60%", height: "60%", left: "20%", top: "30%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(240,180,160,0.13) 0%, transparent 70%)",
            width: "50%", height: "50%", left: "70%", top: "20%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(250,245,235,0.12) 0%, transparent 70%)",
            width: "55%", height: "55%", left: "40%", top: "70%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* Dark mode */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100">
        <div
          className="absolute rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(30,50,80,0.18) 0%, transparent 70%)",
            width: "60%", height: "60%", left: "20%", top: "30%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(50,40,70,0.12) 0%, transparent 70%)",
            width: "50%", height: "50%", left: "70%", top: "20%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(20,40,60,0.14) 0%, transparent 70%)",
            width: "55%", height: "55%", left: "40%", top: "70%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
}
