"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Star, Sparkles, CheckCircle, Play, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SparklesText } from "@/components/ui/sparkles-text"
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { GradientMesh, NoiseOverlay } from "@/components/effects/gradient-mesh"
import { MagneticButton } from "@/components/effects/magnetic-button"
import { FloatingElement, Tilt3D, ParallaxFloat } from "@/components/effects/floating-element"
import { TextRevealWord, TextRevealLine } from "@/components/effects/text-reveal"
import { CursorSpotlight, GridSpotlight } from "@/components/effects/cursor-spotlight"
import { StaggerContainer } from "@/components/effects/stagger-container"

const floatingAvatars = [
  { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", delay: 0 },
  { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", delay: 0.1 },
  { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", delay: 0.2 },
  { src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", delay: 0.3 },
]

export function HeroSection() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  // Parallax transforms
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Mouse position for interactive effects
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  useEffect(() => {
    setMounted(true)

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      mouseX.set((clientX / innerWidth - 0.5) * 2)
      mouseY.set((clientY / innerHeight - 0.5) * 2)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  // Transform mouse position to visual effects
  const rotateX = useTransform(smoothMouseY, [-1, 1], [5, -5])
  const rotateY = useTransform(smoothMouseX, [-1, 1], [-5, 5])

  return (
    <section ref={containerRef} className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Animated gradient mesh background */}
      <motion.div className="absolute inset-0" style={{ y: backgroundY }}>
        <GradientMesh 
          className="absolute inset-0" 
          interactive={true}
          colors={["#00E2B5", "#06B6D4", "#8B5CF6", "#EC4899"]}
          blur={120}
          speed={25}
        />
        
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0fdf4] via-white to-[#ecfeff] dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        
        {/* Noise texture overlay */}
        <NoiseOverlay opacity={0.02} />
      </motion.div>

      {/* Animated gradient orbs with blob morphing */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-[#00E2B5]/25 to-[#06B6D4]/25 rounded-full blur-3xl animate-blob"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-[#8B5CF6]/25 to-[#EC4899]/25 rounded-full blur-3xl animate-blob"
          animate={{
            x: [0, -40, 0],
            y: [0, -50, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-[#06B6D4]/20 to-[#00E2B5]/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Grid pattern with spotlight effect */}
      <GridSpotlight className="absolute inset-0" spotlightSize={400} gridColor="rgba(0, 226, 181, 0.08)">
        <div className="w-full h-full" />
      </GridSpotlight>

      {/* Content with cursor spotlight */}
      <CursorSpotlight className="relative z-10 w-full" spotlightColor="rgba(0, 226, 181, 0.12)" spotlightSize={600}>
        <motion.div className="px-4 py-20" style={{ y: contentY, opacity }}>
          <div className="mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left content */}
              <StaggerContainer className="text-center lg:text-left space-y-6" staggerDelay={0.1} animation="blur">
                {/* Live badge with glow */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-[#00E2B5]/30 px-4 py-2 shadow-lg animate-glow-pulse"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E2B5] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E2B5]" />
                    </span>
                    <span className="text-sm font-medium">⚡ Doctors reviewing now</span>
                    <span className="text-xs text-muted-foreground">• ~1 hour turnaround</span>
                  </motion.div>
                </div>

                {/* Main headline with text reveal */}
                <div>
                  <h1
                    className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <TextRevealLine delay={0.2} duration={0.6}>
                      <span className="text-foreground">See a doctor</span>
                    </TextRevealLine>
                    <br className="hidden sm:block" />
                    <TextRevealLine delay={0.4} duration={0.6}>
                      <SparklesText
                        text="from your couch"
                        className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-r from-[#00E2B5] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent animate-gradient-text"
                        colors={{ first: "#00E2B5", second: "#8B5CF6" }}
                        sparklesCount={8}
                      />
                    </TextRevealLine>
                  </h1>
                </div>

                {/* Subheadline */}
                <div>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0"
                  >
                    Med certs and scripts — usually done in about an hour. 
                    No appointments needed. A real doctor reviews everything.
                  </motion.p>
                </div>

                {/* CTA buttons with magnetic effect */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                  >
                    <MagneticButton strength={0.2}>
                      <Button size="lg" asChild className="rounded-full btn-premium px-8 text-base h-14 shadow-lg shadow-[#00E2B5]/25 relative overflow-hidden group">
                        <Link href="/start">
                          <span className="relative z-10 flex items-center">
                            Get started — takes 3 min
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                          </span>
                          {/* Shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                          />
                        </Link>
                      </Button>
                    </MagneticButton>
                    
                    <MagneticButton strength={0.15}>
                      <Button
                        size="lg"
                        variant="outline"
                        asChild
                        className="rounded-full px-8 text-base h-14 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-2 hover:border-[#00E2B5]/50 transition-all"
                      >
                        <Link href="/how-it-works" className="flex items-center gap-2">
                          <Play className="h-4 w-4 fill-current" />
                          Watch how it works
                        </Link>
                      </Button>
                    </MagneticButton>
                  </motion.div>
                </div>

                {/* Trust indicators */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="flex flex-wrap items-center justify-center lg:justify-start gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {floatingAvatars.map((avatar, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                          >
                            <Image
                              src={avatar.src}
                              alt="Patient"
                              width={32}
                              height={32}
                              className="rounded-full border-2 border-white shadow-sm"
                            />
                          </motion.div>
                        ))}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1 + i * 0.05 }}
                            >
                              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                            </motion.div>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">4.9/5 · 2,000+ happy patients</span>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-border hidden sm:block" />

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-[#00E2B5]" />
                        Real doctors, not AI
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-[#00E2B5]" />
                        Done in ~1 hour
                      </span>
                    </div>
                  </motion.div>
                </div>
              </StaggerContainer>

              {/* Right side - Hero image composition with 3D tilt */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative hidden lg:block"
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: "preserve-3d",
                }}
              >
                <Tilt3D maxTilt={8} perspective={1200} scale={1.02} glare>
                  <div className="relative w-full aspect-square max-w-lg mx-auto">
                    {/* Main doctor image with glass effect */}
                    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl glass-premium">
                      <Image
                        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop"
                        alt="Friendly doctor ready to help"
                        fill
                        className="object-cover"
                        priority
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      
                      {/* Floating stats card with animation */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <motion.div
                              className="w-12 h-12 rounded-full bg-[#00E2B5]/10 flex items-center justify-center"
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Sparkles className="h-6 w-6 text-[#00E2B5]" />
                            </motion.div>
                            <div>
                              <p className="font-semibold text-foreground">Request approved</p>
                              <p className="text-sm text-muted-foreground">Your prescription is ready</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">Just now</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Floating elements */}
                    <FloatingElement
                      amplitude={12}
                      frequency={5}
                      delay={0}
                      className="absolute -top-4 -right-4"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-800 rotate-6">
                        <Image
                          src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face"
                          alt="Doctor"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </FloatingElement>

                    <FloatingElement
                      amplitude={10}
                      frequency={6}
                      delay={1}
                      className="absolute -bottom-4 -left-4"
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-800 -rotate-6">
                        <Image
                          src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face"
                          alt="Doctor"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </FloatingElement>

                    {/* Notification pill with bounce */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 1.1 }}
                      className="absolute top-1/4 -left-8"
                    >
                      <FloatingElement amplitude={8} frequency={4} direction="both">
                        <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 border border-gray-100 dark:border-gray-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                          </span>
                          <span className="text-sm font-medium">Dr. Sarah is online</span>
                        </div>
                      </FloatingElement>
                    </motion.div>

                    {/* Stats badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.3 }}
                      className="absolute top-1/3 -right-12"
                    >
                      <FloatingElement amplitude={6} frequency={7} delay={2}>
                        <div className="bg-gradient-to-br from-[#00E2B5] to-[#06B6D4] rounded-2xl px-4 py-3 shadow-lg text-white">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span className="text-sm font-semibold">45 min avg</span>
                          </div>
                        </div>
                      </FloatingElement>
                    </motion.div>

                    {/* Decorative orbit elements */}
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div
                        className="absolute top-0 left-1/2 w-3 h-3 bg-[#00E2B5] rounded-full shadow-lg shadow-[#00E2B5]/50"
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 15,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{
                          transformOrigin: "0 250px",
                        }}
                      />
                      <motion.div
                        className="absolute top-0 left-1/2 w-2 h-2 bg-[#8B5CF6] rounded-full shadow-lg shadow-[#8B5CF6]/50"
                        animate={{
                          rotate: -360,
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{
                          transformOrigin: "0 200px",
                        }}
                      />
                    </div>
                  </div>
                </Tilt3D>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </CursorSpotlight>

      {/* Bottom wave with parallax */}
      <ParallaxFloat speed={0.2} direction="down">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path
              d="M0 120L60 110C120 100 240 80 360 75C480 70 600 80 720 85C840 90 960 90 1080 85C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="fill-background"
            />
          </svg>
        </div>
      </ParallaxFloat>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs font-medium">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
