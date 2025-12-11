'use client'

import { motion } from 'framer-motion'
import { Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmergencyAlertProps {
  onDismiss: () => void
}

export function EmergencyAlert({ onDismiss }: EmergencyAlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-600 to-red-700">
      <div className="max-w-lg mx-4 text-center text-white">
        {/* Animated emoji with bounce */}
        <motion.div 
          className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 border border-white/30"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 260, 
            damping: 15,
            delay: 0.1 
          }}
        >
          <motion.span 
            className="text-6xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 10,
              delay: 0.3 
            }}
          >
            🛡️
          </motion.span>
        </motion.div>
        
        <motion.h1 
          className="text-4xl md:text-5xl font-bold mb-6 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Call 000 Immediately
        </motion.h1>
        
        <motion.p 
          className="text-xl mb-8 text-white/90"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          The symptoms you&apos;ve described may indicate a medical emergency. 
          This service is not suitable for emergencies.
        </motion.p>
        
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <a href="tel:000">
            <Button 
              size="lg" 
              className="touch-target w-full text-lg font-semibold bg-white text-red-700 hover:bg-white/90 shadow-lg"
            >
              <Phone className="mr-2 h-6 w-6" />
              Call 000 Now
            </Button>
          </a>
          
          <p className="text-sm text-white/70">
            If you believe this is not an emergency, you may dismiss this alert.
          </p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="mr-2 h-4 w-4" />
            I understand, this is not an emergency
          </Button>
        </motion.div>
        
        <motion.div 
          className="mt-12 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-left border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-white/90">
            <strong className="text-white">Emergency symptoms include:</strong>
            <br />• Chest pain or pressure
            <br />• Difficulty breathing
            <br />• Loss of consciousness
            <br />• Severe bleeding
            <br />• Stroke symptoms (face drooping, arm weakness, speech difficulty)
          </p>
        </motion.div>
      </div>
    </div>
  )
}

