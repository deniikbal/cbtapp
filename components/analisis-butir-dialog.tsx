"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, FileDown, Gift, HeartHandshake, Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { aksesGratisPdf, konfirmasiSudahBayar, mintaDukunganPdf } from "@/app/guru/dashboard/actions"

import type { AnalisisBank } from "@/lib/analisis-data"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const baik = "gap-1 bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-400"
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
  akses,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  judul: string
  data: AnalisisBank | null
  bankId?: string
  /** Status akses unduh PDF; undefined = admin (bebas unduh). */
  akses?: { status: string; nominal: number; waAdmin: string; qris: string; punyaQris: boolean }
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-2 overflow-hidden p-4 sm:max-w-5xl">
        <DialogHeader className="shrink-0 gap-1">
          <DialogTitle className="text-sm">Laporan analisis butir soal: {judul}</DialogTitle>
          <DialogDescription className="text-[11px]">
            Disusun seperti laporan cetak: identitas, ketuntasan, data siswa, statistik butir, dan distribusi jawaban.
          </DialogDescription>
          {bankId && akses ? <PanelUnduh bankId={bankId} akses={akses} /> : null}
        </DialogHeader>

        {!data ? (
          <p className="text-sm text-muted-foreground">Menyiapkan laporan…</p>
        ) : (
          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 text-xs">
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
                          <span className={s.ket === "Tuntas" ? "text-lime-600 dark:text-lime-400" : "text-rose-600 dark:text-rose-400"}>
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
                              ? "rounded bg-lime-100 px-1 font-medium text-lime-700 dark:bg-lime-500/15 dark:text-lime-400"
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

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID")
}

function PanelUnduh({
  bankId,
  akses,
}: {
  bankId: string
  akses: { status: string; nominal: number; waAdmin: string; qris: string; punyaQris: boolean }
}) {
  const [status, setStatus] = useState(akses.status)
  const [nominal, setNominal] = useState(akses.nominal)
  const [qris, setQris] = useState(akses.qris)
  const [pilihLain, setPilihLain] = useState(false)
  const [custom, setCustom] = useState("")
  const [pending, startTransition] = useTransition()

  function dukung(dasar: number) {
    startTransition(async () => {
      const hasil = await mintaDukunganPdf(dasar)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message)
      setNominal(hasil.nominal)
      setQris(hasil.qris)
      setStatus("menunggu")
    })
  }

  function dukungCustom() {
    const angka = Number(custom.replace(/[^\d]/g, ""))
    if (!Number.isInteger(angka) || angka < 1) {
      toast.error("Nominal dukungan minimal Rp1.")
      return
    }
    dukung(angka)
  }

  function gratis() {
    startTransition(async () => {
      const hasil = await aksesGratisPdf()
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message)
      setStatus("aktif")
    })
  }

  if (status === "aktif") {
    return (
      <a
        href={`/api/analisis-butir/pdf?bankId=${encodeURIComponent(bankId)}`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "mt-1 h-11 w-fit gap-1 px-3 text-xs sm:h-7 sm:px-2 sm:text-[11px]" })}
      >
        <FileDown className="size-3.5" aria-hidden="true" /> Unduh PDF
      </a>
    )
  }

  // Sudah memilih nominal: tampilkan QR dan menunggu verifikasi admin.
  if (status === "menunggu" && nominal > 0) {
    const langkah = ["Scan QRIS dan bayar sesuai nominal.", "Kirim bukti bayar ke WA admin.", "Admin mengaktifkan akses Anda."]
    return (
      <div className="mt-2 overflow-hidden rounded-xl border bg-muted/20">
        <div className="flex flex-col gap-3 p-3 sm:flex-row">
          <div className="shrink-0 self-center sm:self-start">
            {qris ? (
              <a
                href={qris}
                target="_blank"
                rel="noreferrer"
                className="block w-40 rounded-lg border bg-white p-2 shadow-sm transition hover:shadow-md"
                title="Buka QRIS ukuran penuh"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qris} alt="QRIS dukungan" className="h-auto w-full object-contain" />
                <span className="mt-1 block text-center text-[10px] text-muted-foreground">Klik untuk perbesar</span>
              </a>
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed bg-muted/40 px-2 text-center text-[10px] leading-tight text-muted-foreground">
                QRIS belum diatur admin
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Dukung pengembangan
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Terima kasih. Bayar tepat nominal di bawah, lalu tunggu verifikasi.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-1 text-sm font-semibold tabular-nums text-primary-foreground">
                {rupiah(nominal)}
              </span>
              <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" variant="secondary">
                Menunggu verifikasi
              </Badge>
            </div>

            <ol className="space-y-0.5 text-[11px] text-muted-foreground">
              {langkah.map((l, i) => (
                <li key={l} className="flex gap-1.5">
                  <span className="mt-[1px] flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-foreground">
                    {i + 1}
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {akses.waAdmin ? (
                <a
                  href={`https://wa.me/${akses.waAdmin}?text=${encodeURIComponent("Bukti dukungan PDF analisis butir CBT")}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 gap-1 px-3 text-xs sm:h-7 sm:px-2 sm:text-[11px]" })}
                >
                  <MessageCircle className="size-3.5" aria-hidden="true" /> Kirim bukti via WA
                </a>
              ) : null}
              <Button
                size="sm"
                className="h-11 gap-1 px-3 text-xs sm:h-7 sm:px-2 sm:text-[11px]"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const hasil = await konfirmasiSudahBayar()
                    if (!hasil.ok) toast.error(hasil.message)
                    else toast.success(hasil.message)
                  })
                }
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                Saya sudah bayar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-11 px-3 text-xs text-muted-foreground sm:h-7 sm:px-2 sm:text-[11px]"
                disabled={pending}
                onClick={() => setStatus("belum")}
              >
                Ganti nominal
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Belum memilih: tawarkan akses gratis atau dukungan sukarela.
  const saran = [2000, 5000, 10000]
  return (
    <div className="mt-2 overflow-hidden rounded-xl border bg-muted/20">
      <div className="space-y-3 p-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Unduh PDF analisis butir
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Gratis untuk Bapak/Ibu. Jika berkenan, dukung pengembangan aplikasi seikhlasnya.
          </p>
          {status === "ditolak" ? (
            <Badge className="mt-1.5 gap-1 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" variant="secondary">
              Pengajuan sebelumnya ditolak
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium">Dukung seikhlasnya</p>
          <div className="flex flex-wrap gap-1.5">
            {saran.map((n) => (
              <Button
                key={n}
                size="sm"
                variant="outline"
                className="h-11 gap-1 px-3 text-xs tabular-nums sm:h-8 sm:text-[11px]"
                disabled={pending}
                onClick={() => dukung(n)}
              >
                <HeartHandshake className="size-3.5" aria-hidden="true" /> {rupiah(n)}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-11 px-3 text-xs sm:h-8 sm:text-[11px]"
              disabled={pending}
              onClick={() => setPilihLain((v) => !v)}
            >
              Nominal lain
            </Button>
          </div>
          {pilihLain ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Input
                inputMode="numeric"
                placeholder="Contoh: 3000"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-11 w-36 rounded-sm text-xs sm:h-8"
                aria-label="Nominal dukungan lain"
              />
              <Button size="sm" className="h-11 px-3 text-xs sm:h-8 sm:text-[11px]" disabled={pending} onClick={dukungCustom}>
                {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                Buat QR
              </Button>
            </div>
          ) : null}
          {!akses.punyaQris ? (
            <p className="text-[10px] text-muted-foreground">QRIS belum diatur admin. Anda tetap bisa memakai akses gratis.</p>
          ) : null}
        </div>

        <div className="border-t pt-2.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-11 gap-1 px-3 text-xs sm:h-8 sm:text-[11px]"
            disabled={pending}
            onClick={gratis}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Gift className="size-3.5" aria-hidden="true" />}
            Akses gratis, lewati pembayaran
          </Button>
        </div>
      </div>
    </div>
  )
}
