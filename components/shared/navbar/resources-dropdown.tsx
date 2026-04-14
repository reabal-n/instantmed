"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  BookOpen,
  Building2,
  ChevronDown,
  DollarSign,
  HelpCircle,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

const resourceLinks = [
  { title: "How It Works",    href: "/how-it-works",  description: "Our 3-step process",   icon: Info },
  { title: "Pricing",         href: "/pricing",       description: "Transparent flat fees", icon: DollarSign },
  { title: "Health Guides",   href: "/blog",          description: "Articles and advice",   icon: BookOpen },
  { title: "FAQs",            href: "/faq",           description: "Common questions",      icon: HelpCircle },
]

const companyLinks = [
  { title: "About Us",        href: "/about",         icon: Info },
  { title: "Reviews",         href: "/reviews",       icon: ShieldCheck },
  { title: "Trust & Safety",  href: "/trust",         icon: ShieldCheck },
  { title: "For Employers",   href: "/for/employers", icon: Building2 },
  { title: "Locations",       href: "/locations",     icon: MapPin },
]

interface ResourcesDropdownProps {
  isActivePath: (path: string) => boolean
}

export function ResourcesDropdown({ isActivePath }: ResourcesDropdownProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const isResourceActive =
    isActivePath("/how-it-works") ||
    isActivePath("/pricing") ||
    isActivePath("/blog") ||
    isActivePath("/faq") ||
    isActivePath("/about") ||
    isActivePath("/reviews") ||
    isActivePath("/trust") ||
    isActivePath("/for/employers") ||
    isActivePath("/locations")

  const handleTriggerMouseEnter = () => {
    resourceLinks.forEach(link => router.prefetch(link.href))
    companyLinks.forEach(link => router.prefetch(link.href))
  }

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            onMouseEnter={handleTriggerMouseEnter}
            className={cn(
              "group/resources relative z-10 flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isResourceActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Resources
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-180"
            )} />
          </button>
        </DropdownMenuTrigger>

        <AnimatePresence>
          {open && (
            <DropdownMenuContent
              forceMount
              loop
              align="start"
              className="w-56 rounded-2xl border border-dawn-200/40 dark:border-white/10 bg-white/90 dark:bg-white/10 backdrop-blur-xl p-0 overflow-hidden shadow-xl shadow-primary/[0.08]"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="p-2"
              >
                {resourceLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="rounded-xl p-0 focus:bg-primary/10 dark:focus:bg-primary/20">
                    <Link href={link.href} className="flex items-center gap-3 px-3 py-2.5 w-full">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0">
                        <link.icon className="w-4 h-4 text-primary/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{link.title}</p>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="my-1.5 bg-border/40" />

                <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Company
                </p>
                {companyLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="rounded-xl p-0 focus:bg-primary/10 dark:focus:bg-primary/20">
                    <Link href={link.href} className="flex items-center gap-2.5 px-3 py-2 w-full">
                      <link.icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <p className="text-sm text-muted-foreground hover:text-foreground">{link.title}</p>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </motion.div>
            </DropdownMenuContent>
          )}
        </AnimatePresence>
      </DropdownMenu>

      {/* Tubelight active indicator */}
      {isResourceActive && (
        <div className="absolute inset-0 rounded-lg bg-primary/10 -z-0 pointer-events-none">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
            <div className="absolute w-8 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-1" />
          </div>
        </div>
      )}
    </div>
  )
}
