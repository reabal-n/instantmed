"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser, useClerk, UserButton } from "@clerk/nextjs"
import {
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Stethoscope,
} from "lucide-react"
import { Button } from "@/components/uix"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import { NotificationBell } from "@/components/shared/notification-bell"
import { AnimatedNavLink } from "@/components/shared/navbar/animated-nav-link"
import { services } from "@/components/shared/navbar/services-dropdown"
import SkyToggle from "@/components/ui/sky-toggle"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"

interface UserMenuProps {
  variant: "marketing" | "patient" | "doctor"
  firstName: string
  isActivePath: (path: string) => boolean
  pathname: string
  handleSignOut: () => Promise<void>
  isLoggingOut: boolean
  isClerkLoaded: boolean
  user: ReturnType<typeof useUser>["user"]
}

export function UserMenu({
  variant,
  firstName,
  isActivePath,
  pathname,
  handleSignOut,
  isLoggingOut,
  isClerkLoaded,
  user,
}: UserMenuProps) {
  const router = useRouter()
  const { isServiceDisabled } = useServiceAvailability()

  if (variant === "marketing") {
    return (
      <div className="ml-2 flex items-center gap-2">
        <SkyToggle size={8} />
        <Button
          asChild
          size="sm"
          className="text-xs h-7 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Link href="/request">
            Start a request
          </Link>
        </Button>
        {isClerkLoaded && user ? (
          <>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <AppSignInButton>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs h-7 px-3 border-border/40 bg-background/50 hover:bg-background/80 dark:hover:bg-background/20 transition-all flex items-center justify-center"
            >
              Sign in
            </Button>
          </AppSignInButton>
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

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-1 rounded-lg gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/patient/settings")}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-2 rounded-lg gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Dr. {firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/doctor/admin")}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Admin
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )
  }

  return null
}
