"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ChartColumn, FileSearch, Loader2, RefreshCw, TriangleAlert } from "lucide-react"

import { getAnalisisButir, getHasilDetail, syncHasil, type HasilDetail } from "@/app/dashboard/hasil/actions"
import { AnalisisButirDialog } from "@/components/analisis-butir-dialog"
import type { AnalisisButir } from "@/lib/analisis-butir"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type HasilRow = {
  /** jadwal perwakilan bank soal; dipakai saat sync form */
  id: string
  bankId: string
  title: string
  code: string
  kelas: string
  jumlahJadwal: number
  examDate: string
  startTime: string
  adaFormId: boolean
  soalDinilai: number
  respons: number
  rataRata: number | null
}

export function HasilTableCard({ rows }: { rows: HasilRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [detail, setDetail] = useState<HasilDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [butir, setButir] = useState<AnalisisButir[]>([])
  const [butirJudul, setButirJudul] = useState("")
  const [butirOpen, setButirOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleSync(row: HasilRow) {
    setPendingId(row.id)
    startTransition(async () => {
      const hasil = await syncHasil(row.id)
      if (!hasil.ok) {
        toast.error(hasil.message)
        setPendingId(null)
        return
      }
      const { cocok, tidakCocok, totalSoal } = hasil.info
      toast.success(`${cocok} respons tercatat, ${tidakCocok} tidak cocok NIS, ${totalSoal} soal dinilai.`)
      setPendingId(null)
    })
  }

  function handleAnalisis(row: HasilRow) {
    setPendingId(row.id)
    startTransition(async () => {
      const hasil = await getAnalisisButir(row.bankId)
      setPendingId(null)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      setButir(hasil.butir)
      setButirJudul(`${row.code} — ${row.title}`)
      setButirOpen(true)
    })
  }

  function handleDetail(row: HasilRow) {
    setPendingId(row.id)
    startTransition(async () => {
      const hasil = await getHasilDetail(row.bankId)
      setPendingId(null)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      setDetail(hasil.detail)
      setDetailOpen(true)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hasil Ujian dari Google Form</CardTitle>
        <CardDescription>Satu baris = satu bank soal (satu Google Form); respons semua kelas yang dijadwalkan digabung.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank Soal</TableHead>
              <TableHead>Kelas Terjadwal</TableHead>
              <TableHead>Jadwal Awal</TableHead>
              <TableHead className="text-center">Soal Dinilai</TableHead>
              <TableHead className="text-center">Respons</TableHead>
              <TableHead className="text-center">Rata-rata</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Belum ada bank soal yang dijadwalkan.</TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{row.code}</span>
                    <span className="text-xs text-muted-foreground">{row.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{row.kelas}</span>
                    <span className="text-xs text-muted-foreground">{row.jumlahJadwal} jadwal</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{row.examDate} · {row.startTime.slice(0, 5)}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {row.adaFormId ? (row.soalDinilai || <span className="text-muted-foreground">-</span>) : <Badge variant="outline" className="gap-1 text-amber-600"><TriangleAlert className="size-3" />tanpa Form ID</Badge>}
                </TableCell>
                <TableCell className="text-center tabular-nums">{row.respons}</TableCell>
                <TableCell className="text-center tabular-nums">{row.rataRata === null ? "-" : row.rataRata.toFixed(1)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="icon-sm" disabled={!row.adaFormId || pendingId === row.id} onClick={() => handleSync(row)} title="Sync hasil">
                      {pendingId === row.id ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      <span className="sr-only">Sync hasil</span>
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled={!row.respons || pendingId === row.id} onClick={() => handleDetail(row)} title="Rincian jawaban">
                      <FileSearch className="size-4" />
                      <span className="sr-only">Rincian jawaban</span>
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled={!row.respons || pendingId === row.id} onClick={() => handleAnalisis(row)} title="Analisis butir soal">
                      <ChartColumn className="size-4" />
                      <span className="sr-only">Analisis butir soal</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AnalisisButirDialog open={butirOpen} onOpenChange={setButirOpen} judul={butirJudul} butir={butir} />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Rincian jawaban — {detail?.judul}</DialogTitle>
            <DialogDescription>Kelas {detail?.kelas}. ✓ benar, ✗ salah, — tidak dijawab.</DialogDescription>
          </DialogHeader>
          {detail && !detail.adaSoal && (
            <p className="text-sm text-muted-foreground">Form belum punya kunci jawaban. Aktifkan mode kuis di Google Form lalu sync ulang.</p>
          )}
          {detail && detail.adaSoal && (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Siswa</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead className="whitespace-nowrap">Kirim</TableHead>
                    {detail.soal.map((s, i) => <TableHead key={s.qid} className="text-center">{i + 1}</TableHead>)}
                    <TableHead className="text-center">Benar</TableHead>
                    <TableHead className="text-center">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.siswa.map((s) => (
                    <TableRow key={s.nis}>
                      <TableCell className="whitespace-nowrap font-medium">{s.nama}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">{s.nis}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{s.submit || s.mulai}</TableCell>
                      {detail.soal.map((q) => {
                        const v = s.sel[q.qid]
                        return (
                          <TableCell key={q.qid} className="text-center">
                            {v === "benar" ? <span className="text-emerald-600">✓</span> : v === "salah" ? <span className="text-destructive">✗</span> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center tabular-nums">{s.benar}/{s.total}</TableCell>
                      <TableCell className="text-center font-semibold tabular-nums">{s.skor.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
