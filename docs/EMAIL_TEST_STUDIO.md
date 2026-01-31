# Email Test Studio - Premium Email Design System

## Overview

The Email Test Studio is a comprehensive admin interface for designing, customizing, and testing premium email templates with extensive styling options. It provides real-time preview, multiple themes, and test email functionality.

## Features

### 🎨 **Premium Design Themes**

1. **Modern Theme**
   - Colors: Indigo/Purple gradient
   - Fonts: Inter (heading & body)
   - Border radius: 12px
   - Shadows: Enabled
   - Gradients: Enabled

2. **Sleek Theme**
   - Colors: Black/Gray monochrome
   - Fonts: Space Grotesk (heading), Inter (body)
   - Border radius: 4px
   - Shadows: Disabled
   - Gradients: Disabled

3. **Premium Theme**
   - Colors: Gold/Yellow warm palette
   - Fonts: Playfair Display (heading), Source Sans Pro (body)
   - Border radius: 8px
   - Shadows: Enabled
   - Gradients: Enabled

4. **Minimal Theme**
   - Colors: Green/white clean palette
   - Fonts: System UI
   - Border radius: 0px
   - Shadows: Disabled
   - Gradients: Disabled

### 📧 **Email Templates**

1. **Medical Certificate - Patient**
   - Sent to patients when certificate is ready
   - Includes verification code and download link
   - Merge tags: patientName, dashboardUrl, verificationCode, certType, appUrl

2. **Medical Certificate - Employer**
   - Forwarded to employers upon request
   - Includes download link and verification
   - Merge tags: employerName, companyName, patientName, downloadUrl, verificationCode

3. **Welcome Email**
   - Sent to new users after registration
   - Onboarding and service introduction
   - Merge tags: patientName, dashboardUrl, appUrl

4. **eScript Sent**
   - Notifies patients when eScript is sent via SMS
   - Instructions for collection at pharmacy
   - Merge tags: patientName, medicationName, appUrl

5. **Request Declined**
   - Sent when medical request cannot be approved
   - Includes reason and recommendations
   - Merge tags: patientName, serviceName, declineReason, recommendations

### 🛠️ **Customization Options**

#### **Theme Customization**
- Real-time theme switching
- Color palette preview
- Font selection
- Border radius adjustments
- Shadow and gradient toggles

#### **Content Customization**
- Dynamic merge tag editing
- Real-time preview updates
- Sample data overrides
- Custom field values

#### **Advanced Styling**
- Custom CSS injection
- Live style preview
- Code view access
- HTML export functionality

### 📱 **Preview Modes**

#### **Device Preview**
- Desktop view (600px width)
- Mobile view (375px width)
- Responsive testing
- Real-time switching

#### **View Modes**
- Visual preview (rendered HTML)
- Code view (raw HTML source)
- Copy HTML functionality
- Live regeneration

### 📤 **Test Email Functionality**

#### **Email Testing**
- Send test emails to any address
- Admin-only access control
- Real-time sending status
- Error handling and feedback

#### **Email Content**
- Test banner identification
- Theme name in subject
- Full HTML rendering
- Merge tag substitution

## Technical Implementation

### **Frontend Components**

#### **EmailTestClient** (`/admin/email-test/email-test-client.tsx`)
- Main React component with state management
- Theme system with CSS generation
- Template rendering engine
- Real-time preview updates

#### **Email Test Page** (`/admin/email-test/page.tsx`)
- Server-side authentication
- Admin role verification
- Suspense boundary for loading

### **Backend API**

#### **Test Email API** (`/api/admin/test-email/route.ts`)
- Admin authentication middleware
- Email validation and sanitization
- Resend integration for sending
- Error handling and logging

### **Theme System**

#### **Theme Configuration**
```typescript
const emailThemes = {
  modern: {
    name: "Modern",
    colors: { primary: "#6366f1", secondary: "#8b5cf6", ... },
    fonts: { heading: "'Inter', ...", body: "'Inter', ..." },
    borderRadius: "12px",
    shadows: true,
    gradients: true,
  },
  // ... other themes
}
```

