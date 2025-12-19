import * as React from 'react'
import {
  EmailLayout,
  Heading,
  Text,
  Button,
  Reference,
  InfoBox,
  Divider,
} from './components'

interface RequestSubmittedEmailProps {
  patientName: string
  referenceNumber: string
  serviceName: string
  isPriority: boolean
  estimatedTime: string
  dashboardUrl: string
}

export function RequestSubmittedEmail({
  patientName,
  referenceNumber,
  serviceName,
  isPriority,
  estimatedTime,
  dashboardUrl,
}: RequestSubmittedEmailProps) {
  return (
    <EmailLayout previewText={`Your ${serviceName} request has been submitted - ${referenceNumber}`}>
      <Heading>Request Submitted Successfully</Heading>
      
      <Text>Hi {patientName},</Text>
      
      <Text>
        Thank you for choosing InstantMed. Your {serviceName.toLowerCase()} request has been 
        received and is now in our queue for review by one of our Australian-registered doctors.
      </Text>

      <Reference number={referenceNumber} />

      {isPriority && (
        <InfoBox variant="success">
          <strong>Priority Processing:</strong> Your request has been marked as priority 
          and will be reviewed within {estimatedTime}.
        </InfoBox>
      )}

      {!isPriority && (
        <Text muted>
          Estimated review time: <strong>{estimatedTime}</strong>
        </Text>
      )}

      <Divider />

      <Text>
        <strong>What happens next?</strong>
      </Text>
      
      <Text>
        1. A doctor will review your request and medical history<br />
        2. If approved, your document will be emailed to you<br />
        3. If we need more information, we'll reach out via email
      </Text>

      <Button href={dashboardUrl}>Track Your Request</Button>

      <Divider />

      <Text muted>
        If you have any questions, reply to this email or contact us at{' '}
        <a href="mailto:support@instantmed.com.au" style={{ color: '#0d9488' }}>
          support@instantmed.com.au
        </a>
      </Text>
    </EmailLayout>
  )
}

export default RequestSubmittedEmail
