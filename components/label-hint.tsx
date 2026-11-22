"use client"

import { Info } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Ikon info kecil di samping label; penjelasan panjang muncul saat diklik/hover. */
export function LabelHint({ text }: { text: string }) {
  if (!text) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            aria-label={text}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        )}
      />
      <TooltipContent className="w-fit max-w-[16rem]">
        <p className="text-xs leading-relaxed">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}
