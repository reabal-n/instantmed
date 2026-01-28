# UIX Component Library

HeroUI Pro abstraction layer for consistent, modern UI components.

## Quick Start

```tsx
import {
  // Core
  Button, Card, Input, Modal,
  
  // Data Display
  DataTable, UserCard, Chip, Badge, Snippet,
  
  // Navigation
  PageBreadcrumbs, Tabs, Tab,
  
  // Forms
  DatePickerField, Select, SelectItem, Switch, Checkbox,
  
  // Feedback
  Spinner, Progress, Skeleton,
  
  // Layout
  Divider, Spacer,
} from "@/components/uix"
```

## Component Examples

### DataTable

Full-featured table with sorting, search, pagination, and selection.

```tsx
import { DataTable, type DataTableColumn } from "@/components/uix"

interface User {
  id: string
  name: string
  email: string
  role: string
}

const columns: DataTableColumn<User>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "role", label: "Role" },
  {
    key: "actions",
    label: "",
    render: (user) => <Button size="sm">Edit</Button>,
  },
]

<DataTable
  items={users}
  columns={columns}
  rowKey="id"
  searchable
  searchPlaceholder="Search users..."
  selectionMode="multiple"
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  page={page}
  pageSize={20}
  totalItems={totalCount}
  onPageChange={setPage}
  isLoading={isLoading}
  emptyContent="No users found"
/>
```

### UserCard

Display user info with avatar.

```tsx
import { UserCard } from "@/components/uix"

<UserCard
  name="Dr. Sarah Smith"
  description="General Practitioner"
  avatarUrl="/avatars/sarah.jpg"
  size="md"
/>
```

### PageBreadcrumbs

Navigation breadcrumbs.

```tsx
import { PageBreadcrumbs } from "@/components/uix"

<PageBreadcrumbs
  showHome
  links={[
    { label: "Admin", href: "/admin" },
    { label: "Settings", href: "/admin/settings" },
    { label: "Feature Flags" }, // Current page (no href)
  ]}
/>
```

### DatePickerField

Date picker with ISO string handling.

```tsx
import { DatePickerField } from "@/components/uix"

const [startDate, setStartDate] = useState<string>("")

<DatePickerField
  label="Start Date"
  value={startDate}
  onChange={setStartDate}
  disablePast
  isRequired
  errorMessage={errors.startDate}
/>
```

### Snippet (Code Display)

Display copyable code/text.

```tsx
import { Snippet } from "@/components/uix"

<Snippet symbol="" size="sm">
  MC-2025-ABC123XYZ
</Snippet>
```

## Migration Guide

### From shadcn/ui Table to DataTable

**Before:**
```tsx
import { Table, TableBody, ... } from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      ...
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        ...
      </TableRow>
    ))}
  </TableBody>
</Table>
{/* Manual pagination */}
```

**After:**
```tsx
import { DataTable } from "@/components/uix"

<DataTable
  items={items}
  columns={[
    { key: "name", label: "Name", sortable: true },
    ...
  ]}
  rowKey="id"
  searchable
  page={page}
  pageSize={20}
  totalItems={total}
  onPageChange={setPage}
/>
```

### From Manual Avatar to UserCard

**Before:**
```tsx
<div className="flex items-center gap-3">
  <Avatar>
    <AvatarImage src={user.avatar} />
    <AvatarFallback>{user.initials}</AvatarFallback>
  </Avatar>
  <div>
    <p className="font-medium">{user.name}</p>
    <p className="text-sm text-muted-foreground">{user.role}</p>
  </div>
</div>
```

**After:**
```tsx
<UserCard
  name={user.name}
  description={user.role}
  avatarUrl={user.avatar}
/>
```

## All Exports

### Custom Wrappers
- `DataTable` - Feature-rich table
- `UserCard` - User display with avatar
- `PageBreadcrumbs` - Navigation breadcrumbs
- `DatePickerField` - Date picker with ISO strings

### Re-exported from HeroUI
- Feedback: `Spinner`, `Progress`, `Skeleton`
- Data Display: `Chip`, `Badge`, `Avatar`, `AvatarGroup`, `User`, `Snippet`, `Code`
- Overlays: `Tooltip`, `Popover`, `Dropdown`, `DropdownMenu`, `DropdownItem`
- Forms: `Switch`, `Checkbox`, `Radio`, `RadioGroup`, `Select`, `SelectItem`, `Textarea`, `Autocomplete`, `Slider`
- Date/Time: `DatePicker`, `DateRangePicker`, `Calendar`, `DateInput`, `TimeInput`
- Navigation: `Breadcrumbs`, `BreadcrumbItem`, `Tabs`, `Tab`, `Link`, `Navbar`
- Layout: `Divider`, `Spacer`
- Tables: `Table`, `TableHeader`, `TableBody`, `TableColumn`, `TableRow`, `TableCell`, `Pagination`
- Misc: `Image`, `ScrollShadow`, `Listbox`, `ListboxItem`
