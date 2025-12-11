'use client'

import { AlertTriangle, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmergencyAlertProps {
  onDismiss: () => void
}

export function EmergencyAlert({ onDismiss }: EmergencyAlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-destructive animate-emergency">
      <div className="max-w-lg mx-4 text-center text-white">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-14 h-14 text-white" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Call 000 Immediately
        </h1>
        
        <p className="text-xl mb-8 text-white/90">
          The symptoms you&apos;ve described may indicate a medical emergency. 
          This service is not suitable for emergencies.
        </p>
        
        <div className="space-y-4">
          <a href="tel:000">
            <Button 
              size="lg" 
              variant="secondary" 
              className="touch-target w-full text-lg font-semibold"
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
        </div>
        
        <div className="mt-12 p-4 bg-white/10 rounded-lg text-left">
          <p className="text-sm text-white/80">
            <strong>Emergency symptoms include:</strong>
            <br />• Chest pain or pressure
            <br />• Difficulty breathing
            <br />• Loss of consciousness
            <br />• Severe bleeding
            <br />• Stroke symptoms (face drooping, arm weakness, speech difficulty)
          </p>
        </div>
      </div>
    </div>
  )
}

