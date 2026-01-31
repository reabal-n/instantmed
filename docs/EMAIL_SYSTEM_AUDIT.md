# Email System Audit & Consolidation

## Overview
This document outlines the current email system architecture, identifies redundancies, and provides a consolidated admin interface for all email operations.

## Current Email System Components

### 1. Core Email Infrastructure
- **`lib/email/send-email.ts`** - Central email sending service with Resend integration
- **`lib/email/template-sender.ts`** - Database template sender with merge tag support
- **`lib/email/admin-preview.ts`** - Admin preview system (NEW - server-only HTML templates)
- **`lib/data/email-templates.ts`** - Database CRUD operations for email templates

### 2. Template Systems
- **React Email Templates** (`components/email/templates/`) - Production email components
- **Database Templates** (`email_templates` table) - Editable templates for admin
- **Admin Preview Templates** - Server-only HTML templates for admin preview

### 3. Admin Interfaces
- **`/admin/email-hub`** - NEW: Central email management hub
- **`/admin/emails`** - Template editor and management
- **`/admin/emails/preview`** - Template preview and testing
- **`/admin/emails/analytics`** - Email performance analytics
- **`/admin/email-queue`** - Email queue monitoring
- **`/admin/ops/email-outbox`** - Email history and logs

### 4. Legacy/Redundant Components (TO BE REMOVED)
- **`app/actions/send-test-email.ts`** - Legacy test email action
- **`lib/email/render-template.ts`** - Unused React renderer
- **`app/admin/emails/emails-client.tsx`** - Legacy template client (replaced by editor)

## Email Hub - Centralized Admin Interface

### Features
1. **Overview Dashboard**
   - Email sending statistics
   - Delivery rates and metrics
   - Queue status monitoring
   - Recent activity feed

2. **Quick Actions**
   - Template management
   - Preview & testing
   - Queue monitoring
   - Analytics access
   - Email outbox
   - Settings configuration

3. **Unified Navigation**
   - Single entry point for all email operations
   - Clear separation of concerns
   - Easy access to specialized tools

## Template Management Flow

### 1. Production Templates (React Components)
- Location: `components/email/templates/`
- Used for actual email sending
- Types: `med_cert_patient`, `med_cert_employer`, `welcome`, `script_sent`, `request_declined`
- Maintained by developers

### 2. Admin Preview Templates (HTML)
- Location: `lib/email/admin-preview.ts`
- Used for admin preview and testing
- Server-only, no react-dom/server dependency
- Sample data and merge tag replacement

### 3. Database Templates (Editable)
- Location: `email_templates` table
- Used for custom email content
- Managed through admin interface
- Supports versioning and activation

## Email Sending Architecture

### 1. Template Sender (`lib/email/template-sender.ts`)
```typescript
// Main function for sending database templates
export async function sendTemplateEmail(params: SendTemplateEmailParams)

// Convenience functions for common emails
export async function sendCertificateReadyEmail(params: {...})
export async function sendPrescriptionSentEmail(params: {...})
export async function sendDeclinedEmail(params: {...})
```

### 2. Direct Email Sender (`lib/email/send-email.ts`)
```typescript
// Used for React email templates
export async function sendEmail(params: SendEmailParams)
```

### 3. Admin Preview System (`lib/email/admin-preview.ts`)
```typescript
// Server-only preview rendering
export async function renderPreviewTemplate(slug: string, data: Record<string, string>)
```

## Redundancies Identified

### 1. Multiple Test Email Actions
- **OLD**: `sendTestEmailAction` in `app/actions/send-test-email.ts`
- **NEW**: `sendAdminTestEmailAction` in `app/actions/admin-email-preview.ts`
- **ACTION**: Remove old action, use new admin preview system

### 2. Multiple Template Renderers
- **OLD**: `renderEmailToHtml` in `lib/email/render-template.ts` (react-dom/server)
- **NEW**: `renderPreviewTemplate` in `lib/email/admin-preview.ts` (server-only HTML)
- **ACTION**: Remove old renderer to avoid build issues

### 3. Multiple Template Clients
- **OLD**: `EmailTemplatesClient` in `app/admin/emails/emails-client.tsx`
- **NEW**: `EmailTemplateEditorClient` in `app/admin/emails/edit/email-template-editor-client.tsx`
- **ACTION**: Remove old client, use new editor

## Admin Access Points

### Primary Entry Point: Email Hub
**URL**: `/admin/email-hub`
- Central dashboard with overview
- Quick access to all email operations
- Recent activity monitoring
- Statistics and metrics

### Specialized Tools
1. **Template Management**: `/admin/emails`
   - Edit database templates
   - Toggle active/inactive
   - Version management

2. **Preview & Testing**: `/admin/emails/preview`
   - Live template preview
   - Test email sending
   - Mobile/desktop views

3. **Analytics**: `/admin/emails/analytics`
   - Email performance metrics
   - Delivery statistics
   - Engagement tracking

4. **Queue Monitoring**: `/admin/email-queue`
   - Email sending queue status
   - Failed email tracking
   - Retry management

5. **Email History**: `/admin/ops/email-outbox`
   - Complete email log
   - Search and filter
   - Export functionality

## Cleanup Actions Required

### Files to Remove
1. `app/actions/send-test-email.ts` - Legacy test email action
2. `lib/email/render-template.ts` - Unused React renderer
3. `app/admin/emails/emails-client.tsx` - Legacy template client

### Files to Update
1. Update imports to use new admin preview actions
2. Update navigation to point to Email Hub
3. Remove references to legacy components

### Database Considerations
- Ensure `email_templates` table is properly populated
- Verify all template slugs match between systems
- Check for orphaned template records

## Security & Permissions

### Admin-Only Access
All email management interfaces require:
- Admin role verification
- Authentication checks
- CSRF protection for actions

### Template Isolation
- Production templates (React) - Developer maintained
- Admin templates (Database) - Admin editable
- Preview templates (HTML) - Server-only, no external access

## Testing Requirements

### 1. Email Hub Functionality
- Dashboard loads correctly
- Quick actions navigate properly
- Statistics display accurately
- Recent activity updates

### 2. Template Management
- Templates can be edited
- Preview updates in real-time
- Test emails send successfully
- Activation toggle works

### 3. Cross-System Integration
- Database templates work with sender
- React templates render correctly
- Admin preview matches production

## Migration Checklist

- [ ] Remove legacy files
- [ ] Update all imports
- [ ] Test Email Hub functionality
- [ ] Verify template editing works
- [ ] Confirm test email sending
- [ ] Check analytics integration
- [ ] Validate queue monitoring
- [ ] Test admin permissions
- [ ] Update documentation

## Benefits of Consolidation

1. **Single Entry Point**: Email Hub provides centralized access
2. **Reduced Complexity**: Eliminates redundant systems
3. **Better UX**: Clear navigation and purpose-built tools
4. **Maintainability**: Easier to update and extend
5. **Performance**: No react-dom/server build issues
6. **Security**: Isolated admin preview system

## Future Enhancements

1. **Email Automation**: Workflow-based email sequences
2. **A/B Testing**: Template performance comparison
3. **Advanced Analytics**: Deeper email engagement metrics
4. **Template Library**: Reusable template components
5. **Bulk Operations**: Mass email sending capabilities
