"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function AnimatedGradientBackground() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const { resolvedTheme } = useTheme()
  const mounted = useHasMounted()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const isDark = resolvedTheme === "dark"

  if (!mounted) {
    return (
      <div className="fixed inset-0 -z-20 bg-white dark:bg-black" aria-hidden="true" />
    )
  }

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden" aria-hidden="true">
      {/* Base gradient */}
      <div 
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark 
            ? "bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950" 
            : "bg-linear-to-br from-white via-slate-50 to-indigo-50/30"
        }`}
      />
      
      {/* Animated gradient orbs with parallax */}
      <motion.div
        className={`absolute w-[800px] h-[800px] rounded-full blur-[120px] ${
          isDark 
            ? "bg-indigo-600/20" 
            : "bg-indigo-200/40"
        }`}
        animate={{
          x: mousePos.x * 100 - 50,
          y: mousePos.y * 100 - 50,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 30 }}
        style={{
          top: "10%",
          left: "20%",
        }}
      />
      
      <motion.div
        className={`absolute w-[600px] h-[600px] rounded-full blur-[100px] ${
          isDark 
            ? "bg-violet-600/15" 
            : "bg-violet-200/30"
        }`}
        animate={{
          x: mousePos.x * -80 + 40,
          y: mousePos.y * -80 + 40,
        }}
        transition={{ type: "spring", stiffness: 40, damping: 25 }}
        style={{
          top: "40%",
          right: "10%",
        }}
      />
      
      <motion.div
        className={`absolute w-[500px] h-[500px] rounded-full blur-[80px] ${
          isDark 
            ? "bg-purple-600/10" 
            : "bg-purple-200/20"
        }`}
        animate={{
          x: mousePos.x * 60 - 30,
          y: mousePos.y * 60 - 30,
        }}
        transition={{ type: "spring", stiffness: 60, damping: 35 }}
        style={{
          bottom: "10%",
          left: "30%",
        }}
      />

    </div>
  )
}
