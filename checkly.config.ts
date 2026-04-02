import { defineConfig } from 'checkly'
import { EmailAlertChannel } from 'checkly/constructs'

const alertChannel = new EmailAlertChannel('email-alert', {
  address: 'support@instantmed.com.au',
  sendRecovery: true,
  sendFailure: true,
  sendDegraded: false,
})

export default defineConfig({
  projectName: 'InstantMed',
  logicalId: 'instantmed-production',
  repoUrl: 'https://github.com/instantmed/instantmed',
  checks: {
    activated: true,
    muted: false,
    runtimeId: '2024.02',
    // Run every minute from Sydney + Singapore (closest to AU users)
    frequency: 1,
    locations: ['ap-southeast-2', 'ap-southeast-1'],
    tags: ['production'],
    alertChannels: [alertChannel],
    checkMatch: '**/__checks__/**/*.check.ts',
  },
  cli: {
    runLocation: 'ap-southeast-2',
    reporters: ['list'],
  },
})
