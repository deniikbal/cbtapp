"use client"

import { FileDown } from "lucide-react"

import type { AnalisisButir } from "@/lib/analisis-butir"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function rupiah(n: number, desimal = 4) {
  return Number.isInteger(n) ? String(n) : n.toFixed(desimal).replace(/0+$/, "").replace(/\.$/, "")
}

const baikStyle = "gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
const sedangStyle = "gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"

export function AnalisisButirDialog({
  open,
  onOpenChange,
  judul,
  butir,
  bankId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  judul: string
  butir: AnalisisButir[]
  bankId?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Analisis butir soal — {judul}</DialogTitle>
          <DialogDescription>
            Dihitung dari respons Google Form yang sudah di-sync: {butir[0]?.dikerjakan ?? 0} pengerjaan, {butir.length} butir dinilai.
          </DialogDescription>
          {bankId ? (
            <a
              href={`/api/analisis-butir/pdf?bankId=${encodeURIComponent(bankId)}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-1 w-fit gap-1 text-xs" })}
            >
              <FileDown className="size-3.5" /> Unduh PDF
            </a>
          ) : null}
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-auto pr-1">
          {butir.map((b, i) => (
            <div key={b.qid} className="rounded-lg border">
              <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-3 py-2">
                <p className="text-sm font-medium">
                  Soal {i + 1} — <span className="font-normal text-muted-foreground">{b.judul || "(tanpa judul)"}</span>
                </p>
                <Badge variant="secondary" className="shrink-0 font-normal">{b.benarPersen.toLocaleString("id-ID")}% benar</Badge>
              </div>
              <dl className="divide-y text-sm">
                <Baris label="Dikerjakan" nilai={`${b.dikerjakan} kali`} />
                <Baris label="Kosong" nilai={String(b.kosong)} />
                <Baris label="Benar" nilai={`${b.benar} [${b.benarPersen.toLocaleString("id-ID")}%]`} sorot />
                <Baris label="Salah" nilai={String(b.salah)} />
                <Baris label="Rata-rata point" nilai={rupiah(b.rataPoin)} sorot />
                <Baris label="Point tertinggi" nilai={rupiah(b.poinTertinggi)} />
                <Baris label="Point terendah" nilai={rupiah(b.poinTerendah)} />
                <Baris label="Standard deviasi" nilai={rupiah(b.standarDeviasi, 6)} />
                <Baris
                  label="Kesukaran"
                  nilai={
                    <span className="flex items-center justify-center gap-2 sm:justify-end">
                      <span className="tabular-nums">{rupiah(b.kesukaran)}</span>
                      <Badge className={b.kesukaranLabel === "Sukar" ? sedangStyle : baikStyle}>{b.kesukaranLabel}</Badge>
                    </span>
                  }
                />
                <Baris
                  label="Daya beda"
                  nilai={
                    <span className="flex items-center justify-center gap-2 sm:justify-end">
                      <span className="tabular-nums">{rupiah(b.dayaBeda)}</span>
                      <Badge className={b.dayaBedaLabel === "Jelek" || b.dayaBedaLabel === "Cukup" ? sedangStyle : baikStyle}>{b.dayaBedaLabel}</Badge>
                    </span>
                  }
                />
                <Baris
                  label="Distraksi"
                  nilai={
                    <span className="flex items-center justify-center gap-2 sm:justify-end">
                      <span className="tabular-nums">Maks {b.distraksiMaks}</span>
                      <Badge className={b.distraksiLabel === "Baik" ? baikStyle : sedangStyle}>{b.distraksiLabel}</Badge>
                    </span>
                  }
                />
                <Baris label="Sebaran benar" nilai={`${b.sebaran.find((s) => s.kunci)?.persen.toLocaleString("id-ID") ?? 0}%`} />
              </dl>
              {b.sebaran.length ? (
                <div className="space-y-1 border-t px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sebaran jawaban</p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {b.sebaran.map((s) => (
                      <li key={s.jawaban} className="flex items-center justify-between gap-2 text-xs">
                        <span className={s.kunci ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                          {s.jawaban}
                          {s.kunci ? " (kunci)" : ""}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {s.jumlah} · {s.persen.toLocaleString("id-ID")}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="border-t bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">{b.catatan}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Baris({ label, nilai, sorot }: { label: string; nilai: React.ReactNode; sorot?: boolean }) {
  return (
    <div className={sorot ? "grid grid-cols-2 gap-3 bg-amber-50 px-3 py-1.5 dark:bg-amber-500/10" : "grid grid-cols-2 gap-3 px-3 py-1.5"}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{nilai}</dd>
    </div>
  )
}
