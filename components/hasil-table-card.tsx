"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { FileSearch, Loader2, RefreshCw, TriangleAlert } from "lucide-react"

import { getHasilDetail, syncHasil, type HasilDetail } from "@/app/dashboard/hasil/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type HasilRow = {
  id: string
  title: string
  code: string
  className: string
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
  const [, startTransition] = useTransition()

  function handleSync(row: HasilRow) {
    setPendingId(row.id)
    startTransition(async () => {
      try {
        const info = await syncHasil(row.id)
        toast.success(`${info.cocok} respons tercatat, ${info.tidakCocok} tidak cocok NIS, ${info.totalSoal} soal dinilai.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal sync hasil.")
      } finally {
        setPendingId(null)
      }
    })
  }

  function handleDetail(row: HasilRow) {
    setPendingId(row.id)
    startTransition(async () => {
      try {
        setDetail(await getHasilDetail(row.id))
        setDetailOpen(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mengambil rincian.")
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hasil Ujian dari Google Form</CardTitle>
        <CardDescription>Sync menarik respons Google Form, mencocokkan NIS, lalu menghitung nilai dari kunci jawaban form.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank Soal</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Jadwal</TableHead>
              <TableHead className="text-center">Soal Dinilai</TableHead>
              <TableHead className="text-center">Respons</TableHead>
              <TableHead className="text-center">Rata-rata</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Belum ada jadwal ujian.</TableCell>
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
                <TableCell>{row.className}</TableCell>
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

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
