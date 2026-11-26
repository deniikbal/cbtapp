"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { hubungkanRespons } from "@/app/dashboard/hasil/actions"
import { skorMirip } from "@/lib/mirip-nama"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, Loader2, Link2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [siswaId, setSiswaId] = useState("")
  const [cari, setCari] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!rows.length) return null

  const namaKelas = new Map(kelasList.map((k) => [k.id, k.name]))
  const siswaTerpilih = siswaList.find((s) => s.id === siswaId)

  // Urutan awal dialog: siswa yang paling mirip dengan nama/NISN yang diketik di form.
  const usulan = useMemo(() => {
    if (!terpilih) return []
    return siswaList
      .map((s) => ({ siswa: s, skor: skorMirip({ nama: terpilih.nama, nis: terpilih.nis }, s) }))
      .filter((x) => x.skor > 0)
      .sort((a, b) => b.skor - a.skor || a.siswa.name.localeCompare(b.siswa.name))
      .slice(0, 8)
  }, [terpilih, siswaList])

  // Ketik manual: cari seluruh siswa, abaikan urutan kemiripan. Kalau tidak ada
  // nama yang persis mengandung ketikan (nama di form sering salah ketik),
  // tampilkan yang paling mirip supaya siswa tetap ketemu.
  const [hasilCari, cariPersis] = useMemo(() => {
    const q = cari.trim().toUpperCase()
    if (!q) return [usulan, true] as const
    const persis = siswaList.filter((s) => s.name.toUpperCase().includes(q) || s.nis.includes(q))
    if (persis.length) return [persis.slice(0, 20).map((siswa) => ({ siswa, skor: 0 })), true] as const
    const mirip = siswaList
      .map((siswa) => ({ siswa, skor: skorMirip({ nama: cari.trim(), nis: cari.trim() }, siswa) }))
      .filter((x) => x.skor >= 0.3)
      .sort((a, b) => b.skor - a.skor)
      .slice(0, 20)
    return [mirip, false] as const
  }, [cari, siswaList, usulan])

  function buka(row: ResponsTakTerhubung) {
    setTerpilih(row)
    setSiswaId("")
    setCari("")
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
              Nama, NISN, atau kelas yang diketik di form bisa salah. Cari siswa yang benar lewat nama atau NISN — usulan paling mirip muncul lebih dulu.
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
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama atau NISN siswa yang benar"
                className="pl-8"
                autoFocus
              />
            </div>

            <div className="max-h-64 divide-y overflow-y-auto rounded-lg border">
              {hasilCari.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada siswa yang cocok. Coba kata lain dari namanya.
                </p>
              ) : (
                hasilCari.map(({ siswa }) => (
                  <button
                    key={siswa.id}
                    type="button"
                    onClick={() => setSiswaId(siswa.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60",
                      siswaId === siswa.id && "bg-muted"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{siswa.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {siswa.nis} • {namaKelas.get(siswa.classroomId) ?? "kelas tidak dikenal"}
                      </span>
                    </span>
                    {siswaId === siswa.id && <Check className="size-4 shrink-0" aria-hidden="true" />}
                  </button>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {siswaTerpilih
                ? `Dipilih: ${siswaTerpilih.name} (${namaKelas.get(siswaTerpilih.classroomId) ?? "-"}). Nilai dipindah ke jadwal bank soal ini untuk kelas tersebut.`
                : cari.trim()
                  ? cariPersis
                    ? "Hasil pencarian semua kelas."
                    : "Tidak ada nama yang persis sama. Yang tampil adalah siswa paling mirip — periksa NISN dan kelasnya sebelum menghubungkan."
                  : "Urutan teratas = paling mirip dengan nama/NISN yang diketik di form. Nama, NISN, dan kelas di form boleh salah."}
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
