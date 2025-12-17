// HeroUI Component Exports
// These are wrapper components that provide API compatibility with existing shadcn components

export { Button } from "./button"
export type { ButtonProps } from "./button"

export { Input } from "./input"
export type { InputProps } from "./input"

export { Card, CardHeader, CardBody, CardFooter } from "./card"
export type { CardProps } from "./card"

export { Modal, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "./modal"
export type { ModalProps } from "./modal"

// Re-export commonly used HeroUI components directly
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
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
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
