import type * as React from "react"

interface BaseLayoutProps {
  previewText: string
  children: React.ReactNode
  appUrl?: string
}

const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

export function BaseLayout({ previewText, children, appUrl = DEFAULT_APP_URL }: BaseLayoutProps) {
  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element -- Email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light" />
        <title>{previewText}</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1A1A1A;
            background-color: #F8F9FA;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            padding: 40px 16px;
          }
          .card {
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #E5E7EB;
            overflow: hidden;
          }
          .card-header {
            padding: 28px 32px 20px 32px;
          }
          .card-divider {
            border: none;
            border-top: 1px solid #F3F4F6;
            margin: 0 32px;
          }
          .card-body {
            padding: 24px 32px 32px 32px;
          }
          .logo {
            font-size: 18px;
            font-weight: 700;
            color: #1A1A1A;
            text-decoration: none;
            letter-spacing: -0.3px;
          }
          h1 {
            font-size: 20px;
            font-weight: 600;
            color: #1A1A1A;
            margin: 0 0 16px 0;
            letter-spacing: -0.2px;
            line-height: 1.35;
          }
          p {
            margin: 0 0 16px 0;
            color: #4B5563;
            font-size: 15px;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            background: #1A1A1A;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
          }
          .button-secondary {
            background: #F3F4F6;
            color: #1A1A1A !important;
            border: 1px solid #E5E7EB;
          }
          .info-box {
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .info-box p {
            color: #1E40AF;
          }
          .warning-box {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .warning-box p {
            color: #92400E;
          }
          .footer {
            text-align: center;
            padding: 20px 32px;
            border-top: 1px solid #F3F4F6;
            background: #FAFAFA;
          }
          .footer p {
            font-size: 12px;
            color: #9CA3AF;
            margin: 0 0 8px 0;
          }
          .footer a {
            color: #9CA3AF;
            text-decoration: underline;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <a href={appUrl} className="logo">
                InstantMed
              </a>
            </div>
            <hr className="card-divider" />
            <div className="card-body">
              {children}
            </div>
            <div className="footer">
              <p>
                InstantMed Pty Ltd | ABN 64 694 559 334 | Australia
              </p>
              <p>
                <a href={`${appUrl}/privacy`}>Privacy</a> ·{" "}
                <a href={`${appUrl}/terms`}>Terms</a> ·{" "}
                <a href={`${appUrl}/contact`}>Contact</a> ·{" "}
                <a href={`${appUrl}/unsubscribe`}>Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
