"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion, type Variants } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { useTheme } from "next-themes"
import { useUser, useClerk } from "@clerk/nextjs"
import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import { LogOut } from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"
import { Button } from "@/components/uix"
import { AnimatedMobileMenu, MenuToggle } from "@/components/ui/animated-mobile-menu"
import { cn } from "@/lib/utils"
import SkyToggle from "@/components/ui/sky-toggle"
import { ServicesDropdown } from "@/components/shared/navbar/services-dropdown"
import { AnimatedNavLink } from "@/components/shared/navbar/animated-nav-link"
import { UserMenu } from "@/components/shared/navbar/user-menu"
import { MobileMenuContent } from "@/components/shared/navbar/mobile-menu-content"

interface NavbarProps {
  variant?: "marketing" | "patient" | "doctor"
  userName?: string
}

const navGlowVariants: Variants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}


export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"
  const { signOut } = useClerk()
  const { user, isLoaded: isClerkLoaded } = useUser()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    // Clear httpOnly profile_linked cookie before Clerk sign-out
    // so the middleware safety net works correctly on next sign-in
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {})
    await signOut()
    router.push("/")
    router.refresh()
  }

  const firstName = user?.firstName || userName?.split(" ")[0] || "User"
  const isActivePath = (path: string) => pathname === path || pathname?.startsWith(path + "/")

  return (
    <>
      <header
        className={cn("fixed left-0 right-0 z-50 px-4 sm:px-6 top-0 pt-2")}
      >
        <motion.nav
          className={cn(
            "relative mx-auto max-w-5xl rounded-2xl",
            "p-1 bg-linear-to-b from-background/80 to-background/40 backdrop-blur-lg border border-border/40 shadow-lg",
            scrolled && "shadow-xl border-border/60",
          )}
          role="navigation"
          aria-label="Main navigation"
          initial="initial"
          whileHover={prefersReducedMotion ? undefined : "hover"}
        >
          {/* Nav glow effect — AUDIT FIX: disabled when user prefers reduced motion */}
          {!prefersReducedMotion && (
            <motion.div
              className={cn(
                "absolute -inset-2 rounded-3xl z-0 pointer-events-none",
                isDarkTheme
                  ? "bg-gradient-radial from-transparent via-primary/15 to-transparent"
                  : "bg-gradient-radial from-transparent via-primary/8 to-transparent"
              )}
              variants={navGlowVariants}
            />
          )}
          <div className="relative z-10 flex items-center justify-between px-3 py-1">
            {/* Logo */}
            <BrandLogo size="md" className="relative z-10" />

            {/* Desktop Navigation */}
            <div className="relative z-10 hidden items-center gap-1 md:flex">
              {variant === "marketing" && (
                <>
                  <ServicesDropdown isActivePath={isActivePath} />

                  <AnimatedNavLink href="/trust" isActive={isActivePath("/trust")}>
                    Why us?
                  </AnimatedNavLink>
                  <AnimatedNavLink href="/how-it-works" isActive={isActivePath("/how-it-works")}>
                    How it Works
                  </AnimatedNavLink>
                  <AnimatedNavLink href="/blog" isActive={isActivePath("/blog")}>
                    Health Guides
                  </AnimatedNavLink>
                  <AnimatedNavLink href="/pricing" isActive={isActivePath("/pricing")}>
                    Pricing
                  </AnimatedNavLink>

                  <UserMenu
                    variant="marketing"
                    firstName={firstName}
                    isActivePath={isActivePath}
                    pathname={pathname}
                    handleSignOut={handleSignOut}
                    isLoggingOut={isLoggingOut}
                    isClerkLoaded={isClerkLoaded}
                    user={user}
                  />
                </>
              )}

              {variant === "patient" && (
                <UserMenu
                  variant="patient"
                  firstName={firstName}
                  isActivePath={isActivePath}
                  pathname={pathname}
                  handleSignOut={handleSignOut}
                  isLoggingOut={isLoggingOut}
                  isClerkLoaded={isClerkLoaded}
                  user={user}
                />
              )}

              {variant === "doctor" && (
                <UserMenu
                  variant="doctor"
                  firstName={firstName}
                  isActivePath={isActivePath}
                  pathname={pathname}
                  handleSignOut={handleSignOut}
                  isLoggingOut={isLoggingOut}
                  isClerkLoaded={isClerkLoaded}
                  user={user}
                />
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <MenuToggle toggle={() => setMobileMenuOpen(!mobileMenuOpen)} isOpen={mobileMenuOpen} />
            </div>
          </div>
        </motion.nav>
      </header>

      {/* Animated Mobile Menu */}
      <AnimatedMobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        header={
          <BrandLogo size="md" onClick={() => setMobileMenuOpen(false)} />
        }
        footer={
          <div className="space-y-3">
            <div className="flex justify-center py-2">
              <SkyToggle size={20} />
            </div>
            {variant === "marketing" && (
              <>
                {isClerkLoaded && user ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl bg-white dark:bg-card hover:bg-muted/50 dark:hover:bg-white/10 border-border/40 transition-all flex items-center justify-center"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      router.push("/patient/settings")
                    }}
                  >
                    Settings
                  </Button>
                ) : (
                  <AppSignInButton>
                    <Button variant="outline" className="w-full rounded-xl bg-white dark:bg-card hover:bg-muted/50 dark:hover:bg-white/10 border-border/40 transition-all flex items-center justify-center">
                      Sign in
                    </Button>
                  </AppSignInButton>
                )}
                <Button
                  asChild
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Link href="/request">
                    Start a request
                  </Link>
                </Button>
              </>
            )}
            {variant === "patient" && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleSignOut()
                }}
                disabled={isLoggingOut}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-destructive-light hover:bg-destructive-light text-destructive transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
              </button>
            )}
          </div>
        }
      >
        <MobileMenuContent variant={variant} onClose={() => setMobileMenuOpen(false)} />
      </AnimatedMobileMenu>
    </>
  )
}
