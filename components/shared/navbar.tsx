"use client"

import { LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import { BrandLogo } from "@/components/shared/brand-logo"
import { AnimatedNavLink } from "@/components/shared/navbar/animated-nav-link"
import { MobileMenuContent } from "@/components/shared/navbar/mobile-menu-content"
import { ResourcesDropdown } from "@/components/shared/navbar/resources-dropdown"
import { ServicesDropdown } from "@/components/shared/navbar/services-dropdown"
import { UserMenu } from "@/components/shared/navbar/user-menu"
import { AnimatedMobileMenu, MenuToggle } from "@/components/ui/animated-mobile-menu"
import { Button } from "@/components/uix"
import { useAuth } from "@/lib/supabase/auth-provider"
import { cn } from "@/lib/utils"

interface NavbarProps {
  variant?: "marketing" | "patient" | "doctor"
  userName?: string
}

export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"
  const { signOut, user, isLoaded } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await signOut()
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || userName?.split(" ")[0] || "User"
  const isActivePath = (path: string) => pathname === path || pathname?.startsWith(path + "/")

  return (
    <>
      <header
        className={cn("fixed left-0 right-0 z-50 px-4 sm:px-6 top-0")}
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <nav
          className={cn(
            "group relative mx-auto max-w-5xl rounded-2xl p-1 border shadow-lg",
            "transition-[border-color,box-shadow,background-color] duration-300",
            scrolled
              ? "bg-background/95 backdrop-blur-xl border-border/60 shadow-xl"
              : "bg-linear-to-b from-background/80 to-background/40 backdrop-blur-lg border-border/40",
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Nav glow effect - CSS group-hover replaces framer-motion whileHover */}
          <div
            className={cn(
              "absolute -inset-2 rounded-3xl z-0 pointer-events-none",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              isDarkTheme
                ? "bg-gradient-radial from-transparent via-primary/15 to-transparent"
                : "bg-gradient-radial from-transparent via-primary/8 to-transparent"
            )}
          />
          <div className="relative z-10 flex items-center justify-between px-3 py-1">
            {/* Logo */}
            <BrandLogo size="md" className="relative z-10" />

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
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <MenuToggle toggle={() => setMobileMenuOpen(!mobileMenuOpen)} isOpen={mobileMenuOpen} />
            </div>
          </div>
        </nav>
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
            {variant === "marketing" && (
              <>
                {isLoaded && user ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl bg-white dark:bg-card hover:bg-muted/50 dark:hover:bg-white/10 border-border/40 transition-colors flex items-center justify-center gap-2"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      router.push("/dashboard")
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                ) : (
                  <AppSignInButton>
                    <Button variant="outline" className="w-full rounded-xl bg-white dark:bg-card hover:bg-muted/50 dark:hover:bg-white/10 border-border/40 transition-colors flex items-center justify-center">
                      Log in
                    </Button>
                  </AppSignInButton>
                )}
                <Button
                  asChild
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Link href="/request">
                    Get started
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
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-destructive-light hover:bg-destructive-light text-destructive transition-colors"
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
