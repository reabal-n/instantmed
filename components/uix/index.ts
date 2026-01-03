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
  Tabs, 
  Tab, 
  UIXTabs, 
  UIXTab,
  type TabsProps,
  type TabProps 
} from "./tabs"
export { 
  Stepper, 
  CompactStepper,
  UIXStepper,
  UIXCompactStepper,
  type StepperProps,
  type Step,
  type CompactStepperProps 
} from "./stepper"

// Re-export commonly used HeroUI components directly for convenience
export {
  Spinner,
  Progress,
  Chip,
  Badge,
  Avatar,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Textarea,
  Autocomplete,
  AutocompleteItem,
  Skeleton,
  Divider,
  Link,
  User,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Pagination,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react"
