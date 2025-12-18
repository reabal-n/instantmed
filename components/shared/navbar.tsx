"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Menu,
  X,
  LogOut,
  User,
  FileText,
  Pill,
  ChevronDown,
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
import SkyToggle from "@/components/ui/sky-toggle"
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
    title: "Repeat Scripts",
    href: "/prescriptions/request",
    description: "Medications you already take",
    icon: Pill,
  },
  {
    title: "General Consult",
    href: "/consult/request",
    description: "New prescriptions & dose changes",
    icon: Zap,
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
    color: "text-indigo-500",
  },
]

function NavLink({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-300",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="navbar-tubelight"
          className="absolute inset-0 rounded-full bg-primary/10 -z-10"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
            <div className="absolute w-8 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-1" />
          </div>
        </motion.div>
      )}
    </Link>
  )
}

export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
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
      <header
        className={cn("fixed left-0 right-0 z-50 px-4 sm:px-6 top-0 pt-4")}
      >
        <nav
          className={cn(
            "relative mx-auto max-w-5xl rounded-full",
            "transition-all duration-300 liquid-glass-nav-pill",
            scrolled && "scrolled",
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="relative z-10 flex items-center justify-between px-4 py-2">
            {/* Logo */}
            <Link href="/" className="relative z-10 flex items-center gap-1.5 group" aria-label="InstantMed home">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Zap className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-foreground">InstantMed</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="relative z-10 hidden items-center gap-1 md:flex">
              {variant === "marketing" && (
                <>
                  {/* Services Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-2 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center gap-0.5">
                        Services
                        <ChevronDown className="h-3 w-3" />
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

                  <NavLink href="/how-it-works" isActive={pathname === "/how-it-works"}>
                    How it works
                  </NavLink>
                  <NavLink href="/pricing" isActive={pathname === "/pricing"}>
                    Pricing
                  </NavLink>

                  <div className="ml-2 flex items-center gap-1.5">
                    <SkyToggle size={12} />
                    {user ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-md text-xs h-7 px-2 hover:bg-white/40 dark:hover:bg-white/5"
                      >
                        <Link href="/patient">Dashboard</Link>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-md text-xs h-7 px-2 hover:bg-white/40 dark:hover:bg-white/5"
                      >
                        <Link href="/auth/login">Sign in</Link>
                      </Button>
                    )}
                    <Button size="sm" asChild className="rounded-md text-xs h-7 px-3 btn-premium">
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
                        <ChevronDown className="h-3 w-3" aria-hidden="true" />
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200" 
                  aria-label="Open menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 border-l border-white/20 bg-gradient-to-b from-white/95 to-white/90 dark:from-gray-900/95 dark:to-gray-900/90 backdrop-blur-xl">
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-white/20">
                    <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
                        <Zap className="h-4.5 w-4.5 text-white" />
                      </div>
                      <span className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">InstantMed</span>
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
                              <ChevronDown className="h-3 w-3" />
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

                        <div className="pt-4 space-y-3 border-t border-white/20 mt-4">
                          <div className="flex justify-center py-2">
                            <SkyToggle size={20} />
                          </div>
                          <Button variant="outline" asChild className="w-full rounded-xl bg-white/50 hover:bg-white/80 border-white/40 transition-all">
                            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                              Sign in
                            </Link>
                          </Button>
                          <Button asChild className="w-full rounded-xl btn-premium">
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
                            "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 min-h-[52px] active:scale-[0.98]",
                            isActivePath("/patient") && !isActivePath("/patient/requests")
                              ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 shadow-sm"
                              : "hover:bg-white/60 active:bg-white/80",
                          )}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          <span className="text-sm font-medium">Dashboard</span>
                        </Link>
                        <Link
                          href="/patient/requests"
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 min-h-[52px] active:scale-[0.98]",
                            isActivePath("/patient/requests") 
                              ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 shadow-sm" 
                              : "hover:bg-white/60 active:bg-white/80",
                          )}
                        >
                          <ClipboardList className="h-5 w-5" />
                          <span className="text-sm font-medium">My Requests</span>
                        </Link>
                        <Link
                          href="/patient/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 min-h-[52px] active:scale-[0.98]",
                            isActivePath("/patient/settings") 
                              ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 shadow-sm" 
                              : "hover:bg-white/60 active:bg-white/80",
                          )}
                        >
                          <Settings className="h-5 w-5" />
                          <span className="text-sm font-medium">Settings</span>
                        </Link>

                        <div className="pt-4 border-t border-white/20 mt-4">
                          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">New request</p>
                          {services.map((service) => (
                            <Link
                              key={service.href}
                              href={service.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/60 active:bg-white/80 transition-all duration-200 min-h-[52px] active:scale-[0.98]"
                            >
                              <service.icon className="h-5 w-5 text-indigo-500" />
                              <div>
                                <span className="text-sm font-medium block">{service.title}</span>
                                <span className="text-xs text-muted-foreground">{service.description}</span>
                              </div>
                            </Link>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-white/20 mt-4 space-y-3">
                          <div className="flex justify-center py-2">
                            <SkyToggle size={20} />
                          </div>
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false)
                              handleSignOut()
                            }}
                            disabled={isLoggingOut}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-50/80 active:bg-red-100 text-red-600 w-full transition-all duration-200 min-h-[52px] active:scale-[0.98]"
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
