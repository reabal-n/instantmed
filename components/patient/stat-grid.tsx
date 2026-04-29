import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatItem {
  value: number
  label: string
  color?: string
}

interface StatGridProps {
  items: StatItem[]
  className?: string
}

export function StatGrid({ items, className }: StatGridProps) {
  const columnClass =
    items.length <= 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-2"
        : items.length === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : items.length === 4
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"

  return (
    <div className={cn("grid gap-4", columnClass, className)}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 sm:p-5 text-center">
            <p className={`text-xl font-semibold ${item.color ?? ""}`}>{item.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
