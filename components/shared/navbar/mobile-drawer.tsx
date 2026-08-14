"use client"

import { LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import { BrandLogo } from "@/components/shared/brand-logo"
import { MobileMenuContent } from "@/components/shared/navbar/mobile-menu-content"
import { ThemeSwitch } from "@/components/shared/navbar/theme-switch"
import { AnimatedMobileMenu } from "@/components/ui/animated-mobile-menu"
import { Button } from "@/components/ui/button"
import { navigateToPostSignIn } from "@/lib/navigation/auth-handoff"
import { useAuth } from "@/lib/supabase/auth-provider"

interface NavbarMobileDrawerProps {
  variant: "marketing" | "patient" | "doctor"
  isOpen: boolean
  onClose: () => void
}

/** Loaded on mobile-navigation intent so the closed marketing page does not pay for the drawer. */
export function NavbarMobileDrawer({ variant, isOpen, onClose }: NavbarMobileDrawerProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { signOut, user, isLoaded } = useAuth()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await signOut()
  }

  return (
    <AnimatedMobileMenu
      isOpen={isOpen}
      onClose={onClose}
      header={<BrandLogo size="md" onClick={onClose} />}
      footer={
        <div className="space-y-3">
          <ThemeSwitch variant="mobile" />
          {variant === "marketing" && (
            <>
              {!isLoaded ? (
                <div
                  className="h-10 w-full rounded-xl border border-border/40 bg-muted/40"
                  aria-hidden="true"
                />
              ) : user ? (
                <Button
                  variant="outline"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-border/40 bg-white transition-colors hover:bg-muted/50 dark:bg-card dark:hover:bg-white/10"
                  onClick={() => {
                    onClose()
                    navigateToPostSignIn(window)
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              ) : (
                <AppSignInButton>
                  <Button
                    variant="outline"
                    className="flex w-full items-center justify-center rounded-xl border-border/40 bg-white transition-colors hover:bg-muted/50 dark:bg-card dark:hover:bg-white/10"
                  >
                    Log in
                  </Button>
                </AppSignInButton>
              )}
              <Button
                asChild
                className="w-full rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Link
                  href="/request"
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  Get started
                </Link>
              </Button>
            </>
          )}
          {variant === "patient" && (
            <button
              type="button"
              onClick={() => {
                onClose()
                void handleSignOut()
              }}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive-light px-4 py-3 text-destructive transition-colors hover:bg-destructive-light"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </span>
            </button>
          )}
        </div>
      }
    >
      <MobileMenuContent variant={variant} onClose={onClose} />
    </AnimatedMobileMenu>
  )
}