#### **Dynamic CSS Generation**
- Theme-based CSS injection
- Responsive design rules
- Custom CSS integration
- Browser compatibility

### **Template Engine**

#### **HTML Generation**
- Server-side template rendering
- Merge tag substitution
- Theme application
- HTML sanitization

#### **Template Content**
- Template-specific content blocks
- Conditional rendering logic
- Brand compliance
- Accessibility features

## Usage Guide

### **Accessing the Email Test Studio**

1. Navigate to `/admin/email-test`
2. Requires admin role authentication
3. Accessible from admin sidebar under "Email Operations"

### **Designing Emails**

1. **Select Template**
   - Choose from available email types
   - View template description and tags
   - Sample data automatically loaded

2. **Choose Theme**
   - Select from 4 premium themes
   - Preview color palette
   - See font and style options

3. **Customize Content**
   - Edit merge tag values
   - Override sample data
   - Real-time preview updates

4. **Advanced Styling**
   - Add custom CSS rules
   - Fine-tune appearance
   - Live preview feedback

### **Testing Emails**

1. **Enter Test Email**
   - Provide recipient email address
   - Validation for proper format

2. **Send Test Email**
   - Click "Send Test Email" button
   - Monitor sending status
   - Receive confirmation/error feedback

3. **Review Results**
   - Check email in recipient inbox
   - Verify rendering across clients
   - Test links and functionality

### **Preview Options**

1. **Device Testing**
   - Switch between desktop/mobile views
   - Test responsive design
   - Verify layout adaptation

2. **Code Access**
   - Switch to code view
   - Copy HTML source
   - Export for external use

## Design Principles

### **Premium Aesthetics**
- Modern, clean design language
- Professional color palettes
- Consistent typography
- Attention to detail

### **Brand Consistency**
- InstantMed brand elements
- ABN inclusion in footers
- Compliant medical messaging
- Professional tone

### **Accessibility**
- Semantic HTML structure
- Alt text for images
- Color contrast compliance
- Keyboard navigation

### **Performance**
- Optimized HTML generation
- Minimal CSS footprint
- Fast preview updates
- Efficient email sending

## Security Considerations

### **Access Control**
- Admin-only access restriction
- Authentication middleware
- Role-based permissions
- CSRF protection

### **Email Security**
- Input sanitization
- HTML validation
- Rate limiting considerations
- Audit logging

### **Data Privacy**
- No sensitive data in templates
- Test email identification
- Secure API endpoints
- Privacy compliance

## Browser Compatibility

### **Email Client Support**
- Gmail (full support)
- Outlook (good support)
- Apple Mail (full support)
- Mobile clients (tested)

### **Web Browser Support**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

## Future Enhancements

### **Planned Features**
1. **Additional Themes**
   - Seasonal themes
   - Brand variations
   - Custom theme creation

2. **Advanced Templates**
   - Marketing emails
   - Newsletter templates
   - Transactional variations

3. **Analytics Integration**
   - Email open tracking
   - Click-through metrics
   - A/B testing capabilities

4. **Template Library**
   - Save custom designs
   - Template sharing
   - Version control

### **Technical Improvements**
1. **Performance Optimization**
   - Caching strategies
   - Lazy loading
   - Bundle optimization

2. **Enhanced Preview**
   - Live device testing
   - Email client simulation
   - Rendering engine improvements

3. **Integration Features**
   - CRM integration
   - Marketing automation
   - API extensions

## Troubleshooting

### **Common Issues**

1. **Build Errors**
   - Check TypeScript types
   - Verify import paths
   - Ensure all dependencies

2. **Email Not Sending**
   - Verify Resend configuration
   - Check admin permissions
   - Review API logs

3. **Preview Issues**
   - Clear browser cache
   - Check console errors
   - Verify theme data

4. **Styling Problems**
   - Validate CSS syntax
   - Check theme configuration
   - Test email client rendering

### **Debug Tools**
- Browser developer tools
- Network request monitoring
- Console error logging
- Email client testing

## Support

For technical support or feature requests:
1. Check this documentation
2. Review code comments
3. Test with different browsers
4. Contact development team

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Maintainer**: InstantMed Development Team
