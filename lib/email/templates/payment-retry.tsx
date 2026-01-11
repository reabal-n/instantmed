import { BaseLayout } from "./base-layout"

interface PaymentRetryEmailProps {
  patientName: string
  requestType: string
  amount: string
  paymentUrl: string
}

export function PaymentRetryEmail({ patientName, requestType, amount, paymentUrl }: PaymentRetryEmailProps) {
  return (
    <BaseLayout previewText={`Complete your payment for ${requestType}`}>
      <h1>Complete your payment</h1>
      <p>Hi {patientName},</p>
      <p>
        We noticed your previous payment for your {requestType} request didn&apos;t go through. 
        No worries – you can try again using the link below.
      </p>

      <div className="info-box">
        <p style={{ margin: 0 }}>
          <strong>Amount due:</strong> {amount}
        </p>
      </div>

      <p>
        <a href={paymentUrl} className="button">
          Complete Payment
        </a>
      </p>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        If you&apos;re having trouble with your payment, please ensure your card details are correct 
        and that you have sufficient funds. You can also try a different payment method.
      </p>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        Need help? Just reply to this email and we&apos;ll assist you.
      </p>
    </BaseLayout>
  )
}

export function renderPaymentRetryEmailToHtml(props: PaymentRetryEmailProps): string {
  const { patientName, requestType, amount, paymentUrl } = props
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complete your payment for ${requestType}</title>
  <style>
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
    .info-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <a href="https://instantmed.com.au" class="logo">
        Instant<span>Med</span>
      </a>
      
      <h1>Complete your payment</h1>
      <p>Hi ${patientName},</p>
      <p>
        We noticed your previous payment for your ${requestType} request didn't go through. 
        No worries – you can try again using the link below.
      </p>

      <div class="info-box">
        <p style="margin: 0;">
          <strong>Amount due:</strong> ${amount}
        </p>
      </div>

      <p>
        <a href="${paymentUrl}" class="button">
          Complete Payment
        </a>
      </p>

      <p style="font-size: 14px; color: #737373;">
        If you're having trouble with your payment, please ensure your card details are correct 
        and that you have sufficient funds. You can also try a different payment method.
      </p>

      <p style="font-size: 14px; color: #737373;">
        Need help? Just reply to this email and we'll assist you.
      </p>

      <div class="footer">
        <p>
          InstantMed | Australian Telehealth
          <br />
          <a href="https://instantmed.com.au/privacy">Privacy</a> ·
          <a href="https://instantmed.com.au/terms">Terms</a>
        </p>
        <p style="font-size: 11px; margin-top: 8px;">
          This email was sent by InstantMed. If you have questions,
          <br />
          reply to this email or visit our help centre.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`
}
