"use client"

import type { User as SupabaseUser } from "@supabase/supabase-js"
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  User,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { AnimatedNavLink } from "@/components/shared/navbar/animated-nav-link"
import { services } from "@/components/shared/navbar/services-dropdown"
import { NotificationBell } from "@/components/shared/notification-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/uix"
import {
  PATIENT_DASHBOARD_HREF,
  PATIENT_INTAKES_HREF,
  PATIENT_SETTINGS_HREF,
  REQUEST_HREF,
  STAFF_DASHBOARD_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SCRIPTS_HREF,
  STAFF_QUEUE_HREF,
} from "@/lib/dashboard/routes"

interface UserMenuProps {
  variant: "marketing" | "patient" | "doctor"
  firstName: string
  isActivePath: (path: string) => boolean
  pathname: string
  isLoaded: boolean
  user: SupabaseUser | null
}

export function UserMenu({
  variant,
  firstName,
  isActivePath,
  pathname,
  isLoaded,
  user,
}: UserMenuProps) {
  const router = useRouter()
  const { isServiceDisabled } = useServiceAvailability()

  if (variant === "marketing") {
    return (
      <div className="ml-2 flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="text-xs h-7 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Link href={REQUEST_HREF}>
            Start a request
          </Link>
        </Button>
        {/*
          Auth-aware link. Renders nothing until the client provider has
          resolved the session (the auth load fires on mount for marketing
          routes — see `AUTH_IMMEDIATE_ROOT_PATHS` in auth-provider.tsx).
          A fixed-width invisible placeholder reserves layout space so the
          nav doesn't reflow when the real link appears.

          Previously: rendered "Log in" by default while loading, then
          flipped to "Dashboard" once auth resolved. That produced the
          user-reported flicker where clicking the link changed it to
          "Dashboard" before navigating.
        */}
        {!isLoaded ? (
          <span
            aria-hidden
            className="inline-block h-7 w-[88px] rounded-lg border border-border/30 bg-transparent"
          />
        ) : user ? (
          <Link
            href={STAFF_DASHBOARD_HREF}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border/40"
          >
            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
            </div>
            Dashboard
          </Link>
        ) : (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  Log in
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Already have an account?
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  if (variant === "patient") {
    return (
      <>
        <AnimatedNavLink
          href={PATIENT_DASHBOARD_HREF}
          icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
          isActive={
            isActivePath(PATIENT_DASHBOARD_HREF) &&
            !isActivePath(PATIENT_INTAKES_HREF) &&
            !isActivePath(PATIENT_SETTINGS_HREF)
          }
        >
          Dashboard
        </AnimatedNavLink>
        <AnimatedNavLink
          href={PATIENT_INTAKES_HREF}
          icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath(PATIENT_INTAKES_HREF)}
        >
          My Requests
        </AnimatedNavLink>

        {/* New Request Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="ml-2 rounded-lg text-sm gap-1">
              New request
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {services.map((service) => {
              const disabled = isServiceDisabled(service.serviceId)
              return (
                <DropdownMenuItem
                  key={service.href}
                  disabled={disabled}
                  className="cursor-pointer"
                  onClick={() => !disabled && router.push(service.href)}
                >
                  <div className="flex items-center gap-2">
                    <ServiceIconTile iconKey={service.iconKey} color={service.color} size="sm" variant="sticker" stickerLoading="eager" />
                    <div>
                      <p className="text-sm font-medium">{service.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {disabled ? "Temporarily unavailable" : service.description}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <NotificationBell />

        {/* Static avatar - settings & sign out live in the sidebar */}
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ml-1" aria-hidden="true">
          <span className="text-xs font-semibold text-primary leading-none">
            {firstName?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
      </>
    )
  }

  if (variant === "doctor") {
    return (
      <>
        <AnimatedNavLink
          href={STAFF_QUEUE_HREF}
          icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
          isActive={pathname === STAFF_DASHBOARD_HREF}
        >
          Queue
        </AnimatedNavLink>
        <AnimatedNavLink
          href={STAFF_DOCTOR_SCRIPTS_HREF}
          icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath(STAFF_DOCTOR_SCRIPTS_HREF)}
        >
          Scripts
        </AnimatedNavLink>
        <AnimatedNavLink
          href={STAFF_DOCTOR_PATIENTS_HREF}
          icon={<User className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath(STAFF_DOCTOR_PATIENTS_HREF)}
        >
          Patients
        </AnimatedNavLink>

        {/* Static avatar - settings & sign out live in the sidebar */}
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ml-2" aria-hidden="true">
          <span className="text-xs font-semibold text-primary leading-none">
            {firstName?.[0]?.toUpperCase() ?? "D"}
          </span>
        </div>
      </>
    )
  }

  return null
}
