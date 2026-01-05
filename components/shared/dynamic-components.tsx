/**
 * Dynamically Loaded Components
 * 
 * Heavy components that should be loaded on-demand to improve initial page load.
 * Uses Next.js dynamic imports with loading states.
 */

import dynamic from 'next/dynamic'
import { Skeleton, RequestListSkeleton, PageSkeleton } from '@/components/ui/unified-skeleton'

// Loading skeleton for PDF viewers
const PDFLoadingSkeleton = () => (
  <div className="w-full h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
    <p className="text-muted-foreground">Loading PDF viewer...</p>
  </div>
)

// Loading skeleton for charts
const ChartLoadingSkeleton = () => (
  <div className="w-full h-64 space-y-3">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-48 w-full" />
  </div>
)

// Loading skeleton for dashboard
const DashboardLoadingSkeleton = () => (
  <div className="container py-8 space-y-4">
    <Skeleton className="h-8 w-48" />
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
)

// PDF Document renderer (heavy @react-pdf/renderer dependency)
// TODO: Re-enable when pdf-document component is created
// export const DynamicPDFDocument = dynamic(
//   () => import('@/components/med-cert/pdf-document').then((mod) => ({ default: mod.MedicalCertificatePDF })),
//   {
//     loading: () => <PDFLoadingSkeleton />,
//     ssr: false, // PDFs should only render client-side
//   }
// )

// PDF Preview component
// TODO: Re-enable when pdf-preview component is created
// export const DynamicPDFPreview = dynamic(
//   () => import('@/components/med-cert/pdf-preview').then((mod) => ({ default: mod.PDFPreview })),
//   {
//     loading: () => <PDFLoadingSkeleton />,
//     ssr: false,
//   }
// )

// TODO: Re-enable these dynamic imports when the corresponding components are created

// // Charts (recharts is heavy ~50KB)
// export const DynamicAnalyticsChart = dynamic(
//   () => import('@/components/doctor/analytics-chart').then((mod) => ({ default: mod.AnalyticsChart })),
//   {
//     loading: () => <ChartLoadingSkeleton />,
//     ssr: false,
//   }
// )

// Doctor Dashboard (loads heavy dependencies)
export const DynamicDoctorDashboard = dynamic(
  () => import('@/app/doctor/dashboard/dashboard-client').then((mod) => ({ default: mod.DoctorDashboardClient })),
  {
    loading: () => <DashboardLoadingSkeleton />,
    ssr: false,
  }
)

// // Admin Dashboard
// export const DynamicAdminDashboard = dynamic(
//   () => import('@/app/admin/dashboard/admin-client').then((mod) => ({ default: mod.AdminDashboardClient })),
//   {
//     loading: () => <DashboardLoadingSkeleton />,
//     ssr: false,
//   }
// )

// // Canvas Confetti (animation library)
// export const DynamicConfetti = dynamic(
//   () => import('@/components/effects/confetti-effect').then((mod) => ({ default: mod.ConfettiEffect })),
//   {
//     ssr: false,
//   }
// )

// // Rich text editor (if you add one)
// export const DynamicRichTextEditor = dynamic(
//   () => import('@/components/forms/rich-text-editor').then((mod) => ({ default: mod.RichTextEditor })),
//   {
//     loading: () => <Skeleton className="h-64 w-full" />,
//     ssr: false,
//   }
// )

// // File uploader with preview
// export const DynamicFileUploader = dynamic(
//   () => import('@/components/forms/file-uploader').then((mod) => ({ default: mod.FileUploader })),
//   {
//     loading: () => <Skeleton className="h-32 w-full" />,
//     ssr: false,
//   }
// )

// // OCR component (tesseract.js is very heavy ~2MB)
// export const DynamicOCRScanner = dynamic(
//   () => import('@/components/intake/ocr-scanner').then((mod) => ({ default: mod.OCRScanner })),
//   {
//     loading: () => (
//       <div className="flex items-center justify-center p-8">
//         <p className="text-muted-foreground">Loading OCR scanner...</p>
//       </div>
//     ),
//     ssr: false,
//   }
// )

// // Lottie animations
// export const DynamicLottieAnimation = dynamic(
//   () => import('@/components/effects/lottie-animation').then((mod) => ({ default: mod.LottieAnimation })),
//   {
//     ssr: false,
//   }
// )

// // Calendar/Date picker (if using a heavy library like react-big-calendar)
// export const DynamicCalendar = dynamic(
//   () => import('@/components/ui/calendar').then((mod) => ({ default: mod.Calendar })),
//   {
//     loading: () => <Skeleton className="h-64 w-full" />,
//   }
// )

// // Complex form components
// export const DynamicMedicalCertForm = dynamic(
//   () => import('@/components/med-cert/med-cert-form').then((mod) => ({ default: mod.MedicalCertForm })),
//   {
//     loading: () => <DashboardLoadingSkeleton />,
//   }
// )

// export const DynamicRepeatRxForm = dynamic(
//   () => import('@/components/repeat-rx/repeat-rx-form').then((mod) => ({ default: mod.RepeatRxForm })),
//   {
//     loading: () => <DashboardLoadingSkeleton />,
//   }
// )

// // Map component (Google Maps API)
// export const DynamicLocationMap = dynamic(
//   () => import('@/components/shared/location-map').then((mod) => ({ default: mod.LocationMap })),
//   {
//     loading: () => <Skeleton className="h-96 w-full" />,
//     ssr: false,
//   }
// )

// // Video player (if using react-player or similar)
// export const DynamicVideoPlayer = dynamic(
//   () => import('@/components/shared/video-player').then((mod) => ({ default: mod.VideoPlayer })),
//   {
//     loading: () => <Skeleton className="aspect-video w-full" />,
//     ssr: false,
//   }
// )
