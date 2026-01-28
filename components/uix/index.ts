/**
 * UIX Component Library
 * 
 * Abstraction layer that wraps HeroUI Pro (primary) and shadcn (fallback)
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
  type CardProps 
} from "./card"
export { Input, UIXInput, type InputProps } from "./input"
export { 
  Modal, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure,
  UIXModal,
  type ModalProps 
} from "./modal"

// Navigation & Organization
export { 
  Accordion, 
  AccordionItem, 
  UIXAccordion, 
  UIXAccordionItem,
  type AccordionProps,
  type AccordionItemProps 
} from "./accordion"
export { 
  Stepper, 
  CompactStepper,
  UIXStepper,
  UIXCompactStepper,
  type StepperProps,
  type Step,
  type CompactStepperProps 
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

// Re-export commonly used HeroUI components directly for convenience
export {
  // Feedback & Loading
  Spinner,
  Progress,
  Skeleton,
  
  // Data Display
  Chip,
  Badge,
  Avatar,
  AvatarGroup,
  User,
  Snippet,
  Code,
  
  // Overlays
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  
  // Forms
  Switch,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  SelectSection,
  Textarea,
  Autocomplete,
  AutocompleteItem,
  AutocompleteSection,
  Slider,
  
  // Date & Time
  DatePicker,
  DateRangePicker,
  Calendar,
  RangeCalendar,
  DateInput,
  TimeInput,
  
  // Navigation
  Breadcrumbs,
  BreadcrumbItem,
  Tabs,
  Tab,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  
  // Layout
  Divider,
  Spacer,
  
  // Data Tables
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Pagination,
  
  // Misc
  Image,
  ScrollShadow,
  Listbox,
  ListboxItem,
  ListboxSection,
} from "@heroui/react"

// Re-export custom wrappers
export { DataTable, type DataTableProps, type DataTableColumn } from "./data-table"
export { UserCard, type UserCardProps } from "./user-card"
export { PageBreadcrumbs, type PageBreadcrumbsProps, type BreadcrumbLink } from "./breadcrumbs"
export { DatePickerField, type DatePickerFieldProps } from "./date-picker"
