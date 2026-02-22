"use client"

import * as React from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Pagination,
  Spinner,
  Input,
  Selection,
  SortDescriptor,
} from "@heroui/react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Column definition for DataTable
 */
export interface DataTableColumn<T> {
  /** Unique key for the column */
  key: string
  /** Display label for the column header */
  label: string
  /** Whether the column is sortable */
  sortable?: boolean
  /** Custom render function for cell content */
  render?: (item: T, index: number) => React.ReactNode
  /** Column width */
  width?: number | string
  /** Alignment */
  align?: "start" | "center" | "end"
}

export interface DataTableProps<T> {
  /** Data items to display */
  items: T[]
  /** Column definitions */
  columns: DataTableColumn<T>[]
  /** Unique key field in each item */
  rowKey: keyof T
  /** Loading state */
  isLoading?: boolean
  /** Empty state message */
  emptyContent?: React.ReactNode
  /** Enable row selection */
  selectionMode?: "none" | "single" | "multiple"
  /** Selected keys (controlled) */
  selectedKeys?: Selection
  /** Selection change handler */
  onSelectionChange?: (keys: Selection) => void
  /** Enable search filtering */
  searchable?: boolean
  /** Search placeholder */
  searchPlaceholder?: string
  /** Custom search filter function */
  searchFilter?: (item: T, search: string) => boolean
  /** Pagination - total items */
  totalItems?: number
  /** Pagination - current page (1-indexed) */
  page?: number
  /** Pagination - items per page */
  pageSize?: number
  /** Pagination - page change handler */
  onPageChange?: (page: number) => void
  /** Sort descriptor (controlled) */
  sortDescriptor?: SortDescriptor
  /** Sort change handler */
  onSortChange?: (descriptor: SortDescriptor) => void
  /** Row click handler */
  onRowAction?: (key: React.Key) => void
  /** Additional class name */
  className?: string
  /** Aria label for the table */
  "aria-label"?: string
  /** Compact mode */
  isCompact?: boolean
  /** Striped rows */
  isStriped?: boolean
  /** Remove wrapper styling */
  removeWrapper?: boolean
}

/**
 * DataTable - HeroUI Table wrapper with common patterns
 * 
 * Features:
 * - Built-in search filtering
 * - Pagination support
 * - Sorting support
 * - Selection (single/multiple)
 * - Loading states
 * - Empty states
 * 
 * @example
 * ```tsx
 * <DataTable
 *   items={users}
 *   columns={[
 *     { key: "name", label: "Name", sortable: true },
 *     { key: "email", label: "Email" },
 *     { key: "actions", label: "", render: (user) => <Button>Edit</Button> },
 *   ]}
 *   rowKey="id"
 *   searchable
 *   selectionMode="multiple"
 * />
 * ```
 */
export function DataTable<T extends Record<string, unknown>>({
  items,
  columns,
  rowKey,
  isLoading = false,
  emptyContent = "No data found",
  selectionMode = "none",
  selectedKeys,
  onSelectionChange,
  searchable = false,
  searchPlaceholder = "Search...",
  searchFilter,
  totalItems,
  page = 1,
  pageSize = 10,
  onPageChange,
  sortDescriptor,
  onSortChange,
  onRowAction,
  className,
  "aria-label": ariaLabel = "Data table",
  isCompact = false,
  isStriped = false,
  removeWrapper = false,
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = React.useState("")
  const [internalSort, setInternalSort] = React.useState<SortDescriptor>({ column: "", direction: "ascending" })

  // Use controlled sort if provided, otherwise internal
  const currentSort = sortDescriptor ?? internalSort
  const handleSortChange = onSortChange ?? setInternalSort

  // Filter items by search
  const filteredItems = React.useMemo(() => {
    if (!searchable || !searchValue.trim()) {
      return items
    }

    const search = searchValue.toLowerCase()
    
    if (searchFilter) {
      return items.filter((item) => searchFilter(item, search))
    }

    // Default: search all string values
    return items.filter((item) =>
      Object.values(item).some(
        (value) =>
          typeof value === "string" &&
          value.toLowerCase().includes(search)
      )
    )
  }, [items, searchValue, searchable, searchFilter])

  // Sort items
  const sortedItems = React.useMemo(() => {
    if (!currentSort.column) {
      return filteredItems
    }

    return [...filteredItems].sort((a, b) => {
      const aValue = a[currentSort.column as keyof T]
      const bValue = b[currentSort.column as keyof T]

      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1

      return currentSort.direction === "descending" ? -comparison : comparison
    })
  }, [filteredItems, currentSort])

  // Calculate pagination
  const total = totalItems ?? sortedItems.length
  const totalPages = Math.ceil(total / pageSize)
  
  // If no external pagination, slice items
  const displayItems = onPageChange
    ? sortedItems
    : sortedItems.slice((page - 1) * pageSize, page * pageSize)

  // Render cell content
  const renderCell = React.useCallback(
    (item: T, columnKey: string, index: number) => {
      const column = columns.find((c) => c.key === columnKey)
      if (column?.render) {
        return column.render(item, index)
      }
      const value = item[columnKey as keyof T]
      return value !== null && value !== undefined ? String(value) : "-"
    },
    [columns]
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      {searchable && (
        <Input
          isClearable
          classNames={{
            base: "w-full sm:max-w-[300px]",
            inputWrapper: "bg-default-100",
          }}
          placeholder={searchPlaceholder}
          size="sm"
          startContent={<Search className="h-4 w-4 text-default-400" />}
          value={searchValue}
          onClear={() => setSearchValue("")}
          onValueChange={setSearchValue}
        />
      )}

      {/* Table */}
      <Table
        aria-label={ariaLabel}
        isCompact={isCompact}
        isStriped={isStriped}
        removeWrapper={removeWrapper}
        selectionMode={selectionMode}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        sortDescriptor={currentSort}
        onSortChange={handleSortChange}
        onRowAction={onRowAction}
        classNames={{
          wrapper: "min-h-[200px]",
        }}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              allowsSorting={column.sortable}
              width={column.width as number | undefined}
              align={column.align}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={displayItems}
          isLoading={isLoading}
          loadingContent={<Spinner label="Loading..." />}
          emptyContent={emptyContent}
        >
          {(item) => (
            <TableRow key={String(item[rowKey])}>
              {(columnKey) => (
                <TableCell>
                  {renderCell(item, String(columnKey), displayItems.indexOf(item))}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex w-full justify-center">
          <Pagination
            isCompact
            showControls
            showShadow
            color="primary"
            page={page}
            total={totalPages}
            onChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
