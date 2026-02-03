import type * as React from "react"
import Head from "next/head"

interface BaseLayoutProps {
  previewText: string
  children: React.ReactNode
  appUrl?: string
}

const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

export function BaseLayout({ previewText, children, appUrl = DEFAULT_APP_URL }: BaseLayoutProps) {
  return (
    <html>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>{previewText}</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .card {
            background: #ffffff;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
            text-decoration: none;
            margin-bottom: 24px;
            display: block;
          }
          .logo span {
            color: #2563eb;
          }
          h1 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 16px 0;
          }
          p {
            margin: 0 0 16px 0;
            color: #4a4a4a;
          }
          .button {
            display: inline-block;
            background: #1a1a1a;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin: 8px 0;
          }
          .button-secondary {
            background: #f5f5f5;
            color: #1a1a1a !important;
          }
          .info-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .warning-box {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .footer {
            text-align: center;
            padding-top: 24px;
            margin-top: 24px;
            border-top: 1px solid #e5e5e5;
            font-size: 13px;
            color: #737373;
          }
          .footer a {
            color: #737373;
          }
        `}</style>
      </Head>
      <body>
        <div className="container">
          <div className="card">
            <a href={appUrl} className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${appUrl}/branding/wordmark.svg`}
                alt="InstantMed"
                style={{ height: "32px", width: "auto" }}
              />
            </a>
            {children}
            <div className="footer">
              <p>
                InstantMed Pty Ltd | Australian Telehealth
                <br />
                ABN 64 694 559 334 · Sydney, Australia
              </p>
              <p style={{ marginTop: "8px" }}>
                <a href={`${appUrl}/privacy`}>Privacy</a> ·{" "}
                <a href={`${appUrl}/terms`}>Terms</a> ·{" "}
                <a href={`${appUrl}/contact`}>Contact</a> ·{" "}
                <a href={`${appUrl}/unsubscribe`}>Unsubscribe</a>
              </p>
              <p style={{ fontSize: "11px", marginTop: "8px", color: "#9ca3af" }}>
                This email was sent by InstantMed. If you have questions,
                <br />
                reply to this email or visit our help centre.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
