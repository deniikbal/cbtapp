"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { terbitkanBank } from "@/app/dashboard/bank-soal/actions"
import { cn } from "@/lib/utils"

/**
 * Status terbit Google Form. `null` = belum pernah diperiksa (belum pernah sinkron).
 * Badge "Belum terbit" bisa diklik untuk menerbitkan form langsung dari Google Forms.
 */
export function PublishBadge({ bankId, published }: { bankId: string; published: boolean | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [lokal, setLokal] = useState(published)

  if (lokal === null) {
    return <Badge variant="outline" className="font-normal text-muted-foreground">Terbit: belum dicek</Badge>
  }

  if (lokal) {
    return <Badge variant="secondary" className={cn("font-normal", "bg-sky-500/10 text-sky-700 dark:text-sky-300")}>Terbit</Badge>
  }

  return (
    <button
      type="button"
      disabled={pending}
      title="Klik untuk menerbitkan form ini di Google Forms"
      onClick={() =>
        start(async () => {
          const hasil = await terbitkanBank(bankId)
          if (hasil.ok) setLokal(true)
          else toast.error(hasil.message)
        })
      }
      className="inline-flex disabled:opacity-60"
    >
      <Badge variant="secondary" className={cn("cursor-pointer font-normal", "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300")}>
        {pending ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
        Belum terbit
      </Badge>
    </button>
  )
}
