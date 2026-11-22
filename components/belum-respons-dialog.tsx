"use client"

import { useState } from "react"
import { UserX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type PesertaBelum = { kelas: string; nama: string; nis: string }

/** Daftar peserta aktif yang belum mengirim respons untuk satu bank soal. */
export function BelumResponsDialog({
  judul,
  belum,
  peserta,
}: {
  judul: string
  belum: PesertaBelum[]
  peserta: number
}) {
  const [open, setOpen] = useState(false)

  if (belum.length === 0) {
    return (
      <Badge variant="outline" className="rounded-sm font-normal text-lime-700">
        Semua sudah
      </Badge>
    )
  }

  const perKelas = new Map<string, PesertaBelum[]>()
  for (const p of belum) {
    const list = perKelas.get(p.kelas) ?? []
    list.push(p)
    perKelas.set(p.kelas, list)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 rounded-sm px-2 text-[11px] font-normal text-amber-700"
          />
        }
      >
        <UserX className="size-3.5" aria-hidden="true" />
        {belum.length} belum
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Belum ada respons</DialogTitle>
          <DialogDescription>
            {belum.length} dari {peserta} peserta aktif di {judul} belum mengirim jawaban. Data dari Google Form —
            yang sakit/izin akan tampak di sini.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto overscroll-contain pr-1">
          {[...perKelas.entries()].map(([kelas, list]) => (
            <div key={kelas}>
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold">
                {kelas}
                <Badge variant="secondary" className="rounded-sm font-normal">
                  {list.length}
                </Badge>
              </p>
              <ul className="divide-y rounded-sm border">
                {list.map((p) => (
                  <li key={`${p.kelas}-${p.nis}-${p.nama}`} className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="min-w-0 truncate text-sm">{p.nama}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{p.nis}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
