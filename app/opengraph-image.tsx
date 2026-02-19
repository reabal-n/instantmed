import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'InstantMed - Online Doctor Australia'
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
          background: 'linear-gradient(135deg, #FAFBFC 0%, #EFF6FF 50%, #F0FDF4 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)',
            }}
          >
            <span style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>I</span>
          </div>
          <span style={{ fontSize: '56px', fontWeight: 'bold', color: '#1E293B' }}>
            InstantMed
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            fontWeight: '600',
            color: '#1E293B',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          Medical Certificates & Prescriptions
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '24px',
            color: '#64748B',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Reviewed by AHPRA-registered Australian doctors in under an hour
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginTop: '48px',
          }}
        >
          {['AHPRA Registered', '4.9★ Rating', 'Under 30 min'].map((badge) => (
            <div
              key={badge}
              style={{
                background: 'white',
                padding: '12px 24px',
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

        {/* Price badges */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          <div style={{ fontSize: '20px', color: '#64748B' }}>
            Med Certs from <span style={{ fontWeight: 'bold', color: '#1E293B' }}>$19.95</span>
          </div>
          <div style={{ fontSize: '20px', color: '#64748B' }}>•</div>
          <div style={{ fontSize: '20px', color: '#64748B' }}>
            Scripts from <span style={{ fontWeight: 'bold', color: '#1E293B' }}>$29.95</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
