"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import {
  User,
  ChevronDown,
  LayoutDashboard,
  ClipboardList,
  FileText,
} from "lucide-react"
import { Button } from "@/components/uix"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import { NotificationBell } from "@/components/shared/notification-bell"
import { AnimatedNavLink } from "@/components/shared/navbar/animated-nav-link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { services } from "@/components/shared/navbar/services-dropdown"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"

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
          <Link href="/request">
            Start a request
          </Link>
        </Button>
        {isLoaded && user ? (
          <Link
            href="/dashboard"
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
                <AppSignInButton>
                  <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50">
                    Log in
                  </button>
                </AppSignInButton>
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
          href="/patient"
          icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath("/patient") && !isActivePath("/patient/intakes") && !isActivePath("/patient/settings")}
          gradient="radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.06) 50%, rgba(99,102,241,0) 100%)"
        >
          Dashboard
        </AnimatedNavLink>
        <AnimatedNavLink
          href="/patient/intakes"
          icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath("/patient/intakes")}
          gradient="radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.06) 50%, rgba(34,197,94,0) 100%)"
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
                    <service.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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

        {/* Static avatar — settings & sign out live in the sidebar */}
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
          href="/doctor/dashboard"
          icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
          isActive={pathname === "/doctor/dashboard"}
          gradient="radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.06) 50%, rgba(59,130,246,0) 100%)"
        >
          Queue
        </AnimatedNavLink>
        <AnimatedNavLink
          href="/doctor/patients"
          icon={<User className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath("/doctor/patients")}
          gradient="radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.06) 50%, rgba(168,85,247,0) 100%)"
        >
          Patients
        </AnimatedNavLink>
        <AnimatedNavLink
          href="/doctor/intakes"
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
          isActive={isActivePath("/doctor/intakes")}
          gradient="radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.06) 50%, rgba(34,197,94,0) 100%)"
        >
          Intakes
        </AnimatedNavLink>

        {/* Static avatar — settings & sign out live in the sidebar */}
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
