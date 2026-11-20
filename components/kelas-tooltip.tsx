"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

/** Daftar kelas disingkat jadi satu badge; detail muncul di tooltip saat hover. */
export function KelasTooltip({ kelas }: { kelas: string[] }) {
  if (kelas.length === 0) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Badge
            {...props}
            variant="outline"
            className="cursor-default rounded-sm font-normal"
          >
            {kelas.length} kelas
          </Badge>
        )}
      />
      <TooltipContent className="max-w-56">
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Kelas:</p>
        <ul className="space-y-0.5 text-xs">
          {kelas.map((nama) => (
            <li key={nama}>{nama}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
