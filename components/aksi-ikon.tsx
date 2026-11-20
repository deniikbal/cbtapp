"use client"

import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Membungkus tombol ikon aksi dengan tooltip kecil (lebar menyesuaikan isi). */
export function AksiIkon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <span {...props} className="inline-flex">
            {children}
          </span>
        )}
      />
      <TooltipContent className="w-fit">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
