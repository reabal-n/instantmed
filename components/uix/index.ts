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

// Core Components - Button re-exported from shadcn/ui
export {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  type ModalProps,
  useDisclosure,
} from "./modal"
export { Button, type ButtonProps } from "@/components/ui/button"
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  type CardProps,
  CardTitle,
} from "@/components/ui/card"
export { Input, type InputProps } from "@/components/ui/input"

// Navigation & Organization
export {
  Accordion,
  AccordionItem,
} from "./accordion"
export {
  CompactStepper,
  type CompactStepperProps,
  type Step,
  Stepper,
  type StepperProps,
} from "./stepper"

// Loading States - re-export from @/components/ui
export { Badge } from "@/components/ui/badge"
export { Skeleton, Spinner } from "@/components/ui/skeleton"

// Tooltip wrapper (supports <Tooltip content="..."> API)
export { Tooltip, type TooltipProps } from "./tooltip"

// Re-export custom wrappers
export { type BreadcrumbLink,PageBreadcrumbs, type PageBreadcrumbsProps } from "./breadcrumbs"
export { DatePickerField, type DatePickerFieldProps } from "./date-picker"
export { UserCard, type UserCardProps } from "./user-card"

// ---------------------------------------------------------------------------
// Custom inline replacement components
// ---------------------------------------------------------------------------

export { Pagination, type PaginationProps } from "./pagination"
export { ScrollShadow } from "./scroll-shadow"
export { Snippet, type SnippetProps } from "./snippet"
