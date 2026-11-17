"use client"

import { FileDown } from "lucide-react"

import type { AnalisisBank } from "@/lib/analisis-data"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const baik = "gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
const sedang = "gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
const buruk = "gap-1 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"

const n = (angka: number, desimal = 3) => (Number.isInteger(angka) ? String(angka) : angka.toFixed(desimal))

function Judul({ children, kanan }: { children: React.ReactNode; kanan?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
      {kanan}
    </div>
  )
}

export function AnalisisButirDialog({
  open,
  onOpenChange,
  judul,
  data,
  bankId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  judul: string
  data: AnalisisBank | null
  bankId?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Laporan analisis butir soal — {judul}</DialogTitle>
          <DialogDescription className="text-[11px]">
            Disusun seperti laporan cetak: identitas, ketuntasan, data siswa, statistik butir, dan distribusi jawaban.
          </DialogDescription>
          {bankId ? (
            <a
              href={`/api/analisis-butir/pdf?bankId=${encodeURIComponent(bankId)}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-1 h-7 w-fit gap-1 px-2 text-[11px]" })}
            >
              <FileDown className="size-3.5" /> Unduh PDF
            </a>
          ) : null}
        </DialogHeader>

        {!data ? (
          <p className="text-sm text-muted-foreground">Menyiapkan laporan…</p>
        ) : (
          <div className="max-h-[72vh] space-y-4 overflow-auto pr-1 text-xs">
            {/* ── Identitas laporan */}
            <section className="rounded-lg border">
              <dl className="grid gap-x-4 gap-y-1 px-3 py-2 sm:grid-cols-2">
                {(
                  [
                    ["Nama sekolah", data.identitas.sekolah],
                    ["Mata pelajaran", data.identitas.mataPelajaran],
                    ["Nama tes", data.identitas.namaTes || "-"],
                    ["Tanggal tes", data.identitas.tanggalTes || "-"],
                    ["Tahun pelajaran", data.identitas.tahunPelajaran || "-"],
                    ["Semester", data.identitas.semester || "-"],
                    ["Kelas", data.identitas.kelas],
                    ["KKM", String(data.identitas.kkm)],
                    ["Jumlah soal", String(data.identitas.jumlahSoal)],
                    ["Jumlah opsi", String(data.identitas.jumlahOpsi)],
                    ["Jumlah siswa", String(data.identitas.jumlahSiswa)],
                    ["Guru mata pelajaran", data.identitas.guru],
                    ["Kunci jawaban", data.identitas.kunci],
                    ["Kode bank soal", `${data.identitas.kode} · ${data.identitas.tingkat}`],
                  ] as [string, string][]
                ).map(([label, nilai]) => (
                  <div key={label} className="flex justify-between gap-2 border-b border-dashed py-0.5 last:border-0">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="truncate text-right font-medium">{nilai}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* ── Ketuntasan */}
            <section className="rounded-lg border px-3 py-2">
              <Judul>Ketuntasan</Judul>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                <Badge className={baik}>
                  {data.ketuntasan.tuntas} Tuntas ({n(data.ketuntasan.persenTuntas, 1)}%)
                </Badge>
                <Badge className={buruk}>
                  {data.ketuntasan.belum} Belum Tuntas ({n(data.ketuntasan.persenBelum, 1)}%)
                </Badge>
                <span className="text-muted-foreground">KKM {data.identitas.kkm}</span>
              </div>
            </section>

            {/* ── Data siswa */}
            <section className="space-y-1">
              <Judul>Data siswa</Judul>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-muted/70 backdrop-blur">
                    <tr className="[&>th]:px-2 [&>th]:py-1 [&>th]:text-left [&>th]:font-medium">
                      <th className="w-8">No</th>
                      <th>Nama</th>
                      <th className="w-24">Kelas</th>
                      <th>Rincian</th>
                      <th className="w-8 text-center">B</th>
                      <th className="w-8 text-center">S</th>
                      <th className="w-10 text-right">Skor</th>
                      <th className="w-12 text-right">Nilai</th>
                      <th className="w-24">Ket.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.siswa.map((s) => (
                      <tr key={`${s.no}-${s.nama}`} className="border-t [&>td]:px-2 [&>td]:py-0.5">
                        <td className="tabular-nums text-muted-foreground">{s.no}</td>
                        <td className="truncate">{s.nama}</td>
                        <td className="truncate text-muted-foreground">{s.kelas}</td>
                        <td className="font-mono text-[10px] tracking-tight">{s.rincian}</td>
                        <td className="text-center tabular-nums">{s.benar}</td>
                        <td className="text-center tabular-nums text-muted-foreground">{s.salah}</td>
                        <td className="text-right tabular-nums">{s.skor}</td>
                        <td className="text-right tabular-nums">{n(s.nilai, 1)}</td>
                        <td>
                          <span className={s.ket === "Tuntas" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {s.ket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Statistik skor & nilai */}
            <section className="space-y-1">
              <Judul>Statistik skor dan nilai</Judul>
              <table className="w-full rounded-lg border text-[11px] [&>tbody>tr>td]:px-2 [&>tbody>tr>td]:py-1 [&>tbody>tr>th]:px-2 [&>tbody>tr>th]:py-1">
                <thead className="bg-muted/60">
                  <tr className="[&>th]:text-right [&>th]:font-medium">
                    <th className="text-left">Ukuran</th>
                    <th>Jumlah</th>
                    <th>Terkecil</th>
                    <th>Terbesar</th>
                    <th>Rata-rata</th>
                    <th>Simpangan baku</th>
                  </tr>
                </thead>
                <tbody className="[&>td]:tabular-nums">
                  <tr className="border-t">
                    <td className="font-medium">SKOR</td>
                    <td className="text-right tabular-nums">{n(data.statistik.skor.jumlah, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.skor.terkecil, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.skor.terbesar, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.skor.rataRata, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.skor.simpanganBaku, 2)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="font-medium">NILAI</td>
                    <td className="text-right tabular-nums">{n(data.statistik.nilai.jumlah, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.nilai.terkecil, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.nilai.terbesar, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.nilai.rataRata, 2)}</td>
                    <td className="text-right tabular-nums">{n(data.statistik.nilai.simpanganBaku, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* ── Statistik butir */}
            <section className="space-y-1">
              <Judul kanan={<span className="text-[10px] text-muted-foreground">{data.ringkasan.respons} respons · {data.butir.length} butir</span>}>
                Statistik butir soal
              </Judul>
              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/60">
                    <tr className="[&>th]:px-1.5 [&>th]:py-1 [&>th]:font-medium">
                      <th>No</th>
                      <th>Prop.Cor</th>
                      <th>D.Beda</th>
                      <th>T.Kesukaran</th>
                      <th>Pt.Biser</th>
                      <th>Biser</th>
                      <th>Kunci</th>
                      <th className="text-left">Efek opsi</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.butir.map((b, i) => (
                      <tr key={b.qid} className="border-t [&>td]:px-1.5 [&>td]:py-0.5">
                        <td className="text-center tabular-nums">{i + 1}</td>
                        <td className="text-center tabular-nums">{n(b.kesukaran)}</td>
                        <td className="text-center tabular-nums">{n(b.dayaBeda, 2)}</td>
                        <td className="text-center">
                          <Badge className={b.kesukaranLabel === "Sedang" ? baik : sedang} variant="secondary">
                            {b.kesukaranLabel}
                          </Badge>
                        </td>
                        <td className="text-center tabular-nums">{n(b.ptBiser)}</td>
                        <td className="text-center tabular-nums">{n(b.biser)}</td>
                        <td className="text-center font-medium">{b.opsiDetail.find((o) => o.kunci)?.label ?? "?"}</td>
                        <td className="truncate text-muted-foreground">{b.efekOpsi}</td>
                        <td>
                          <Badge className={b.status === "Soal Baik" ? baik : sedang} variant="secondary">
                            {b.status === "Soal Baik" ? "Baik" : "Revisi"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Distribusi jawaban */}
            <section className="space-y-1">
              <Judul kanan={<span className="text-[10px] text-muted-foreground">✓ kunci jawaban</span>}>Distribusi jawaban</Judul>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {data.butir.map((b, i) => (
                  <div key={b.qid} className="rounded-lg border px-2 py-1.5">
                    <p className="truncate text-[10px] font-medium text-muted-foreground">
                      Soal {i + 1}. {b.judul || "(tanpa judul)"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                      {(b.opsiDetail.length
                        ? b.opsiDetail.map((o) => ({ label: o.label, jumlah: o.jumlah, persen: o.proporsi * 100, kunci: o.kunci }))
                        : b.sebaran.map((s) => ({ label: s.jawaban, jumlah: s.jumlah, persen: s.persen, kunci: s.kunci }))
                      ).map((o) => (
                        <span
                          key={o.label}
                          className={
                            o.kunci
                              ? "rounded bg-emerald-100 px-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                              : "rounded px-1 text-muted-foreground"
                          }
                        >
                          {o.label} {o.jumlah} ({n(o.persen, 1)}%){o.kunci ? " ✓" : ""}
                        </span>
                      ))}
                      {b.kosong > 0 ? <span className="px-1 text-amber-600">kosong {b.kosong}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Rekomendasi */}
            <section className="rounded-lg border bg-muted/30 px-3 py-2">
              <Judul>Rekomendasi</Judul>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {(() => {
                  const revisi = data.butir.map((b, i) => ({ b, no: i + 1 })).filter((x) => x.b.status === "Soal Perlu Direvisi")
                  return revisi.length
                    ? `Butir yang perlu direvisi: ${revisi.map((x) => x.no).join(", ")}. Perbaiki butir dengan kesukaran ekstrem, daya beda rendah, atau pengecoh yang tidak berfungsi sebelum dipakai lagi.`
                    : "Semua butir berada pada rentang kesukaran dan daya beda yang wajar."
                })()}
              </p>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
