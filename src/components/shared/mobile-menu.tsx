'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Stethoscope, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileMenuProps {
  links: { href: string; label: string }[]
}

export function MobileMenu({ links }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuVariants = {
    closed: {
      opacity: 0,
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }
    },
    open: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }
    }
  }

  const linkVariants = {
    closed: { opacity: 0, x: 20 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }
    })
  }

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-semibold tracking-tight">InstantMed</span>
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1">
                {links.map((link, i) => (
                  <motion.div
                    key={link.href}
                    custom={i}
                    variants={linkVariants}
                    initial="closed"
                    animate="open"
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-teal-600 transition-colors">
                        {link.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* CTA */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link href="/start" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
                
                <motion.p
                  className="text-center text-xs text-slate-500 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  AHPRA Registered Doctors • Instant Delivery
                </motion.p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
