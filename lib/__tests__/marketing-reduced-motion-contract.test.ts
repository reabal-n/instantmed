import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function firstMotionContainerOpeningTag(source: string): string {
  const match = source.match(/<motion\.div[\s\S]*?>/)
  expect(match, "expected a motion.div container").not.toBeNull()
  return match?.[0] ?? ""
}

describe("marketing reduced-motion contract", () => {
  it("keeps hydration stable and resolves the browser preference before paint", () => {
    const motion = read("components/ui/motion.tsx")

    expect(motion).toContain('const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"')
    expect(motion).toContain("function getReducedMotionSnapshot()")
    expect(motion).toContain("function getServerReducedMotionSnapshot()")
    expect(motion).toContain("return React.useSyncExternalStore(")
    expect(motion).not.toContain("React.useState(getInitialReducedMotion)")
  })

  it("removes global animation and transition delays", () => {
    const globals = read("app/globals.css")
    const globalReducedMotion = globals.slice(globals.indexOf("GLOBAL REDUCED MOTION"))

    expect(globalReducedMotion).toContain("animation-duration: 0.01ms !important;")
    expect(globalReducedMotion).toContain("animation-delay: 0ms !important;")
    expect(globalReducedMotion).toContain("transition-duration: 0.01ms !important;")
    expect(globalReducedMotion).toContain("transition-delay: 0ms !important;")
    expect(globalReducedMotion).toContain("[data-reduced-motion-final] {")
    expect(globalReducedMotion).toContain("opacity: 1 !important;")
    expect(globalReducedMotion).toContain("transform: none !important;")
  })

  it("settles the hero doctor card and floats immediately", () => {
    const hero = read("components/marketing/hero-doctor-review-mockup.tsx")

    expect(hero).toContain(
      "const [activeIndex, setActiveIndex] = useState(REVIEW_STEPS.length - 1)",
    )
    expect(hero).toContain('initial={animate ? "hidden" : "reduced"}')
    expect(hero.match(/animate=\{entranceControls\}/g)).toHaveLength(2)
    expect(hero).toContain("entranceControls.stop()")
    expect(hero).toContain('entranceControls.set("reduced")')
    expect(hero).toContain("reduced: { y: 0, transition: { duration: 0, delay: 0 } }")
    expect(hero).toContain(
      "reduced: { opacity: 1, scale: 1, y: 0, transition: { duration: 0, delay: 0 } }",
    )
    expect(hero).toContain('data-reduced-motion-final="doctor-card"')
    expect(hero).toContain('data-reduced-motion-final="doctor-float"')
    expect(hero).not.toContain(": false}")
    expect(hero.match(/duration: prefersReducedMotion \? 0 : /g)).toHaveLength(2)
    expect(hero.match(/delay: prefersReducedMotion \? 0 : /g)).toHaveLength(2)
  })

  it("settles stats hero and strip entrances immediately", () => {
    const hero = read("components/heroes/stats-hero.tsx")
    const strip = read("components/sections/stat-strip.tsx")

    expect(hero.match(/duration: prefersReducedMotion \? 0 : 0\.3/g)).toHaveLength(2)
    expect(hero).toContain("delay: prefersReducedMotion ? 0 : 0.6")
    expect(hero).toContain("delay: prefersReducedMotion ? 0 : 0.8")
    expect(hero).not.toMatch(/key=\{prefersReducedMotion/)
    expect(hero.match(/initial=\{prefersReducedMotion \? "reduced" : "hidden"\}/g)).toHaveLength(2)
    expect(hero.match(/animate=\{entranceControls\}/g)).toHaveLength(2)
    expect(hero).toContain("entranceControls.stop()")
    expect(hero).toContain('entranceControls.set("reduced")')
    expect(hero).toContain("reduced: { opacity: 1, y: 0, transition: { duration: 0, delay: 0 } }")
    expect(hero).toContain('data-reduced-motion-final="stats-subtitle"')
    expect(hero).toContain('data-reduced-motion-final="stats-content"')
    expect(strip).toContain("duration: prefersReducedMotion ? 0 : 0.3")
    expect(strip).toContain("delay: prefersReducedMotion ? 0 : i * 0.1")
    expect(strip).toContain("entranceControls.stop()")
    expect(strip).toContain('entranceControls.set("reduced")')
    expect(strip).toContain("animate={entranceControls}")
    expect(strip).toContain("reduced: { opacity: 1, y: 0, transition: { duration: 0, delay: 0 } }")
    expect(strip).toContain('data-reduced-motion-final="stat-item"')
  })

  it("uses one stable mobile-menu tree and disables motion in place", () => {
    const menu = read("components/ui/animated-mobile-menu.tsx")
    const navbar = read("components/shared/navbar.tsx")
    const iconPath = menu.slice(
      menu.indexOf("const Path ="),
      menu.indexOf("// Animated hamburger toggle button"),
    )

    expect(navbar).toContain('mobileMenuOpen && "max-md:z-[60]"')
    expect(menu).toContain(
      'data-mobile-menu-motion={prefersReducedMotion ? "static" : "animated"}',
    )
    expect(menu).toContain(
      'const openMotionState = prefersReducedMotion ? "reducedOpen" : "open"',
    )
    expect(menu).toContain(
      'const closedMotionState = prefersReducedMotion ? "reducedClosed" : "closed"',
    )
    expect(menu).not.toContain("if (prefersReducedMotion) {")
    expect(menu).toContain('data-mobile-menu-panel="true"')
    expect(menu).toContain('data-mobile-menu-content="true"')
    expect(menu).toContain("const returnFocusRef = useRef<HTMLElement | null>(null)")
    expect(menu).toContain(
      "returnFocusRef.current = opener instanceof HTMLElement ? opener : null",
    )
    expect(menu).toContain("returnFocusRef.current?.focus({ preventScroll: true })")
    expect(menu).toContain("firstNavigationLink ?? getVisibleDrawerControls(contentRef.current)[0]")
    expect(menu).toContain("tabIndex={-1}")
    expect(menu).toContain('e.key !== "Tab"')
    expect(menu).toContain('aria-controls="mobile-navigation-menu"')
    expect(menu).not.toContain("initial={prefersReducedMotion ? false")
    expect(menu).toContain(
      "whileHover={item.disabled || prefersReducedMotion ? undefined : { y: -1, x: 4",
    )
    expect(menu).toContain(
      "whileTap={item.disabled || prefersReducedMotion ? undefined : { scale: 0.98,",
    )
    expect(menu).not.toContain("clipPath")
    expect(menu).toContain("d: string")
    expect(menu).toContain('d="M 2 2.5 L 20 2.5"')
    expect(menu).toContain('d="M 2 16.346 L 20 16.346"')
    expect(iconPath).toContain("initial={false}")
    expect(iconPath).not.toContain("initial={{}}")
    expect(menu).toContain('x: "100%"')
    expect(menu).toContain("duration: 0.22")
    expect(menu).toContain("duration: 0.16")
    expect(menu).not.toContain("delay: 0.1")
    expect(menu).toContain("staggerChildren: 0.05")
    expect(menu).toContain("delayChildren: 0.04")
    expect(menu).toContain("y: 12")
    expect(menu).toContain('type: "tween"')
    expect(menu).toContain('animate={isOpen ? "open" : "closed"}')
    expect(menu).toContain("duration: prefersReducedMotion ? 0 : 0.15")
  })

  it("moves the pricing sticky CTA by its own height and settles reduced motion", () => {
    const sticky = read("app/pricing/pricing-sticky-cta.tsx")
    const container = firstMotionContainerOpeningTag(sticky)

    expect(sticky).toContain(
      'initial={prefersReducedMotion ? { y: 0 } : { y: "100%" }}',
    )
    expect(sticky).toContain("animate={{")
    expect(sticky).toContain('y: prefersReducedMotion ? 0 : "100%"')
    expect(sticky).toContain("duration: prefersReducedMotion ? 0 : 0.18")
    expect(sticky).toContain("duration: prefersReducedMotion ? 0 : 0.14")
    expect(container).not.toMatch(/\bopacity\b/)
  })

  it("keeps the shared mobile purchase bar inert when hidden and transform-only", () => {
    const sticky = read("components/marketing/shared/sticky-cta.tsx")
    const container = firstMotionContainerOpeningTag(sticky)

    expect(sticky).toContain("initial={{}}")
    expect(sticky).toContain('y: show ? 0 : "100%"')
    expect(sticky).toContain("show ? 0.18 : 0.14")
    expect(sticky).toContain('visibility: show ? "visible" : "hidden"')
    expect(sticky).toContain("inert={!show ? true : undefined}")
    expect(sticky).not.toContain("useScrollDirection")
    expect(sticky).not.toContain("grid-template-rows,opacity,margin")
    expect(container).not.toMatch(/\bopacity\b/)
  })

  it("uses the shared strong-out timing for hero and reveal entrances", () => {
    const globals = read("app/globals.css")
    const motion = read("lib/motion/index.ts")
    const escriptMockup = read("components/marketing/mockups/escript-hero-mockup.tsx")
    const heroMotion = globals.slice(
      globals.indexOf("/* Hero entrance animations"),
      globals.indexOf("/* Fade in up with spring */"),
    )

    expect(heroMotion).toContain("0.22s cubic-bezier(0.23, 1, 0.32, 1)")
    expect(heroMotion).toContain("0.25s cubic-bezier(0.23, 1, 0.32, 1)")
    expect(heroMotion).toContain("0.05s")
    expect(heroMotion).toContain("reveal-fade-up 0.25s cubic-bezier(0.23, 1, 0.32, 1)")
    expect(heroMotion).not.toMatch(/hero-fade-(?:up|down|up-lg)\s+0\.[45]s/)
    expect(heroMotion).not.toContain("reveal-fade-up 0.5s")

    expect(motion).toContain("duration: duration.slow")
    expect(motion).toContain("ease: easing.strongOut")
    expect(motion).not.toContain("duration: 0.4")

    expect(escriptMockup).toContain("hero-fade-up 0.22s cubic-bezier(0.23, 1, 0.32, 1) 0.15s both")
    expect(escriptMockup).toContain("hero-fade-up 0.22s cubic-bezier(0.23, 1, 0.32, 1) 0.30s both")
    expect(escriptMockup).not.toMatch(/hero-fade-up 0\.[3-9]s/)
    expect(escriptMockup).not.toMatch(/hero-fade-up[^"\n]+(?:0\.9s|1\.1s|1\.3s)/)
  })

  it("animates request progress with a composite transform", () => {
    const progress = read("components/request/progress-bar.tsx")

    expect(progress).toContain('data-request-progress-fill="true"')
    expect(progress).toContain("transition-transform duration-200")
    expect(progress).toContain("transform: `scaleX(${progressPercent / 100})`")
    expect(progress).toContain('transformOrigin: "left center"')
    expect(progress).not.toContain("transition-[width]")
    expect(progress).not.toContain("width: `${progressPercent}%`")
  })
})
