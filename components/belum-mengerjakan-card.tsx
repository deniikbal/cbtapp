"use client"

import { useState, useTransition } from "react"
import { Download, Loader2, UserX } from "lucide-react"

import { ambilBelumMengerjakanAction } from "@/app/dashboard/hasil/belum-actions"
import type { BelumMengerjakan } from "@/lib/belum-mengerjakan"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type BankPilihan = { bankId: string; code: string; title: string }

export function BelumMengerjakanCard({ banks, defaultBankId }: { banks: BankPilihan[]; defaultBankId: string }) {
  const [bankId, setBankId] = useState(defaultBankId)
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<BelumMengerjakan | null>(null)
  const [pending, start] = useTransition()

  const bankTerpilih = banks.find((b) => b.bankId === bankId)

  const buka = () => {
    setOpen(true)
    setData(null)
    start(async () => setData(await ambilBelumMengerjakanAction(bankId)))
  }

  const gantiBank = (nilai: string) => {
    setBankId(nilai)
    setData(null)
    start(async () => setData(await ambilBelumMengerjakanAction(nilai)))
  }

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="size-4 text-muted-foreground" aria-hidden="true" />
          Peserta belum mengerjakan
        </CardTitle>
        <CardDescription>Daftar siswa aktif yang belum punya respons Google Form untuk bank soal terpilih.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={bankId} onValueChange={(value) => gantiBank(value ?? bankId)}>
          <SelectTrigger className="w-full sm:max-w-md">
            <SelectValue>
              {bankTerpilih ? `${bankTerpilih.code} — ${bankTerpilih.title}` : "Pilih bank soal"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {banks.map((b) => (
              <SelectItem key={b.bankId} value={b.bankId}>{b.code} — {b.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={buka} disabled={!bankId}>
          <UserX className="size-4" aria-hidden="true" />
          Lihat yang belum mengerjakan
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Peserta belum mengerjakan</DialogTitle>
            <DialogDescription>{bankTerpilih ? `${bankTerpilih.title} (${bankTerpilih.code})` : "-"}</DialogDescription>
          </DialogHeader>

          {pending && !data ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Memuat data siswa…
            </div>
          ) : !data ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Ringkas label="Peserta" nilai={data.total} />
                <Ringkas label="Sudah" nilai={data.sudah} />
                <Ringkas label="Belum" nilai={data.belum} />
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {data.kelas.length} kelas · {data.belum} siswa belum mengerjakan
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={data.belum === 0}
                  render={<a href={`/api/hasil/belum-mengerjakan/pdf?bankId=${bankId}`} target="_blank" rel="noreferrer" />}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Unduh PDF
                </Button>
              </div>

              <div className="max-h-[55vh] overflow-auto rounded-lg border">
                {data.kelas.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Tidak ada peserta pada bank soal ini.</p>
                ) : (
                  data.kelas.map((k) => (
                    <section key={`${k.kelas}|${k.sesi}`} className="border-b last:border-b-0">
                      <header className="sticky top-0 flex items-center justify-between gap-2 bg-muted/70 px-3 py-2 backdrop-blur">
                        <span className="text-sm font-medium">Kelas {k.kelas} · Sesi {k.sesi}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {k.belum.length} dari {k.peserta} belum
                        </span>
                      </header>
                      {k.belum.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-lime-700 dark:text-lime-300">Semua siswa kelas ini sudah mengerjakan.</p>
                      ) : (
                        <ul className="divide-y">
                          {k.belum.map((s, i) => (
                            <li key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                              <span className="min-w-0 flex-1 truncate">{s.nama}</span>
                              <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.nis || "-"}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function Ringkas({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{nilai.toLocaleString("id-ID")}</p>
    </div>
  )
}
