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
    <div className={`grid grid-cols-2 sm:grid-cols-${items.length} gap-4 ${className ?? ""}`}>
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
