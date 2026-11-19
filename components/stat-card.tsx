import type { ComponentType } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Flat stat card: neutral surface, big number, single green icon accent.
 * Shared across all dashboard pages for visual consistency.
 */
export function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number | string
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  const tampilan = typeof value === "number" ? value.toLocaleString("id-ID") : value
  return (
    <Card className="gap-0 rounded-sm py-4">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="size-4 shrink-0 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-1">
        <p className="text-2xl font-semibold tabular-nums md:text-3xl">
          {tampilan}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
