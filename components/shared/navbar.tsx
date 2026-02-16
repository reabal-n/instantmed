"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { SignInButton, SignedIn, SignedOut, UserButton, useUser, useClerk } from "@clerk/nextjs"
import {
  LogOut,
  User,
  FileText,
  Pill,
  ChevronDown,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Stethoscope,
  Shield,
  Star,
} from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"
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

interface NavbarProps {
  variant?: "marketing" | "patient" | "doctor"
  userName?: string
}

const services = [
  {
    title: "Medical Certificates",
    href: "/medical-certificates",
    description: "Work, uni & carer's leave",
    icon: FileText,
  },
  {
    title: "Repeat Scripts",
    href: "/repeat-prescriptions",
    description: "Medications you already take",
    icon: Pill,
  },
  {
    title: "General Consult",
    href: "/general-consult",
    description: "New prescriptions & dose changes",
    icon: Stethoscope,
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
      opacity: { duration: 0.3, ease: "easeOut" },
      scale: { duration: 0.3, ease: "easeOut" },
    },
  },
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
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


export function Navbar({ variant = "marketing", userName }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [_servicesDropdownOpen, _setServicesDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"
  const { signOut } = useClerk()
  const { user, isLoaded: _isLoaded } = useUser()

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

  const firstName = user?.firstName || userName?.split(" ")[0] || "User"
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
                ? "bg-gradient-radial from-transparent via-primary/15 to-transparent"
                : "bg-gradient-radial from-transparent via-primary/8 to-transparent"
            )}
            variants={navGlowVariants}
          />
          <div className="relative z-10 flex items-center justify-between px-3 py-1.5">
            {/* Logo */}
            <BrandLogo size="sm" className="relative z-10" />

            {/* Desktop Navigation */}
            <div className="relative z-10 hidden items-center gap-1 md:flex">
              {variant === "marketing" && (
                <>
                  {/* Services Hover Menu */}
                  <div className="relative group">
                    <span
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-default",
                        isActivePath("/medical-certificate") || isActivePath("/prescriptions") || isActivePath("/consult")
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      Services
                      <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
                    </span>
                    <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="w-64 rounded-2xl border border-white/50 dark:border-white/10 bg-white/95 dark:bg-white/10 backdrop-blur-xl shadow-xl dark:shadow-none p-2">
                        {services.map((service) => (
                          <Link
                            key={service.href}
                            href={service.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors group/item"
                          >
                            <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover/item:bg-primary/20 dark:group-hover/item:bg-primary/30 transition-colors">
                              <service.icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{service.title}</p>
                              <p className="text-xs text-muted-foreground">{service.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <AnimatedNavLink href="/trust" isActive={isActivePath("/trust")}>
                    Why us?
                  </AnimatedNavLink>
                  <AnimatedNavLink href="/reviews" isActive={isActivePath("/reviews")}>
                    <Star className="h-3 w-3 mr-1" />
                    Reviews
                  </AnimatedNavLink>
                  <AnimatedNavLink href="/blog" isActive={isActivePath("/blog")}>
                    Health Guides
                  </AnimatedNavLink>

                  <div className="ml-2 flex items-center gap-2">
                    <SkyToggle size={8} />
                    <Button
                      as={Link}
                      href="/request"
                      size="sm"
                      className="text-xs h-7 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      Get started
                    </Button>
                    <SignedOut>
                      <SignInButton mode="modal">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs h-7 px-3 border-border/40 bg-background/50 hover:bg-background/80 dark:hover:bg-background/20 transition-all flex items-center justify-center"
                        >
                          Sign in
                        </Button>
                      </SignInButton>
                    </SignedOut>
                    <SignedIn>
                      <Link
                        href="/patient"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Dashboard
                      </Link>
                      <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                  </div>
                </>
              )}

              {variant === "patient" && (
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
                      {services.map((service) => (
                        <DropdownMenuItem 
                          key={service.href}
                          className="cursor-pointer"
                          onPress={() => router.push(service.href)}
                        >
                          <div className="flex items-center gap-2">
                            <service.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <div>
                              <p className="text-sm font-medium">{service.title}</p>
                              <p className="text-xs text-muted-foreground">{service.description}</p>
                            </div>
                          </div>
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
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onPress={() => router.push("/patient/settings")}
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
              )}

              {variant === "doctor" && (
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
                        onPress={() => router.push("/doctor/admin")}
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
          <BrandLogo size="md" onClick={() => setMobileMenuOpen(false)} />
        }
        footer={
          <div className="space-y-3">
            <div className="flex justify-center py-2">
              <SkyToggle size={20} />
            </div>
            {variant === "marketing" && (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline" className="w-full rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border-border/40 transition-all flex items-center justify-center">
                      Sign in
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex justify-center">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                <Button
                  as={Link}
                  href="/request"
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Get started
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
            <AnimatedMobileMenu.Section title="Services" />
            <AnimatedMobileMenu.Item
              item={{
                label: "Medical certificates",
                href: "/request?service=med-cert",
                description: "Work, uni & carer's leave",
                icon: <FileText className="h-5 w-5" />,
              }}
              index={0}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{
                label: "Repeat Rx",
                href: "/request?service=prescription",
                description: "Medications you already take",
                icon: <Pill className="h-5 w-5" />,
              }}
              index={1}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{
                label: "General consult",
                href: "/request?service=consult",
                description: "New prescriptions & dose changes",
                icon: <Stethoscope className="h-5 w-5" />,
              }}
              index={2}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Divider />
            <AnimatedMobileMenu.Item
              item={{ label: "Why us?", href: "/trust", icon: <Shield className="h-5 w-5" /> }}
              index={3}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "Reviews", href: "/reviews", icon: <Star className="h-5 w-5" /> }}
              index={4}
              onClose={() => setMobileMenuOpen(false)}
            />
            <AnimatedMobileMenu.Item
              item={{ label: "Health Guides", href: "/blog", icon: <FileText className="h-5 w-5" /> }}
              index={5}
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
              item={{ label: "My Requests", href: "/patient/intakes", icon: <ClipboardList className="h-5 w-5" /> }}
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
              item={{ label: "Queue", href: "/doctor/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> }}
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
