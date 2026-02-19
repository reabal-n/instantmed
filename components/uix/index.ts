/**
 * UIX Component Library
 *
 * Abstraction layer that wraps Radix UI / Tailwind / shadcn-style components
 * for a unified, modernized UI while maintaining existing API compatibility.
 *
 * Usage:
 * import { Button, Card, Input } from "@/components/uix"
 *
 * Note: This layer only changes visual presentation.
 * Props and behavior remain identical to preserve existing business logic.
 */

// Core Components
export { Button, UIXButton, type ButtonProps } from "./button"
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardBody,
  CardFooter,
  CardFooterWrapper,
  UIXCard,
  type CardProps,
} from "./card"
export { Input, UIXInput, type InputProps } from "./input"
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  UIXModal,
  type ModalProps,
} from "./modal"

// Navigation & Organization
export {
  Accordion,
  AccordionItem,
  UIXAccordion,
  UIXAccordionItem,
} from "./accordion"
export {
  Stepper,
  CompactStepper,
  UIXStepper,
  UIXCompactStepper,
  type StepperProps,
  type Step,
  type CompactStepperProps,
} from "./stepper"

// Loading States
export {
  Skeleton as UIXSkeletonWrapper,
  CardSkeleton,
  ListItemSkeleton,
  StatsSkeleton,
  FormSkeleton,
  TableSkeleton,
  type SkeletonProps,
} from "./skeleton"

// Re-export from @/components/ui for components that app code imports via @/components/uix
export { Skeleton, Spinner } from "@/components/ui/skeleton"
export { Badge, Badge as Chip } from "@/components/ui/badge"

// HeroUI-compatible Tooltip wrapper (supports <Tooltip content="..."> API)
export { Tooltip, type TooltipProps } from "./tooltip"

// Re-export custom wrappers
export { UserCard, type UserCardProps } from "./user-card"
export { PageBreadcrumbs, type PageBreadcrumbsProps, type BreadcrumbLink } from "./breadcrumbs"
export { DatePickerField, type DatePickerFieldProps } from "./date-picker"

// ---------------------------------------------------------------------------
// Inline replacement components for HeroUI components no longer re-exported
// ---------------------------------------------------------------------------

export { Pagination, type PaginationProps } from "./pagination"
export { ScrollShadow } from "./scroll-shadow"
export { Snippet, type SnippetProps } from "./snippet"
