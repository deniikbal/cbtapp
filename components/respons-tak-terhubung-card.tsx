"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { hubungkanRespons } from "@/app/dashboard/hasil/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Link2 } from "lucide-react"
import { toast } from "sonner"

export type ResponsTakTerhubung = {
  id: string
  nis: string
  nama: string
  bank: string
  kelas: string
  kelasWaktu: string
  submittedAt: string | null
}

export type KelasSiswa = { id: string; name: string }
export type SiswaPilihan = { id: string; name: string; nis: string; classroomId: string }

function urutNatural<T>(list: T[], ambil: (x: T) => string) {
  const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" })
  return [...list].sort((a, b) => collator.compare(ambil(a), ambil(b)))
}

export function ResponsTakTerhubungCard({
  rows,
  kelasList,
  siswaList,
}: {
  rows: ResponsTakTerhubung[]
  kelasList: KelasSiswa[]
  siswaList: SiswaPilihan[]
}) {
  const [terpilih, setTerpilih] = useState<ResponsTakTerhubung | null>(null)
  const [kelasId, setKelasId] = useState("")
  const [siswaId, setSiswaId] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!rows.length) return null

  const siswaKelas = urutNatural(
    siswaList.filter((s) => s.classroomId === kelasId),
    (s) => s.name
  )

  function buka(row: ResponsTakTerhubung) {
    setTerpilih(row)
    setKelasId("")
    setSiswaId("")
  }

  function hubungkan() {
    if (!terpilih || !siswaId) return
    startTransition(async () => {
      const hasil = await hubungkanRespons(terpilih.id, siswaId)
      if (hasil.ok) {
        toast.success(hasil.message)
        setTerpilih(null)
        setSiswaId("")
        router.refresh()
      } else {
        toast.error(hasil.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Respons tidak terhubung <Badge variant="destructive">{rows.length}</Badge>
            </CardTitle>
            <CardDescription>
              Respons ini NIS-nya tidak cocok dengan peserta mana pun. Pilih siswa yang benar supaya nilainya masuk rekap.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="hidden overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Nama (di form)</TableHead>
                <TableHead>NIS (diketik)</TableHead>
                <TableHead>Bank soal</TableHead>
                <TableHead>Kelas jadwal</TableHead>
                <TableHead>Kirim</TableHead>
                <TableHead className="w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{row.nama || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{row.nis || "-"}</TableCell>
                  <TableCell className="max-w-52 truncate">{row.bank}</TableCell>
                  <TableCell>{row.kelas}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.submittedAt ?? "-"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => buka(row)}>
                      <Link2 className="size-3" aria-hidden="true" /> Hubungkan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* State kartu untuk layar sempit, menggantikan tabel 7 kolom. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {rows.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground sm:col-span-2">
              Tidak ada respons dengan NIS yang belum cocok.
            </div>
          ) : (
            rows.map((row, i) => (
              <div key={row.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.nama || "-"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.nis || "-"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">#{i + 1}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Bank soal</dt>
                    <dd className="truncate">{row.bank}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Kelas jadwal</dt>
                    <dd>{row.kelas}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Dikirim</dt>
                    <dd className="text-muted-foreground">{row.submittedAt ?? "-"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end border-t pt-3">
                  <Button size="sm" variant="outline" className="h-11 text-sm sm:h-8" onClick={() => buka(row)}>
                    <Link2 className="size-4" aria-hidden="true" /> Hubungkan
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={!!terpilih} onOpenChange={(open) => !open && setTerpilih(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hubungkan respons</DialogTitle>
            <DialogDescription>
              {terpilih?.nama || "(nama kosong)"} • NIS diketik: {terpilih?.nis || "-"} • {terpilih?.bank}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={kelasId}
              onValueChange={(v) => {
                setKelasId(v ?? "")
                setSiswaId("")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kelas">
                  {kelasId ? kelasList.find((k) => k.id === kelasId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {urutNatural(kelasList, (k) => k.name).map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={siswaId} onValueChange={(v) => setSiswaId(v ?? "")} disabled={!kelasId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={kelasId ? "Pilih siswa" : "Pilih kelas dulu"}>
                  {siswaId ? siswaKelas.find((s) => s.id === siswaId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {siswaKelas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} • {s.nis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Nilai respons ini akan dipindah ke jadwal kelas siswa yang dipilih.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerpilih(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={hubungkan} disabled={!siswaId || pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Hubungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
