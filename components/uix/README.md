# UIX Component Library

Small compatibility layer for shared UI primitives that are still imported as `@/components/uix`.

## Exports

```tsx
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CompactStepper,
  DatePickerField,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageBreadcrumbs,
  Pagination,
  ScrollShadow,
  Skeleton,
  Snippet,
  Spinner,
  Stepper,
  Tooltip,
  UserCard,
  useDisclosure,
} from "@/components/uix"
```

Do not add new compatibility APIs here unless the repo has live callers that need them. Prefer canonical components from `@/components/ui` and domain-specific primitives first.

## Examples

```tsx
import { PageBreadcrumbs, Snippet, UserCard } from "@/components/uix"

<PageBreadcrumbs
  showHome
  links={[
    { label: "Admin", href: "/admin" },
    { label: "Settings" },
  ]}
/>

<UserCard name="Clinician" description="General Practitioner" />

<Snippet symbol="" size="sm">
  MC-REFERENCE
</Snippet>
```
