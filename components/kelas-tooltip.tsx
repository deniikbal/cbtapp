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
      <TooltipContent className="w-fit max-w-xs">
        <p className="text-xs leading-relaxed">{kelas.join(" · ")}</p>
      </TooltipContent>
    </Tooltip>
  )
}
