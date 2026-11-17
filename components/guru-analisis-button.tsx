"use client"

import { useState, useTransition } from "react"
import { ChartColumn, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { getAnalisisButirGuru } from "@/app/guru/dashboard/actions"
import { AnalisisButirDialog } from "@/components/analisis-butir-dialog"
import { Button } from "@/components/ui/button"
import type { AnalisisButir } from "@/lib/analisis-butir"

export function GuruAnalisisButton({ bankId, judul }: { bankId: string; judul: string }) {
  const [open, setOpen] = useState(false)
  const [butir, setButir] = useState<AnalisisButir[]>([])
  const [pending, startTransition] = useTransition()

  function buka() {
    startTransition(async () => {
      const hasil = await getAnalisisButirGuru(bankId)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      setButir(hasil.butir)
      setOpen(true)
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={buka} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ChartColumn className="size-4" />}
        Analisis butir
      </Button>
      <AnalisisButirDialog open={open} onOpenChange={setOpen} judul={judul} butir={butir} />
    </>
  )
}
