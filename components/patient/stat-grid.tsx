import { Card, CardContent } from "@/components/ui/card"

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
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${items.length} gap-3 ${className ?? ""}`}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className={`text-lg font-semibold ${item.color ?? ""}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
