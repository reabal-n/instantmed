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
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Zap,
  Heart,
  Shield,
  Scale,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { DoctorAvailability } from "@/components/shared/doctor-availability"
import CinematicThemeSwitcher from "@/components/ui/cinematic-theme-switcher"
import { NotificationBell } from "@/components/shared/notification-bell"

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
]

const healthVerticals = [
  {
    title: "Women's Health",
    href: "/womens-health",
    description: "UTI, contraception & more",
    icon: Heart,
    color: "text-pink-500",
  },
  {
    title: "Men's Health",
    href: "/mens-health",
    description: "ED, hair loss & testing",
    icon: Shield,
    color: "text-blue-500",
  },
  {
    title: "Weight Loss",
    href: "/weight-loss",
    description: "Ozempic & Saxenda",
    icon: Scale,
    color: "text-[#00E2B5]",
  },
]

export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (variant === "marketing") {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user)
      })
    }
  }, [variant])

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
    <>
      {variant === "marketing" && (
        <div className="fixed top-0 left-0 right-0 z-[51]">
          <DoctorAvailability variant="banner" />
        </div>
      )}

      <header
        className={cn("fixed left-0 right-0 z-50 px-4 sm:px-6", variant === "marketing" ? "top-[41px] pt-4" : "top-0 pt-4")}
      >
        <nav
          className={cn(
            "relative mx-auto max-w-6xl rounded-full",
            "transition-all duration-300 liquid-glass-nav-pill",
            scrolled && "scrolled",
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="relative z-10 flex items-center justify-between px-6 py-3">
            {/* Logo */}
            <Link href="/" className="relative z-10 flex items-center gap-2 group" aria-label="InstantMed home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-[#00e2b5] to-[#06b6d4]">
                <Zap className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-base font-semibold text-foreground">InstantMed</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="relative z-10 hidden items-center gap-1 md:flex">
              {variant === "marketing" && (
                <>
                  {/* Services Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center gap-1">
                        Services
                        <ChevronRight className="h-3 w-3 rotate-90" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 glass-card border-white/20">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Core Services</DropdownMenuLabel>
                      {services.map((service) => (
                        <DropdownMenuItem key={service.href} asChild>
                          <Link href={service.href} className="flex items-center gap-2 cursor-pointer">
                            <service.icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{service.title}</p>
                              <p className="text-xs text-muted-foreground">{service.description}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Health Programs</DropdownMenuLabel>
                      {healthVerticals.map((vertical) => (
                        <DropdownMenuItem key={vertical.href} asChild>
                          <Link href={vertical.href} className="flex items-center gap-2 cursor-pointer">
                            <vertical.icon className={cn("h-4 w-4", vertical.color)} />
                            <div>
                              <p className="text-sm font-medium">{vertical.title}</p>
                              <p className="text-xs text-muted-foreground">{vertical.description}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link
                    href="/how-it-works"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5 transition-all"
                  >
                    How it works
                  </Link>
                  <Link
                    href="/about"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5 transition-all"
                  >
                    About
                  </Link>
                  <Link
                    href="/blog"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5 transition-all"
                  >
                    Blog
                  </Link>

                  <div className="ml-3 flex items-center gap-2">
                    <CinematicThemeSwitcher size="compact" />
                    {user ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-lg text-sm hover:bg-white/40 dark:hover:bg-white/5"
                      >
                        <Link href="/patient">Dashboard</Link>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-lg text-sm hover:bg-white/40 dark:hover:bg-white/5"
                      >
                        <Link href="/auth/login">Sign in</Link>
                      </Button>
                    )}
                    <Button size="sm" asChild className="rounded-lg text-sm btn-premium">
                      <Link href="/start">Get started</Link>
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
                      isActivePath("/patient") &&
                        !isActivePath("/patient/requests") &&
                        !isActivePath("/patient/settings")
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
                        {/* Services Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5 transition-all">
                              Services
                              <ChevronRight className="h-3 w-3 rotate-90" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64 glass-card border-white/20">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Core Services
                            </DropdownMenuLabel>
                            {services.map((service) => (
                              <DropdownMenuItem key={service.href} asChild>
                                <Link href={service.href} className="flex items-center gap-2 cursor-pointer">
                                  <service.icon className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">{service.title}</p>
                                    <p className="text-xs text-muted-foreground">{service.description}</p>
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Health Programs
                            </DropdownMenuLabel>
                            {healthVerticals.map((vertical) => (
                              <DropdownMenuItem key={vertical.href} asChild>
                                <Link href={vertical.href} className="flex items-center gap-2 cursor-pointer">
                                  <vertical.icon className={cn("h-4 w-4", vertical.color)} />
                                  <div>
                                    <p className="text-sm font-medium">{vertical.title}</p>
                                    <p className="text-xs text-muted-foreground">{vertical.description}</p>
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Link
                          href="/how-it-works"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <span className="text-sm font-medium">How it works</span>
                        </Link>
                        <Link
                          href="/about"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <span className="text-sm font-medium">About</span>
                        </Link>
                        <Link
                          href="/blog"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <span className="text-sm font-medium">Blog</span>
                        </Link>

                        <div className="pt-4 space-y-2">
                          <div className="flex justify-center pb-2">
                            <CinematicThemeSwitcher />
                          </div>
                          <Button variant="outline" asChild className="w-full rounded-lg bg-transparent">
                            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                              Sign in
                            </Link>
                          </Button>
                          <Button asChild className="w-full rounded-lg">
                            <Link href="/start" onClick={() => setMobileMenuOpen(false)}>
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

                        <div className="pt-4 border-t mt-4 space-y-3">
                          <div className="flex justify-center">
                            <CinematicThemeSwitcher />
                          </div>
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
    </>
  )
}
