"use client"

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Sparkles } from "lucide-react"

// Random first names pool
const FIRST_NAMES = [
  "Sarah", "James", "Emma", "Michael", "Jessica", "David", "Sophie", "Chris",
  "Olivia", "Liam", "Ava", "Noah", "Isabella", "Ethan", "Mia", "Lucas",
  "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Alexander", "Evelyn",
  "Benjamin", "Abigail", "William", "Emily", "Daniel", "Elizabeth", "Henry",
  "Sofia", "Sebastian", "Avery", "Jack", "Ella", "Owen", "Scarlett", "Ryan",
  "Grace", "Nathan", "Chloe", "Caleb", "Victoria", "Isaac", "Riley", "Joshua",
  "Aria", "Andrew", "Lily", "Thomas", "Zoey", "Dylan", "Penelope", "Samuel",
]

// Australian cities
const LOCATIONS = [
  "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast",
  "Canberra", "Newcastle", "Wollongong", "Hobart", "Geelong", "Townsville",
  "Cairns", "Darwin", "Toowoomba", "Ballarat", "Bendigo", "Launceston",
  "Mackay", "Rockhampton", "Bunbury", "Bundaberg", "Hervey Bay", "Wagga Wagga",
]

// Actions
const ACTIONS = [
  { text: "got a med cert", icon: "cert" },
  { text: "renewed a script", icon: "script" },
  { text: "got a prescription", icon: "script" },
  { text: "received their certificate", icon: "cert" },
]

// Generate random notification
function generateNotification() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastInitial = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
  const minutes = Math.floor(Math.random() * 25) + 1

  return {
    name: `${firstName} ${lastInitial}.`,
    location,
    action: action.text,
    actionType: action.icon,
    time: minutes === 1 ? "1 min ago" : `${minutes} mins ago`,
  }
}

export function SocialProofPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [notification, setNotification] = useState(() => generateNotification())
  const [hasInteracted, setHasInteracted] = useState(false)
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Check if mobile on mount
  const showNextNotification = useCallback(() => {
    if (hasInteracted) return
    setNotification(generateNotification())
    setIsVisible(true)
  }, [hasInteracted])

  useEffect(() => {
    if (!isMounted) return
    // Don't show on mobile
    if (typeof window !== "undefined" && window.innerWidth < 768) return
    if (hasInteracted) return

    // Show first popup after 5 seconds
    const initialTimer = setTimeout(() => {
      showNextNotification()
    }, 5000)

    return () => clearTimeout(initialTimer)
  }, [isMounted, hasInteracted, showNextNotification])

  useEffect(() => {
    if (!isVisible) return

    // Hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 5000)

    // Show next one after 15 seconds total
    const nextTimer = setTimeout(() => {
      if (!hasInteracted) {
        showNextNotification()
      }
    }, 15000)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(nextTimer)
    }
  }, [isVisible, hasInteracted, showNextNotification])

  // Memoize gradient colors based on action type
  const gradientColors = useMemo(() => {
    return notification.actionType === "cert"
      ? { from: "#6366f1", to: "#8b5cf6" }
      : { from: "#8b5cf6", to: "#a855f7" }
  }, [notification.actionType])

  if (!isMounted) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.9 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
          className="fixed bottom-24 left-4 z-40 hidden md:block"
          onClick={() => setHasInteracted(true)}
        >
          {/* Liquid glass container */}
          <div className="relative group cursor-pointer">
            {/* Animated glow background */}
            <motion.div
              className="absolute -inset-1 rounded-3xl opacity-60 blur-xl"
              style={{
                background: `linear-gradient(135deg, ${gradientColors.from}40, ${gradientColors.to}40)`,
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Main card */}
            <motion.div
              className="relative overflow-hidden rounded-2xl backdrop-blur-xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
                boxShadow: `
                  0 4px 24px -4px rgba(0,0,0,0.1),
                  0 0 0 1px rgba(255,255,255,0.8),
                  inset 0 1px 0 rgba(255,255,255,0.9),
                  inset 0 -1px 0 rgba(0,0,0,0.05)
                `,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)`,
                }}
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "easeInOut",
                }}
              />

              {/* Content */}
              <div className="relative p-4 pr-5 flex items-center gap-3.5">
                {/* Animated icon */}
                <motion.div
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${gradientColors.from}, ${gradientColors.to})`,
                    boxShadow: `0 4px 12px -2px ${gradientColors.from}50`,
                  }}
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  
                  {/* Sparkle */}
                  <motion.div
                    className="absolute -top-1 -right-1"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </motion.div>
                </motion.div>

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <motion.p
                    className="text-sm font-semibold text-gray-900 truncate"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {notification.name} from {notification.location}
                  </motion.p>
                  <motion.p
                    className="text-xs text-gray-500 flex items-center gap-1.5"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span>Just {notification.action}</span>
                    <span
                      className="font-medium"
                      style={{ color: gradientColors.from }}
                    >
                      {notification.time}
                    </span>
                  </motion.p>
                </div>
              </div>

              {/* Bottom accent line */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{
                  background: `linear-gradient(90deg, transparent, ${gradientColors.from}, ${gradientColors.to}, transparent)`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
