"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/providers/supabase-auth-provider"
import {
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
import { Button } from "@/components/uix"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AnimatedMobileMenu, MenuToggle } from "@/components/ui/animated-mobile-menu"
import { cn } from "@/lib/utils"
import SkyToggle from "@/components/ui/sky-toggle"
import { NotificationBell } from "@/components/shared/notification-bell"
import { ShatterButtonLink } from "@/components/ui/shatter-button"

interface NavbarProps {
  variant?: "marketing" | "patient" | "doctor"
  userName?: string
}

const services = [
  {
    title: "Medical Certificates",
    href: "/start?service=med-cert",
    description: "Work, uni & carer's leave",
    icon: FileText,
  },
  {
    title: "Repeat Scripts",
    href: "/start?service=repeat-script",
    description: "Medications you already take",
    icon: Pill,
  },
  {
    title: "General Consult",
    href: "/start?service=consult",
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
    description: "Weight management consultation",
    icon: Scale,
    color: "text-indigo-500",
  },
]

// Animation variants for 3D flip effect
const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
}

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.15, ease: "easeOut" },
      scale: { duration: 0.15, ease: "easeOut" },
    },
  },
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: { duration: 0.15, ease: "easeOut" },
  },
}

const sharedTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  duration: 0.5,
}

interface AnimatedNavLinkProps {
  href: string
  children: React.ReactNode
  gradient?: string
  icon?: React.ReactNode
  isActive?: boolean
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

function AnimatedNavLink({ href, children, gradient, icon, isActive, onClick }: AnimatedNavLinkProps) {
  const defaultGradient = "radial-gradient(circle, rgba(0,226,181,0.15) 0%, rgba(0,226,181,0.06) 50%, rgba(0,226,181,0) 100%)"
  
  return (
    <motion.div
      className="relative"
      style={{ perspective: "600px" }}
      whileHover="hover"
      initial="initial"
    >
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none rounded-lg"
        variants={glowVariants}
        style={{
          background: gradient || defaultGradient,
          opacity: 0,
        }}
      />
      <motion.div
        variants={itemVariants}
        transition={sharedTransition}
        style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
      >
        <Link
          href={href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative z-10",
            isActive
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {icon}
          {children}
        </Link>
      </motion.div>
      <motion.div
        className="absolute inset-0 z-10"
        variants={backVariants}
        transition={sharedTransition}
        style={{ transformStyle: "preserve-3d", transformOrigin: "center top", rotateX: 90 }}
      >
        <Link
          href={href}
          onClick={onClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-foreground"
        >
          {icon}
          {children}
        </Link>
      </motion.div>
      {isActive && (
        <motion.div
          layoutId="navbar-tubelight"
          className="absolute inset-0 rounded-lg bg-primary/10 -z-10"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
            <div className="absolute w-8 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-1" />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function ScrollNavLink({ 
  sectionId, 
  isActive, 
  children 
}: { 
  sectionId: string
  isActive: boolean
  children: React.ReactNode 
}) {
  const pathname = usePathname()
  const router = useRouter()
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    
    const scrollToSection = () => {
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 80 // Account for fixed header
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }
    
    if (pathname === '/') {
      // Already on homepage, scroll to section
      scrollToSection()
    } else {
      // Navigate to homepage with hash, then scroll
      router.push(`/#${sectionId}`)
      // Wait for navigation, then scroll
      setTimeout(() => {
        scrollToSection()
      }, 300)
    }
  }
  
  return (
    <AnimatedNavLink 
      href={`/#${sectionId}`} 
      isActive={isActive}
      onClick={handleClick}
    >
      {children}
    </AnimatedNavLink>
  )
}

export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"
  const { signOut, isSignedIn } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await signOut()
    router.push("/")
    router.refresh()
  }

  const firstName = userName?.split(" ")[0] || "User"
  const isActivePath = (path: string) => pathname === path || pathname?.startsWith(path + "/")

  return (
    <>
      <header
        className={cn("fixed left-0 right-0 z-50 px-4 sm:px-6 top-0 pt-4")}
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
          whileHover="hover"
        >
          {/* Nav glow effect */}
          <motion.div
            className={cn(
              "absolute -inset-2 rounded-3xl z-0 pointer-events-none",
              isDarkTheme
                ? "bg-gradient-radial from-transparent via-indigo-400/20 to-transparent"
                : "bg-gradient-radial from-transparent via-indigo-400/10 to-transparent"
            )}
            variants={navGlowVariants}
          />
          <div className="relative z-10 flex items-center justify-between px-4 py-2">
            {/* Logo */}
            <Link href="/" className="relative z-10 flex items-center gap-1.5 group" aria-label="InstantMed home">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600">
                <Zap className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-foreground">InstantMed</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="relative z-10 hidden items-center gap-1 md:flex">
              {variant === "marketing" && (
                <>
                  {/* Services Dropdown */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setServicesDropdownOpen(true)}
                    onMouseLeave={() => setServicesDropdownOpen(false)}
                  >
                    <button 
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 dark:hover:bg-background/20 transition-all flex items-center gap-1"
                    >
                      Services
                      <ChevronDown className={cn("h-3 w-3 transition-transform", servicesDropdownOpen && "rotate-180")} />
                    </button>
                    
                    {servicesDropdownOpen && (
                      <div className="absolute top-full left-0 pt-2 z-[100]">
                        <div className="w-64 bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl border border-white/50 dark:border-white/15 rounded-2xl shadow-[0_12px_40px_rgb(59,130,246,0.2)] dark:shadow-[0_12px_40px_rgb(139,92,246,0.2)] p-2 space-y-1">
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Core Services</p>
                          </div>
                          {services.map((service) => (
                            <Link
                              key={service.href}
                              href={service.href}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                              <service.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              <div>
                                <p className="text-sm font-medium">{service.title}</p>
                                <p className="text-xs text-muted-foreground">{service.description}</p>
                              </div>
                            </Link>
                          ))}
                          <div className="h-px bg-border my-1" />
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Health Programs</p>
                          </div>
                          {healthVerticals.map((vertical) => (
                            <Link
                              key={vertical.href}
                              href={vertical.href}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                              <vertical.icon className={cn("h-4 w-4", vertical.color)} />
                              <div>
                                <p className="text-sm font-medium">{vertical.title}</p>
                                <p className="text-xs text-muted-foreground">{vertical.description}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <ScrollNavLink sectionId="how-it-works" isActive={pathname === "/how-it-works"}>
                    How it works
                  </ScrollNavLink>
                  <ScrollNavLink sectionId="pricing" isActive={pathname === "/pricing"}>
                    Pricing
                  </ScrollNavLink>

                  <div className="ml-2 flex items-center gap-2">
                    <SkyToggle size={8} />
                    <ShatterButtonLink href="/start" className="text-xs h-7 px-3 py-1">
                      Get started
                    </ShatterButtonLink>
                    {isSignedIn ? (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-lg text-xs h-7 px-3 border-border/40 bg-background/50 hover:bg-background/80 dark:hover:bg-background/20 transition-all"
                      >
                        <Link href="/patient">Dashboard</Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-lg text-xs h-7 px-3 border-border/40 bg-background/50 hover:bg-background/80 dark:hover:bg-background/20 transition-all"
                      >
                        <Link href="/auth/login">Sign in</Link>
                      </Button>
                    )}
                  </div>
                </>
              )}

              {variant === "patient" && (
                <>
                  <AnimatedNavLink
                    href="/patient"
                    icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
                    isActive={isActivePath("/patient") && !isActivePath("/patient/requests") && !isActivePath("/patient/settings")}
                    gradient="radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.06) 50%, rgba(99,102,241,0) 100%)"
                  >
                    Dashboard
                  </AnimatedNavLink>
                  <AnimatedNavLink
                    href="/patient/requests"
                    icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
                    isActive={isActivePath("/patient/requests")}
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
                  <AnimatedNavLink
                    href="/doctor"
                    icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
                    isActive={pathname === "/doctor"}
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
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">InstantMed</span>
          </Link>
        }
        footer={
          <div className="space-y-3">
            <div className="flex justify-center py-2">
              <SkyToggle size={20} />
            </div>
            {variant === "marketing" && (
              <>
                <Button variant="outline" asChild className="w-full rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border-border/40 transition-all">
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <ShatterButtonLink href="/start" className="w-full rounded-xl">
                  Get started
                </ShatterButtonLink>
              </>
            )}
            {variant === "patient" && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleSignOut()
                }}
                disabled={isLoggingOut}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
              </button>
            )}
          </div>
        }
      >
        {variant === "marketing" && (
          <>
            {services.map((service, index) => (
              <AnimatedMobileMenu.Item
                key={service.href}
                item={{
                  label: service.title,
                  href: service.href,
                  description: service.description,
                  icon: <service.icon className="h-5 w-5" />,
                }}
                index={index}
                onClose={() => setMobileMenuOpen(false)}
              />
            ))}
            <AnimatedMobileMenu.Divider />
            <AnimatedMobileMenu.Section title="Health Programs" />
            {healthVerticals.map((vertical, index) => (
              <AnimatedMobileMenu.Item
                key={vertical.href}
                item={{
                  label: vertical.title,
                  href: vertical.href,
                  description: vertical.description,
                  icon: <vertical.icon className="h-5 w-5" />,
                }}
                index={index + services.length}
                onClose={() => setMobileMenuOpen(false)}
              />
            ))}
            <AnimatedMobileMenu.Divider />
            <AnimatedMobileMenu.Item
              item={{ label: "How it works", href: "/how-it-works", icon: <Zap className="h-5 w-5" /> }}
              index={services.length + healthVerticals.length}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "Pricing", href: "/pricing", icon: <FileText className="h-5 w-5" /> }}
              index={services.length + healthVerticals.length + 1}
              onClose={() => setMobileMenuOpen(false)}
            />
          </>
        )}

        {variant === "patient" && (
          <>
            <AnimatedMobileMenu.Item
              item={{ label: "Dashboard", href: "/patient", icon: <LayoutDashboard className="h-5 w-5" /> }}
              index={0}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "My Requests", href: "/patient/requests", icon: <ClipboardList className="h-5 w-5" /> }}
              index={1}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "Settings", href: "/patient/settings", icon: <Settings className="h-5 w-5" /> }}
              index={2}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Divider />
            <AnimatedMobileMenu.Section title="New Request" />
            {services.map((service, index) => (
              <AnimatedMobileMenu.Item
                key={service.href}
                item={{
                  label: service.title,
                  href: service.href,
                  description: service.description,
                  icon: <service.icon className="h-5 w-5" />,
                }}
                index={index + 3}
                onClose={() => setMobileMenuOpen(false)}
              />
            ))}
          </>
        )}

        {variant === "doctor" && (
          <>
            <AnimatedMobileMenu.Item
              item={{ label: "Queue", href: "/doctor", icon: <LayoutDashboard className="h-5 w-5" /> }}
              index={0}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "Patients", href: "/doctor/patients", icon: <User className="h-5 w-5" /> }}
              index={1}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "Admin", href: "/doctor/admin", icon: <Settings className="h-5 w-5" /> }}
              index={2}
              onClose={() => setMobileMenuOpen(false)}
            />
          </>
        )}
      </AnimatedMobileMenu>
    </>
  )
}
