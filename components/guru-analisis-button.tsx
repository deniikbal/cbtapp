"use client"

import { useState, useTransition } from "react"
import { ChartColumn, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { getAnalisisButirGuru } from "@/app/guru/dashboard/actions"
import { AnalisisButirDialog } from "@/components/analisis-butir-dialog"
import { Button } from "@/components/ui/button"
import type { AnalisisBank } from "@/lib/analisis-data"

export function GuruAnalisisButton({
  bankId,
  judul,
  akses,
}: {
  bankId: string
  judul: string
  akses: { status: string; nominal: number; waAdmin: string; qris: string }
}) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<AnalisisBank | null>(null)
  const [pending, startTransition] = useTransition()

  function buka() {
    startTransition(async () => {
      const hasil = await getAnalisisButirGuru(bankId)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      setData(hasil.data)
      setOpen(true)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={buka}
        disabled={pending}
        className="h-7 gap-1 px-2 text-[11px]"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ChartColumn className="size-3.5" />}
        Analisis butir
      </Button>
      <AnalisisButirDialog open={open} onOpenChange={setOpen} judul={judul} data={data} bankId={bankId} akses={akses} />
    </>
  )
}
