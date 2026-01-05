"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

interface CinematicSwitchProps {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  className?: string;
  variant?: "default" | "safety"; // safety variant uses red for "yes" (dangerous)
}

export function CinematicSwitch({
  value,
  onChange,
  onLabel = "ON",
  offLabel = "OFF",
  className,
  variant = "default",
}: CinematicSwitchProps) {
  const isOn = value === true;

  const handleClick = () => {
    onChange(!isOn);
  };

  // For safety questions, "ON" (Yes) is dangerous, so use red/amber colors
  // For default, "ON" is positive, so use emerald colors
  const trackColor = variant === "safety" 
    ? (isOn ? "#dc2626" : "#27272a") // Red-600 vs Zinc-800 for safety
    : (isOn ? "#064e3b" : "#27272a"); // Emerald-900 vs Zinc-800 for default
  
  const thumbColor = variant === "safety"
    ? (isOn ? "#f59e0b" : "#52525b") // Amber-500 vs Zinc-600 for safety
    : (isOn ? "#34d399" : "#52525b"); // Emerald-400 vs Zinc-600 for default

  const onLabelColor = variant === "safety"
    ? (isOn ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-zinc-700")
    : (isOn ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-zinc-700");

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm shadow-xl cursor-pointer",
        className
      )}
      onClick={handleClick}
      role="switch"
      aria-checked={isOn}
      aria-label={`${isOn ? onLabel : offLabel}`}
    >
      {/* 'OFF' Label */}
      <span className={cn(
        "text-xs font-bold tracking-wider transition-colors duration-300",
        !isOn ? "text-zinc-400" : "text-zinc-700"
      )}>
        {offLabel}
      </span>

      {/* Switch Track */}
      <motion.div
        className="relative w-16 h-8 rounded-full shadow-inner"
        initial={false}
        animate={{
          backgroundColor: trackColor,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Switch Thumb */}
        <motion.div
          className="absolute top-1 left-1 w-6 h-6 rounded-full border border-white/10 shadow-md"
          initial={false}
          animate={{
            x: isOn ? 32 : 0,
            backgroundColor: thumbColor,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* Thumb Highlight (Gloss) */}
          <div className="absolute top-1 left-1.5 w-2 h-1 bg-white/30 rounded-full blur-[1px]" />
        </motion.div>
      </motion.div>

      {/* 'ON' Label */}
      <span className={cn(
        "text-xs font-bold tracking-wider transition-colors duration-300",
        onLabelColor
      )}>
        {onLabel}
      </span>
    </div>
  );
}

