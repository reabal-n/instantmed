/**
 * Framer Motion variants for panel animations
 * 
 * Design principles:
 * - Smooth, slow enough to notice, fast enough not to annoy
 * - No snapping, bouncing, or dramatic easing
 * - Everything feels gently floating
 */

export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
}

export const sessionPanelVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.4, 
      ease: [0.16, 1, 0.3, 1] // Custom ease-out curve - smooth and confident
    }
  },
  exit: { 
    opacity: 0, 
    y: 10,
    scale: 0.99,
    transition: { duration: 0.25, ease: 'easeIn' }
  }
}

export const drawerVariants = (side: 'left' | 'right') => ({
  hidden: { 
    x: side === 'right' ? '100%' : '-100%',
    opacity: 0
  },
  visible: { 
    x: 0,
    opacity: 1,
    transition: { 
      duration: 0.35, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    x: side === 'right' ? '100%' : '-100%',
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' }
  }
})

export const sheetVariants = (side: 'left' | 'right') => ({
  hidden: { 
    x: side === 'right' ? '100%' : '-100%'
  },
  visible: { 
    x: 0,
    transition: { 
      duration: 0.4, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    x: side === 'right' ? '100%' : '-100%',
    transition: { duration: 0.3, ease: 'easeIn' }
  }
})

export const floatingBarVariants = {
  hidden: { 
    y: 100,
    opacity: 0
  },
  visible: { 
    y: 0,
    opacity: 1,
    transition: { 
      duration: 0.35, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    y: 100,
    opacity: 0,
    transition: { duration: 0.25 }
  }
}
