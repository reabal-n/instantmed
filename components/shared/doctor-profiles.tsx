'use client'

import Image from 'next/image'
import { Shield, Star, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Doctor {
  id: string
  name: string
  title: string
  qualifications: string[]
  specialties: string[]
  yearsExperience: number
  consultationsCompleted: number
  rating: number
  imageUrl: string
  ahpraNumber: string
  bio: string
}

const doctors: Doctor[] = [
  {
    id: 'dr-chen',
    name: 'Dr. Sarah Chen',
    title: 'General Practitioner',
    qualifications: ['MBBS', 'FRACGP'],
    specialties: ['General Practice', 'Women\'s Health', 'Mental Health'],
    yearsExperience: 12,
    consultationsCompleted: 3500,
    rating: 4.9,
    imageUrl: '/asian-woman-professional-headshot-warm-smile.jpg',
    ahpraNumber: 'MED0001234567',
    bio: 'Dr. Chen brings over a decade of experience in general practice with a focus on accessible, patient-centered care.'
  },
  {
    id: 'dr-thompson',
    name: 'Dr. James Thompson',
    title: 'General Practitioner',
    qualifications: ['MBBS', 'FRACGP', 'Dip Child Health'],
    specialties: ['General Practice', 'Paediatrics', 'Sports Medicine'],
    yearsExperience: 15,
    consultationsCompleted: 4200,
    rating: 4.8,
    imageUrl: '/professional-headshot-placeholder-male.jpg',
    ahpraNumber: 'MED0001234568',
    bio: 'With 15 years in medicine, Dr. Thompson is passionate about making healthcare more accessible through telehealth.'
  },
  {
    id: 'dr-patel',
    name: 'Dr. Priya Patel',
    title: 'General Practitioner',
    qualifications: ['MBBS', 'FRACGP'],
    specialties: ['General Practice', 'Chronic Disease Management', 'Preventive Health'],
    yearsExperience: 8,
    consultationsCompleted: 2800,
    rating: 4.9,
    imageUrl: '/asian-australian-woman-professional-headshot-smili.jpg',
    ahpraNumber: 'MED0001234569',
    bio: 'Dr. Patel combines clinical expertise with a warm, approachable manner to ensure every patient feels heard.'
  },
]

interface DoctorProfilesProps {
  variant?: 'grid' | 'carousel' | 'featured'
  className?: string
  maxDoctors?: number
}

export function DoctorProfiles({ 
  variant = 'grid', 
  className,
  maxDoctors = 3
}: DoctorProfilesProps) {
  const displayDoctors = doctors.slice(0, maxDoctors)

  if (variant === 'featured') {
    const featuredDoctor = displayDoctors[0]
    return (
      <div className={cn("bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6", className)}>
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0">
            <Image 
              src={featuredDoctor.imageUrl} 
              alt={featuredDoctor.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{featuredDoctor.name}</h3>
            <p className="text-sm text-muted-foreground">{featuredDoctor.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium">{featuredDoctor.rating}</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {featuredDoctor.consultationsCompleted.toLocaleString()}+ consultations
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
              <Shield className="w-3.5 h-3.5" />
              <span>AHPRA Verified</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className={cn("py-16", className)}>
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AHPRA Registered</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Meet Our Doctors
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every request is reviewed by a real Australian doctor — registered with AHPRA and actively practicing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayDoctors.map((doctor) => (
            <div 
              key={doctor.id}
              className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 hover:border-primary/30 hover:shadow-lg transition-all"
            >
              {/* Photo and name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20">
                  <Image 
                    src={doctor.imageUrl} 
                    alt={doctor.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{doctor.name}</h3>
                  <p className="text-sm text-muted-foreground">{doctor.title}</p>
                </div>
              </div>

              {/* Qualifications */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {doctor.qualifications.map((qual) => (
                  <span 
                    key={qual}
                    className="text-xs px-2 py-1 bg-white/60 dark:bg-white/10 rounded-full text-muted-foreground"
                  >
                    {qual}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium">{doctor.rating}/5</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{doctor.yearsExperience} years</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {doctor.bio}
              </p>

              {/* AHPRA verification */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium">AHPRA Verified</span>
                <span className="text-xs text-muted-foreground">#{doctor.ahpraNumber}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Compact doctor card for inline use
 */
export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-white/5 rounded-xl">
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
        <Image 
          src={doctor.imageUrl} 
          alt={doctor.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{doctor.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{doctor.qualifications.join(', ')}</span>
          <span>·</span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{doctor.rating}</span>
          </div>
        </div>
      </div>
      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
    </div>
  )
}
