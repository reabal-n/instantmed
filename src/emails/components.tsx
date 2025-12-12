import * as React from 'react'

// ============================================
// SHARED EMAIL COMPONENTS
// ============================================

interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        {previewText && (
          <meta name="x-apple-disable-message-reformatting" />
        )}
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f6f9fc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Hidden preview text */}
        {previewText && (
          <div
            style={{
              display: 'none',
              maxHeight: 0,
              overflow: 'hidden',
            }}
          >
            {previewText}
          </div>
        )}

        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: '100%',
            backgroundColor: '#f6f9fc',
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '40px 20px' }}>
                <table
                  role="presentation"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td
                        style={{
                          padding: '32px 40px',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <img
                          src="https://instantmed.com.au/logo.png"
                          alt="InstantMed"
                          style={{
                            height: '32px',
                            width: 'auto',
                          }}
                        />
                      </td>
                    </tr>

                    {/* Content */}
                    <tr>
                      <td style={{ padding: '40px' }}>
                        {children}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: '24px 40px',
                          borderTop: '1px solid #eee',
                          backgroundColor: '#fafafa',
                          borderBottomLeftRadius: '8px',
                          borderBottomRightRadius: '8px',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#666',
                            lineHeight: '20px',
                          }}
                        >
                          This email was sent by InstantMed Telehealth Services.<br />
                          ABN: XX XXX XXX XXX | AHPRA Compliant<br />
                          <a
                            href="https://instantmed.com.au/privacy"
                            style={{ color: '#666', textDecoration: 'underline' }}
                          >
                            Privacy Policy
                          </a>
                          {' | '}
                          <a
                            href="https://instantmed.com.au/unsubscribe"
                            style={{ color: '#666', textDecoration: 'underline' }}
                          >
                            Unsubscribe
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

// Heading component
interface HeadingProps {
  children: React.ReactNode
}

export function Heading({ children }: HeadingProps) {
  return (
    <h1
      style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: 600,
        color: '#1a1a1a',
        lineHeight: '32px',
      }}
    >
      {children}
    </h1>
  )
}

// Paragraph component
interface TextProps {
  children: React.ReactNode
  muted?: boolean
}

export function Text({ children, muted }: TextProps) {
  return (
    <p
      style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        color: muted ? '#666' : '#333',
        lineHeight: '24px',
      }}
    >
      {children}
    </p>
  )
}

// Button component
interface ButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export function Button({ href, children, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary'
  
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      style={{ margin: '24px 0' }}
    >
      <tbody>
        <tr>
          <td>
            <a
              href={href}
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                backgroundColor: isPrimary ? '#0d9488' : '#f3f4f6',
                color: isPrimary ? '#ffffff' : '#374151',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                borderRadius: '8px',
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// Info box component
interface InfoBoxProps {
  children: React.ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
}

export function InfoBox({ children, variant = 'info' }: InfoBoxProps) {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  }
  
  const color = colors[variant]
  
  return (
    <div
      style={{
        margin: '24px 0',
        padding: '16px 20px',
        backgroundColor: color.bg,
        borderLeft: `4px solid ${color.border}`,
        borderRadius: '4px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          color: color.text,
          lineHeight: '22px',
        }}
      >
        {children}
      </p>
    </div>
  )
}

// Divider component
export function Divider() {
  return (
    <hr
      style={{
        margin: '24px 0',
        border: 'none',
        borderTop: '1px solid #eee',
      }}
    />
  )
}

// Reference number component
interface ReferenceProps {
  number: string
}

export function Reference({ number }: ReferenceProps) {
  return (
    <div
      style={{
        margin: '24px 0',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        textAlign: 'center' as const,
      }}
    >
      <p
        style={{
          margin: '0 0 4px 0',
          fontSize: '12px',
          color: '#666',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
        }}
      >
        Reference Number
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 600,
          color: '#1a1a1a',
          fontFamily: 'monospace',
        }}
      >
        {number}
      </p>
    </div>
  )
}
