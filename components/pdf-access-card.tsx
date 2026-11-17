"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { setAksesPdf } from "@/app/dashboard/guru/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type AksesRow = { id: string; name: string; nip: string; status: string; diaktifkanPada: string | null }

const gaya: Record<string, string> = {
  aktif: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  menunggu: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ditolak: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  belum: "bg-muted text-muted-foreground",
}

export function PdfAccessCard({ rows }: { rows: AksesRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function ubah(teacherId: string, aktif: boolean) {
    setPendingId(teacherId)
    startTransition(async () => {
      const hasil = await setAksesPdf(teacherId, aktif)
      if (hasil.ok) toast.success(hasil.message)
      else toast.error(hasil.message)
      setPendingId(null)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Akses unduh PDF analisis butir</CardTitle>
        <CardDescription className="text-[11px]">
          Sekali bayar, aktif permanen. Guru menandai &quot;saya sudah bayar&quot;, admin memverifikasi mutasi lalu mengaktifkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-muted/70 backdrop-blur">
              <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium">
                <th>Nama</th>
                <th>NIP</th>
                <th>Status</th>
                <th>Diaktifkan</th>
                <th className="w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t [&>td]:px-3 [&>td]:py-1">
                  <td className="truncate">{r.name}</td>
                  <td className="tabular-nums text-muted-foreground">{r.nip}</td>
                  <td>
                    <Badge variant="secondary" className={gaya[r.status] ?? gaya.belum}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground">{r.diaktifkanPada ?? "-"}</td>
                  <td className="space-x-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      disabled={pendingId === r.id || r.status === "aktif"}
                      onClick={() => ubah(r.id, true)}
                    >
                      {pendingId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : "Aktifkan"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      disabled={pendingId === r.id || r.status === "belum"}
                      onClick={() => ubah(r.id, false)}
                    >
                      Tolak
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    Belum ada guru.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
