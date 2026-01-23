import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface GuestCompleteAccountEmailProps {
  patientName: string
  requestType: string
  intakeId: string
  completeAccountUrl: string
}

export function GuestCompleteAccountEmail({ 
  patientName, 
  requestType, 
  intakeId,
  completeAccountUrl,
}: GuestCompleteAccountEmailProps) {
  return (
    <BaseLayout previewText={`Create your InstantMed account to track your ${requestType}`} appUrl={APP_URL}>
      <h1>Your request is being reviewed</h1>
      <p>Hi {patientName},</p>
      <p>
        Your {requestType} request has been received and is now in the review queue. 
        A doctor will review it shortly.
      </p>

      <div className="info-box">
        <p style={{ margin: 0 }}>
          <strong>Reference:</strong> {intakeId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <h2>Create your account</h2>
      <p>
        Set up your InstantMed account to:
      </p>
      <ul>
        <li>Track your request status in real-time</li>
        <li>Download your certificate instantly when ready</li>
        <li>Access your medical history</li>
        <li>Request future certificates faster</li>
      </ul>

      <p>
        <a href={completeAccountUrl} className="button">
          Create Your Account
        </a>
      </p>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        Don&apos;t worry — your certificate will also be emailed to you when it&apos;s ready, 
        even if you don&apos;t create an account.
      </p>
    </BaseLayout>
  )
}
