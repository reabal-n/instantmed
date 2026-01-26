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
  // Using CSS color values that work with Tailwind's color palette
  const trackColor = variant === "safety" 
    ? (isOn ? "rgb(220 38 38)" : "rgb(39 39 42)") // red-600 vs zinc-800 for safety
    : (isOn ? "rgb(6 78 59)" : "rgb(39 39 42)"); // emerald-900 vs zinc-800 for default
  
  const thumbColor = variant === "safety"
    ? (isOn ? "rgb(245 158 11)" : "rgb(82 82 91)") // amber-500 vs zinc-600 for safety
    : (isOn ? "rgb(52 211 153)" : "rgb(82 82 91)"); // emerald-400 vs zinc-600 for default

  const onLabelColor = variant === "safety"
    ? (isOn ? "text-dawn-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-zinc-700")
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

