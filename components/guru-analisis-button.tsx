"use client"

import { useState, useTransition } from "react"
import { ChartColumn, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { getAnalisisButirGuru } from "@/app/guru/dashboard/actions"
import { AnalisisButirDialog } from "@/components/analisis-butir-dialog"
import { Button } from "@/components/ui/button"
import { AksiIkon } from "@/components/aksi-ikon"
import type { AnalisisBank } from "@/lib/analisis-data"

export function GuruAnalisisButton({
  bankId,
  judul,
  akses,
  tampilan = "ikon",
}: {
  bankId: string
  judul: string
  akses: { status: string; nominal: number; waAdmin: string; qris: string; punyaQris: boolean }
  tampilan?: "ikon" | "teks"
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
      {tampilan === "teks" ? (
        <Button variant="outline" size="sm" onClick={buka} disabled={pending} className="h-11 rounded-sm">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ChartColumn className="size-4" aria-hidden="true" />}
          Analisis
        </Button>
      ) : (
        <AksiIkon label="Analisis butir">
          <Button variant="ghost" size="icon-sm" onClick={buka} disabled={pending} className="size-11 rounded-sm sm:size-6">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ChartColumn className="size-4" aria-hidden="true" />}
            <span className="sr-only">Analisis butir</span>
          </Button>
        </AksiIkon>
      )}
      <AnalisisButirDialog open={open} onOpenChange={setOpen} judul={judul} data={data} bankId={bankId} akses={akses} />
    </>
  )
}
