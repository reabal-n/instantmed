import type * as React from "react"

interface BaseLayoutProps {
  previewText: string
  children: React.ReactNode
  appUrl?: string
}

const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

export function BaseLayout({ previewText, children, appUrl = DEFAULT_APP_URL }: BaseLayoutProps) {
  const wordmarkUrl = `${appUrl}/branding/wordmark.png`

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
            color: #0F172A;
            background-color: #F1F5F9;
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
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
          }
          .card-header {
            background-color: #0F172A;
            padding: 24px 32px;
            text-align: center;
          }
          .card-header img {
            display: block;
            margin: 0 auto;
            max-width: 140px;
            height: auto;
            filter: brightness(0) invert(1);
          }
          .card-body {
            padding: 32px 32px 36px 32px;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0F172A;
            margin: 0 0 16px 0;
            letter-spacing: -0.3px;
            line-height: 1.3;
          }
          p {
            margin: 0 0 16px 0;
            color: #475569;
            font-size: 15px;
            line-height: 1.7;
          }
          .button {
            display: inline-block;
            background: #3B82F6;
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
          }
          .button-secondary {
            background: #F1F5F9;
            color: #0F172A !important;
            border: 1px solid #E2E8F0;
          }
          .info-box {
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 16px 0;
          }
          .info-box p {
            color: #1E40AF;
          }
          .success-box {
            background: #ECFDF5;
            border: 1px solid #A7F3D0;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 16px 0;
          }
          .success-box p {
            color: #059669;
          }
          .warning-box {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 16px 0;
          }
          .warning-box p {
            color: #92400E;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #F1F5F9;
            font-size: 14px;
          }
          .detail-label {
            color: #94A3B8;
          }
          .detail-value {
            color: #0F172A;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            padding: 24px 32px;
            border-top: 1px solid #E2E8F0;
            background: #F8FAFC;
          }
          .footer p {
            font-size: 12px;
            color: #94A3B8;
            margin: 0 0 8px 0;
          }
          .footer a {
            color: #94A3B8;
            text-decoration: none;
          }
          .footer .divider {
            margin: 0 8px;
            color: #E2E8F0;
          }
          .footer .legal {
            font-size: 11px;
            letter-spacing: 0.02em;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <a href={appUrl}>
                <img
                  src={wordmarkUrl}
                  alt="InstantMed"
                  width="140"
                />
              </a>
            </div>
            <div className="card-body">
              {children}
            </div>
            <div className="footer">
              <p>
                <a href={`${appUrl}/privacy`}>Privacy</a>
                <span className="divider">|</span>
                <a href={`${appUrl}/terms`}>Terms</a>
                <span className="divider">|</span>
                <a href={`${appUrl}/contact`}>Contact</a>
                <span className="divider">|</span>
                <a href={`${appUrl}/unsubscribe`}>Unsubscribe</a>
              </p>
              <p className="legal">
                InstantMed Pty Ltd · ABN 64 694 559 334 · Australia
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
