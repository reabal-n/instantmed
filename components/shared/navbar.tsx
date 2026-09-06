"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { BrandLogo } from "@/components/shared/brand-logo"
import { AnimatedNavLink } from "@/components/shared/navbar/animated-nav-link"
import { MobileMenuToggle } from "@/components/shared/navbar/mobile-menu-toggle"
import { ResourcesDropdown } from "@/components/shared/navbar/resources-dropdown"
import { ServicesDropdown } from "@/components/shared/navbar/services-dropdown"
import { ThemeSwitch } from "@/components/shared/navbar/theme-switch"
import { UserMenu } from "@/components/shared/navbar/user-menu"
import { useAuth } from "@/lib/supabase/auth-provider"
import { cn } from "@/lib/utils"

let navbarMobileDrawerPromise: ReturnType<typeof importNavbarMobileDrawer> | null = null

function importNavbarMobileDrawer() {
  return import("@/components/shared/navbar/mobile-drawer").then(
    (module) => module.NavbarMobileDrawer,
  )
}

const loadNavbarMobileDrawer = () => {
  navbarMobileDrawerPromise ??= importNavbarMobileDrawer()
  return navbarMobileDrawerPromise
}

const DeferredNavbarMobileDrawer = dynamic(loadNavbarMobileDrawer, { ssr: false })

interface NavbarProps {
  variant?: "marketing" | "patient" | "doctor"
  userName?: string
}

export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileDrawerLoaded, setMobileDrawerLoaded] = useState(false)
  const [mobileDrawerPending, setMobileDrawerPending] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { user, isLoaded } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || userName?.split(" ")[0] || "User"
  const isActivePath = (path: string) => pathname === path || pathname?.startsWith(path + "/")
  const prepareMobileDrawer = async () => {
    try {
      await loadNavbarMobileDrawer()
      setMobileDrawerLoaded(true)
      return true
    } catch {
      // Allow a later interaction to retry a failed chunk request while the
      // disclosure stays truthfully collapsed.
      navbarMobileDrawerPromise = null
      return false
    }
  }

  const toggleMobileDrawer = async () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
      return
    }
    if (mobileDrawerPending) return

    setMobileDrawerPending(true)
    try {
      if (await prepareMobileDrawer()) setMobileMenuOpen(true)
    } finally {
      setMobileDrawerPending(false)
    }
  }

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 z-50 px-4 sm:px-6 top-0",
          mobileMenuOpen && "max-md:z-[60]",
        )}
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        data-first-interaction-ignore="true"
      >
        <nav
          className={cn(
            "group relative mx-auto max-w-5xl rounded-2xl p-1 border shadow-lg",
            "transition-[border-color,box-shadow,background-color] duration-300",
            scrolled
              ? "bg-background/95 backdrop-blur-xl border-border/60 shadow-xl"
              : "bg-linear-to-b from-background/80 to-background/40 backdrop-blur-lg border-border/40",
            mobileMenuOpen && "max-md:border-transparent max-md:bg-transparent max-md:shadow-none max-md:backdrop-blur-none",
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Nav glow effect - CSS group-hover replaces framer-motion whileHover */}
          <div
            className={cn(
              "absolute -inset-2 rounded-3xl z-0 pointer-events-none",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              "bg-gradient-radial from-transparent via-primary/8 to-transparent dark:via-primary/15",
            )}
          />
          <div className="relative z-10 flex items-center justify-between px-3 py-1">
            {/* Logo */}
            <BrandLogo
              size="md"
              priority
              prefetch={false}
              className={cn(
                "relative z-10",
                mobileMenuOpen && "max-md:opacity-0"
              )}
            />

            {/* Desktop Navigation */}
            <div className="relative z-10 hidden items-center gap-1 md:flex">
              {variant === "marketing" && (
                <>
                  <ServicesDropdown isActivePath={isActivePath} />
                  <AnimatedNavLink
                    href="/pricing"
                    isActive={isActivePath("/pricing")}
                  >
                    Pricing
                  </AnimatedNavLink>
                  <AnimatedNavLink
                    href="/blog"
                    isActive={isActivePath("/blog")}
                    prefetch={false}
                  >
                    Blog
                  </AnimatedNavLink>
                  <ResourcesDropdown isActivePath={isActivePath} />

                  <UserMenu
                    variant="marketing"
                    firstName={firstName}
                    isActivePath={isActivePath}
                    pathname={pathname}
                    isLoaded={isLoaded}
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
                  isLoaded={isLoaded}
                  user={user}
                />
              )}

              {variant === "doctor" && (
                <UserMenu
                  variant="doctor"
                  firstName={firstName}
                  isActivePath={isActivePath}
                  pathname={pathname}
                  isLoaded={isLoaded}
                  user={user}
                />
              )}

              <ThemeSwitch className="ml-1" />
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <MobileMenuToggle
                toggle={toggleMobileDrawer}
                isOpen={mobileMenuOpen}
                isPending={mobileDrawerPending}
                onIntent={() => void prepareMobileDrawer()}
              />
            </div>
          </div>
        </nav>
      </header>

      {mobileDrawerLoaded ? (
        <DeferredNavbarMobileDrawer
          variant={variant}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      ) : (
        <span id="mobile-navigation-menu" hidden />
      )}
    </>
  )
}
