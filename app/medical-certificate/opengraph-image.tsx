import { ImageResponse } from 'next/og'

import { PRICING_DISPLAY } from '@/lib/constants'
import { SOCIAL_PROOF } from '@/lib/social-proof'

export const runtime = 'edge'

export const alt = 'Online Medical Certificate - InstantMed'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F8F7F4 0%, #EFF6FF 50%, #F7F3EC 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            }}
          >
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>I</span>
          </div>
          <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#1E293B' }}>
            InstantMed
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#1E293B',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Online Medical Certificate
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '28px',
            color: '#64748B',
            textAlign: 'center',
            maxWidth: '800px',
            marginBottom: '40px',
          }}
        >
          Valid for work, uni, or carer&apos;s leave - reviewed by an Australian GP
        </div>

        {/* Key points */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '36px',
          }}
        >
          {['AHPRA-Registered GP', 'Doctor Reviewed', 'Employer policies vary'].map((badge) => (
            <div
              key={badge}
              style={{
                background: 'white',
                padding: '12px 28px',
                borderRadius: '100px',
                fontSize: '18px',
                fontWeight: '500',
                color: '#3B82F6',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              {badge}
            </div>
          ))}
        </div>

        {/* Price */}
        <div
          style={{
            fontSize: '24px',
            color: '#64748B',
          }}
        >
          From <span style={{ fontWeight: 'bold', color: '#1E293B', fontSize: '28px' }}>{PRICING_DISPLAY.MED_CERT}</span>
          <span style={{ marginLeft: '12px', fontSize: '18px' }}>· Typically {SOCIAL_PROOF.gpPriceStandard} at a GP</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
