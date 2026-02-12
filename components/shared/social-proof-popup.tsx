"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X } from "lucide-react"

// Random first names pool - common Australian nicknames feel more authentic
const FIRST_NAMES = [
  "Sarah", "James", "Emma", "Michael", "Jess", "Dave", "Sophie", "Chris",
  "Olivia", "Liam", "Matt", "Noah", "Bella", "Ben", "Mia", "Luke",
  "Charlotte", "Mason", "Amy", "Jack", "Harper", "Alex", "Evie",
  "Will", "Abi", "Dan", "Emily", "Tom", "Liz", "Henry",
  "Sofia", "Seb", "Ryan", "Grace", "Nathan", "Chloe", "Riley", "Josh",
  "Andrew", "Lily", "Dylan", "Sam", "Kate", "Mark", "Jen", "Nick",
]

// Australian cities + suburbs - mix of major cities and recognizable suburbs
const LOCATIONS = [
  "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast",
  "Canberra", "Newcastle", "Wollongong", "Hobart", "Geelong", "Townsville",
  "Cairns", "Darwin", "Toowoomba", "Ballarat", "Bendigo", "Launceston",
  "Mackay", "Parramatta", "Bondi", "Fremantle", "Surfers Paradise", "Manly",
  "St Kilda", "Newtown", "Paddington", "South Bank", "Fortitude Valley",
]

// Context-specific actions based on page type
const ACTIONS_BY_CONTEXT = {
  certificate: [
    "received their certificate",
    "got their med cert",
    "completed their request",
  ],
  prescription: [
    "completed their consult",
    "finished their request",
    "got their request reviewed",
  ],
  general: [
    "completed their consult",
    "finished their request",
    "got their request through",
  ],
}

// Generate natural-feeling time strings (weighted toward recent)
function generateTimeString(): string {
  const rand = Math.random()
  // Weight toward more recent times - feels more authentic
  if (rand < 0.15) return "just now"
  if (rand < 0.35) return "a moment ago"
  if (rand < 0.55) return "a few mins ago"
  // Avoid round numbers - they feel computed
  const minutes = [2, 3, 4, 6, 7, 8, 11, 13, 14, 17, 19, 22][Math.floor(Math.random() * 12)]
  return `${minutes} mins ago`
}

// Determine context from pathname
function getContextFromPath(pathname: string): keyof typeof ACTIONS_BY_CONTEXT {
  if (pathname.includes("medical-certificate") || pathname.includes("med-cert")) {
    return "certificate"
  }
  if (pathname.includes("prescription") || pathname.includes("repeat")) {
    return "prescription"
  }
  return "general"
}

// Generate notification based on context
function generateNotification(context: keyof typeof ACTIONS_BY_CONTEXT) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastInitial = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
  const actions = ACTIONS_BY_CONTEXT[context]
  const action = actions[Math.floor(Math.random() * actions.length)]

  return {
    name: `${firstName} ${lastInitial}.`,
    location,
    action,
    time: generateTimeString(),
  }
}

// Session storage key for popup count
const SESSION_KEY = "social_proof_count"
const MAX_POPUPS_PER_SESSION = 2

export function SocialProofPopup() {
  const pathname = usePathname()
  const context = getContextFromPath(pathname)
  
  const [isVisible, setIsVisible] = useState(false)
  const [notification, setNotification] = useState(() => generateNotification(context))
  const [hasInteracted, setHasInteracted] = useState(false)
  const [popupCount, setPopupCount] = useState(() => {
    if (typeof window === "undefined") return 0
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? parseInt(stored, 10) : 0
  })
  const hasScrolled = useRef(false)
  
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Update session storage when popup count changes
  useEffect(() => {
    if (typeof window === "undefined" || popupCount === 0) return
    sessionStorage.setItem(SESSION_KEY, popupCount.toString())
  }, [popupCount])

  const showNextNotification = useCallback(() => {
    if (hasInteracted) return
    if (popupCount >= MAX_POPUPS_PER_SESSION) return
    
    setNotification(generateNotification(context))
    setIsVisible(true)
    setPopupCount(prev => prev + 1)
  }, [hasInteracted, popupCount, context])

  // Scroll-based trigger: show after user scrolls 40% down
  useEffect(() => {
    if (!isMounted) return
    if (typeof window === "undefined") return
    if (window.innerWidth < 768) return // No mobile
    if (hasInteracted) return
    if (popupCount >= MAX_POPUPS_PER_SESSION) return

    const handleScroll = () => {
      if (hasScrolled.current) return
      
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (scrollPercent > 0.4) {
        hasScrolled.current = true
        // Small delay after scroll threshold
        setTimeout(() => showNextNotification(), 1500)
      }
    }

    // Also show after 10 seconds if user hasn't scrolled
    const fallbackTimer = setTimeout(() => {
      if (!hasScrolled.current) {
        hasScrolled.current = true
        showNextNotification()
      }
    }, 10000)

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(fallbackTimer)
    }
  }, [isMounted, hasInteracted, popupCount, showNextNotification])

  useEffect(() => {
    if (!isVisible) return

    // Hide after 6 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 6000)

    // Show second popup after 20 seconds (if under limit)
    const nextTimer = setTimeout(() => {
      if (!hasInteracted && popupCount < MAX_POPUPS_PER_SESSION) {
        showNextNotification()
      }
    }, 20000)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(nextTimer)
    }
  }, [isVisible, hasInteracted, popupCount, showNextNotification])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    setHasInteracted(true)
  }, [])

  if (!isMounted) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-24 left-4 z-40 hidden md:block"
        >
          {/* Simple toast-style card */}
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-xs">
            {/* Dismiss button */}
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="p-3 pr-8 flex items-start gap-3">
              {/* Simple check badge */}
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{notification.name}</span>
                  <span className="text-gray-500"> from {notification.location}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {notification.action} · <span className="text-gray-400">{notification.time}</span>
                </p>
              </div>
            </div>
            
            {/* Subtle verification footer */}
            <div className="px-3 pb-2 pt-0">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                <span>Verified request</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
