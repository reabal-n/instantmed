"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Menu,
  X,
  LogOut,
  User,
  FileText,
  Pill,
  Stethoscope,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface NavbarProps {
  variant?: "marketing" | "patient" | "doctor"
  userName?: string
}

const services = [
  {
    title: "Medical Certificates",
    href: "/medical-certificate/request",
    description: "Work, uni & carer's leave",
    icon: FileText,
  },
  {
    title: "Prescriptions",
    href: "/prescriptions/request",
    description: "Repeat scripts & reviews",
    icon: Pill,
  },
  {
    title: "Pathology & Imaging",
    href: "/referrals/pathology-imaging/request",
    description: "Blood tests & scans",
    icon: Stethoscope,
  },
]

export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const firstName = userName?.split(" ")[0] || "User"
  const isActivePath = (path: string) => pathname === path || pathname.startsWith(path + "/")

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-3">
      <nav
        className={cn(
          "mx-auto max-w-5xl rounded-2xl border border-border/40 bg-background/80 backdrop-blur-xl transition-all",
          scrolled ? "py-2 shadow-sm" : "py-2.5",
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="InstantMed home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold text-foreground">InstantMed</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {variant === "marketing" && (
              <>
                {services.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                      isActivePath(service.href)
                        ? "text-foreground bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    {service.title}
                  </Link>
                ))}
                <div className="ml-3 flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild className="rounded-lg text-sm">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button size="sm" asChild className="rounded-lg text-sm">
                    <Link href="/medical-certificate/request">Get started</Link>
                  </Button>
                </div>
              </>
            )}

            {variant === "patient" && (
              <>
                <Link
                  href="/patient"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    isActivePath("/patient") && !isActivePath("/patient/requests") && !isActivePath("/patient/settings")
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
                <Link
                  href="/patient/requests"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    isActivePath("/patient/requests")
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  My Requests
                </Link>

                {/* New Request Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="ml-2 rounded-lg text-sm gap-1">
                      New request
                      <ChevronRight className="h-3 w-3 rotate-90" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {services.map((service) => (
                      <DropdownMenuItem key={service.href} asChild>
                        <Link href={service.href} className="flex items-center gap-2 cursor-pointer">
                          <service.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-medium">{service.title}</p>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-2 rounded-lg gap-1.5">
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{firstName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/patient/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Settings
                      </Link>
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
            )}

            {variant === "doctor" && (
              <>
                <Link
                  href="/doctor"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/doctor"
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Queue
                </Link>
                <Link
                  href="/doctor/patients"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    isActivePath("/doctor/patients")
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Patients
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-2 rounded-lg gap-1.5">
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Dr. {firstName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/doctor/admin" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Admin
                      </Link>
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
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open menu">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                      <Zap className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-base font-semibold">InstantMed</span>
                  </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1" aria-label="Mobile navigation">
                  {variant === "marketing" && (
                    <>
                      {services.map((service) => (
                        <Link
                          key={service.href}
                          href={service.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <service.icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{service.title}</p>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </div>
                        </Link>
                      ))}
                      <div className="pt-4 space-y-2">
                        <Button variant="outline" asChild className="w-full rounded-lg bg-transparent">
                          <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                            Sign in
                          </Link>
                        </Button>
                        <Button asChild className="w-full rounded-lg">
                          <Link href="/medical-certificate/request" onClick={() => setMobileMenuOpen(false)}>
                            Get started
                          </Link>
                        </Button>
                      </div>
                    </>
                  )}

                  {variant === "patient" && (
                    <>
                      <Link
                        href="/patient"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          isActivePath("/patient") && !isActivePath("/patient/requests")
                            ? "bg-muted"
                            : "hover:bg-muted",
                        )}
                      >
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Dashboard</span>
                      </Link>
                      <Link
                        href="/patient/requests"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          isActivePath("/patient/requests") ? "bg-muted" : "hover:bg-muted",
                        )}
                      >
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">My Requests</span>
                      </Link>
                      <Link
                        href="/patient/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          isActivePath("/patient/settings") ? "bg-muted" : "hover:bg-muted",
                        )}
                      >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Settings</span>
                      </Link>

                      <div className="pt-4 border-t mt-4">
                        <p className="px-3 text-xs font-medium text-muted-foreground mb-2">New request</p>
                        {services.map((service) => (
                          <Link
                            key={service.href}
                            href={service.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                          >
                            <service.icon className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{service.title}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="pt-4 border-t mt-4">
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false)
                            handleSignOut()
                          }}
                          disabled={isLoggingOut}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 text-red-600 w-full transition-colors"
                        >
                          <LogOut className="h-5 w-5" />
                          <span className="text-sm font-medium">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                        </button>
                      </div>
                    </>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
