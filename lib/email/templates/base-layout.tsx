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
            color: #44403C;
            background-color: #FAFAF9;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
          }
          .container {
            max-width: 520px;
            margin: 0 auto;
            padding: 48px 16px;
          }
          .card {
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #E7E5E4;
          }
          .card-header {
            padding: 32px 40px 0 40px;
          }
          .card-header a {
            text-decoration: none;
            font-size: 17px;
            font-weight: 700;
            color: #0C1220;
            letter-spacing: -0.4px;
          }
          .card-header .accent {
            color: #0D9488;
          }
          .card-divider {
            padding: 20px 40px 0 40px;
          }
          .card-divider div {
            border-top: 1px solid #F5F5F4;
          }
          .card-body {
            padding: 28px 40px 36px 40px;
          }
          h1 {
            font-size: 22px;
            font-weight: 600;
            color: #1C1917;
            margin: 0 0 16px 0;
            letter-spacing: -0.4px;
            line-height: 1.35;
          }
          h2 {
            font-size: 17px;
            font-weight: 600;
            color: #1C1917;
            margin: 0 0 12px 0;
            letter-spacing: -0.2px;
            line-height: 1.35;
          }
          h3 {
            font-size: 14px;
            font-weight: 600;
            color: #1C1917;
            margin: 0 0 10px 0;
            line-height: 1.35;
          }
          p {
            margin: 0 0 16px 0;
            color: #44403C;
            font-size: 15px;
            line-height: 1.7;
          }
          .button {
            display: inline-block;
            background: #0C1220;
            color: #ffffff !important;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
          }
          .button-secondary {
            background: transparent;
            color: #1C1917 !important;
            border: 1px solid #E7E5E4;
          }
          .info-box {
            background: #F0F9FF;
            border: 1px solid #BAE6FD;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 16px 0;
          }
          .info-box p {
            color: #0369A1;
          }
          .success-box {
            background: #F0FDFA;
            border: 1px solid #99F6E4;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 16px 0;
          }
          .success-box p {
            color: #0F766E;
          }
          .warning-box {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 8px;
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
            border-bottom: 1px solid #F5F5F4;
            font-size: 14px;
          }
          .detail-label {
            color: #78716C;
          }
          .detail-value {
            color: #1C1917;
            font-weight: 600;
          }
          ul {
            margin: 0;
            padding-left: 18px;
            color: #44403C;
            font-size: 14px;
            line-height: 1.8;
          }
          li {
            margin-bottom: 4px;
            padding-left: 2px;
          }
          .footer {
            text-align: center;
            padding: 24px 40px;
            border-top: 1px solid #F5F5F4;
            background: #FAFAF9;
          }
          .footer p {
            font-size: 12px;
            color: #A8A29E;
            margin: 0 0 8px 0;
          }
          .footer a {
            color: #A8A29E;
            text-decoration: none;
          }
          .footer .dot {
            margin: 0 6px;
            color: #E7E5E4;
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
                Instant<span className="accent">Med</span>
              </a>
            </div>
            <div className="card-divider"><div /></div>
            <div className="card-body">
              {children}
            </div>
            <div className="footer">
              <p>
                <a href={`${appUrl}/privacy`}>Privacy</a>
                <span className="dot">·</span>
                <a href={`${appUrl}/terms`}>Terms</a>
                <span className="dot">·</span>
                <a href={`${appUrl}/contact`}>Contact</a>
                <span className="dot">·</span>
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
