import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface PaymentRetryEmailProps {
  patientName: string
  requestType: string
  amount: string
  paymentUrl: string
}

export function PaymentRetryEmail({ patientName, requestType, amount, paymentUrl }: PaymentRetryEmailProps) {
  return (
    <BaseLayout previewText={`Complete your payment for ${requestType}`} appUrl={APP_URL}>
      <h1>Complete your payment</h1>
      <p>Hi {patientName},</p>
      <p>
        We noticed your previous payment for your {requestType} request didn&apos;t go through. 
        No worries -- you can try again using the link below.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontSize: "14px" }}>
          <strong>Amount due:</strong> {amount}
        </p>
      </div>

      <p>
        <a href={paymentUrl} className="button">
          Complete Payment
        </a>
      </p>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        If you&apos;re having trouble with your payment, please ensure your card details are correct 
        and that you have sufficient funds. You can also try a different payment method.
      </p>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        Need help? Just reply to this email and we&apos;ll assist you.
      </p>
    </BaseLayout>
  )
}
