"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  FileUp,
  Keyboard,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import {
  daftarSoalForm,
  hapusSoal,
  imporSoalTeks,
  pratinjauSoalTeks,
  rapikanSoalTeks,
  tambahSoal,
  ubahSoal,
} from "@/app/actions/impor-soal"
import { AksiIkon } from "@/components/aksi-ikon"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { SoalImpor } from "@/lib/impor-docx"

type SoalForm = { no: number; qid: string; pertanyaan: string; opsi: string[]; kunci: string }
type Isian = { pertanyaan: string; opsi: string[]; hurufKunci: string }

const HURUF = "ABCDE"
const OPSI_KOSONG = ["", "", "", "", ""]

const kunciTeks = (teks: string) => teks.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

const indeksKunci = (kunci: string) => HURUF.indexOf((kunci || "").toUpperCase())

const CONTOH = `1. Hasil dari 12 x 2 adalah ...
12
18
24
30
36
Kunci: C`

/** Kolom 1 mode tempel teks: textarea + AI + pratinjau + tombol masukkan. */
function PanelTeks({
  bankId,
  tersimpan,
  onSelesai,
}: {
  bankId: string
  tersimpan: SoalForm[]
  onSelesai: (soal: SoalForm[], pesan: string) => void
}) {
  const [teks, setTeks] = useState("")
  const [soal, setSoal] = useState<SoalImpor[] | null>(null)
  const [peringatan, setPeringatan] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [merapikan, startMerapikan] = useTransition()

  function periksa() {
    setError(null)
    startTransition(async () => {
      const hasil = await pratinjauSoalTeks(teks)
      if (!hasil.ok) {
        setSoal(null)
        setError(hasil.message)
        return
      }
      setSoal(hasil.soal)
      setPeringatan(hasil.peringatan)
    })
  }

  function rapikan() {
    startMerapikan(async () => {
      const hasil = await rapikanSoalTeks(teks)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      setTeks(hasil.teks)
      setSoal(null)
      setPeringatan([])
      setError(null)
      toast.success(hasil.cara === "ai" ? "Soal dirapikan oleh AI." : hasil.catatan ?? "Soal dirapikan.")
    })
  }

  function simpan() {
    startTransition(async () => {
      const hasil = await imporSoalTeks(bankId, teks)
      if (!hasil.ok) {
        setError(hasil.message)
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message)
      setTeks("")
      setSoal(null)
      setPeringatan([])
      const terbaru = await daftarSoalForm(bankId)
      onSelesai(terbaru.ok ? terbaru.soal : tersimpan, hasil.message)
    })
  }

  const siap = (soal ?? []).filter((s) => s.opsi.length >= 2 && s.kunci).length

  return (
    <Card className="gap-0 rounded-sm py-0">
      <CardHeader className="gap-1 border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-muted-foreground" />
          Tempel teks soal
        </CardTitle>
        <CardDescription className="text-[11px]">
          Satu soal = pertanyaan, lalu baris-baris opsi, lalu baris <span className="font-mono">Kunci: C</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <Textarea
          value={teks}
          onChange={(e) => {
            setTeks(e.target.value)
            setSoal(null)
            setError(null)
          }}
          placeholder={CONTOH}
          className="min-h-[380px] rounded-sm font-mono text-xs lg:min-h-[460px]"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-11 gap-2 rounded-sm sm:h-8"
            onClick={rapikan}
            disabled={merapikan || pending || teks.trim().length === 0}
          >
            {merapikan ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Rapikan dengan AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 gap-2 rounded-sm sm:h-8"
            onClick={periksa}
            disabled={pending || merapikan || teks.trim().length === 0}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Periksa format
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" className="rounded-sm px-3 py-2">
            <TriangleAlert />
            <AlertTitle className="text-xs">Gagal membaca soal</AlertTitle>
            <AlertDescription className="text-[11px]">{error}</AlertDescription>
          </Alert>
        ) : null}

        {soal ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Hasil pembacaan</span>
              <Badge variant="secondary" className="rounded-sm font-normal">
                {soal.length} soal terbaca · {siap} siap
              </Badge>
            </div>
            <ScrollArea className="h-64 rounded-sm border border-border">
              <ul className="divide-y divide-border">
                {soal.map((s) => {
                  const duplikat = tersimpan.some((t) => kunciTeks(t.pertanyaan) === kunciTeks(s.pertanyaan))
                  return (
                    <li key={s.no} className="flex items-start gap-2 px-2 py-1.5">
                      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{s.no}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">{s.pertanyaan}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.opsi.length} opsi · kunci {s.kunci ? s.kunci.toUpperCase() : "belum ada"}
                          {s.opsi[s.kunci.charCodeAt(0) - 97] ? ` (${s.opsi[s.kunci.charCodeAt(0) - 97]})` : ""}
                        </p>
                      </div>
                      {duplikat ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm font-normal text-muted-foreground"
                          title="Soal dengan isi sama sudah ada di form — tidak ditambahkan lagi"
                        >
                          sudah ada
                        </Badge>
                      ) : s.opsi.length >= 2 && s.kunci ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm font-normal text-emerald-700 dark:text-emerald-400"
                        >
                          siap
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm font-normal text-amber-700 dark:text-amber-400"
                        >
                          belum lengkap
                        </Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
              <ScrollBar />
            </ScrollArea>

            {peringatan.length ? (
              <Alert className="rounded-sm border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-950/40">
                <TriangleAlert className="text-amber-700 dark:text-amber-400" />
                <AlertTitle className="text-xs text-amber-900 dark:text-amber-200">Catatan pembacaan</AlertTitle>
                <AlertDescription className="text-[11px] text-amber-900 dark:text-amber-200/90">
                  <ul className="list-disc space-y-0.5 pl-3">
                    {peringatan.slice(0, 6).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                    {peringatan.length > 6 ? <li>… {peringatan.length - 6} catatan lain</li> : null}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : null}

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Kunci boleh huruf (<span className="font-mono">Kunci: C</span>) atau teks opsinya.
          </p>
          <Button size="sm" className="h-11 gap-2 rounded-sm sm:h-8" onClick={simpan} disabled={pending || siap === 0}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Masukkan {siap || ""} soal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Kolom 1 mode input manual: form soal langsung isi opsi + kunci. */
function PanelManual({ onTambah }: { onTambah: (data: Isian) => Promise<boolean> }) {
  const [pertanyaan, setPertanyaan] = useState("")
  const [opsi, setOpsi] = useState<string[]>(OPSI_KOSONG)
  const [kunci, setKunci] = useState("")
  const [proses, setProses] = useState(false)

  async function kirim() {
    setProses(true)
    const ok = await onTambah({ pertanyaan, opsi, hurufKunci: kunci })
    setProses(false)
    if (ok) {
      setPertanyaan("")
      setOpsi(OPSI_KOSONG)
      setKunci("")
    }
  }

  return (
    <Card className="gap-0 rounded-sm py-0">
      <CardHeader className="gap-1 border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Keyboard className="size-4 text-muted-foreground" />
          Form soal baru
        </CardTitle>
        <CardDescription className="text-[11px]">
          Ketik pertanyaan, isi opsi, tandai kunci. Simpan langsung masuk ke Google Form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">Pertanyaan</label>
          <Textarea
            value={pertanyaan}
            onChange={(e) => setPertanyaan(e.target.value)}
            placeholder="Tulis pertanyaan soal di sini…"
            className="min-h-24 rounded-sm text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Opsi jawaban</label>
          {opsi.map((o, i) => {
            const aktif = kunci.toUpperCase() === HURUF[i]
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!o.trim()}
                  onClick={() => setKunci(HURUF[i])}
                  title={o.trim() ? `Tandai ${HURUF[i]} sebagai kunci` : "Isi opsi dulu"}
                  className={`flex size-7 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] transition-colors disabled:opacity-40 ${
                    aktif
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {aktif ? <Check className="size-3.5" /> : HURUF[i]}
                </button>
                <Input
                  value={o}
                  onChange={(e) => {
                    const nilai = e.target.value
                    setOpsi((v) => v.map((x, j) => (j === i ? nilai : x)))
                    if (!nilai.trim() && aktif) setKunci("")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && o.trim()) {
                      e.preventDefault()
                      setKunci(HURUF[i])
                    }
                  }}
                  placeholder={`Opsi ${HURUF[i]}${i > 1 ? " (boleh dikosongkan)" : ""}`}
                  className="h-9 rounded-sm text-xs"
                />
              </div>
            )
          })}
          <p className="text-[11px] text-muted-foreground">
            Klik huruf A–E di kiri untuk menandai jawaban benar. Enter di kolom opsi juga menandai kunci.
          </p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {kunci ? (
              <>
                Kunci:{" "}
                <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                  {kunci.toUpperCase()}. {opsi[HURUF.indexOf(kunci.toUpperCase())] || "—"}
                </span>
              </>
            ) : (
              "Kunci jawaban belum ditandai"
            )}
          </span>
          <Button
            size="sm"
            className="h-11 gap-2 rounded-sm sm:h-8"
            onClick={kirim}
            disabled={proses || !pertanyaan.trim() || !kunci || opsi.filter((o) => o.trim()).length < 2}
          >
            {proses ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Tambah ke form
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Kolom 2: daftar soal yang sudah ada di form (collapse, opsi benar ditandai). */
function DaftarSoal({
  soal,
  onEdit,
  onHapus,
}: {
  soal: SoalForm[]
  onEdit: (s: SoalForm) => void
  onHapus: (s: SoalForm) => void
}) {
  return (
    <Card className="gap-0 rounded-sm py-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="space-y-1">
          <CardTitle className="text-sm">Soal di form</CardTitle>
          <CardDescription className="text-[11px]">Klik soal untuk melihat opsi &amp; kunci jawaban.</CardDescription>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-sm font-normal tabular-nums">
          {soal.length} soal
        </Badge>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {soal.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Belum ada soal di form. Tambah lewat form di sebelah kiri.
          </p>
        ) : (
          <ScrollArea className="max-h-[560px] rounded-sm border border-border">
            <Accordion>
              {soal.map((s) => {
                const idx = indeksKunci(s.kunci)
                return (
                  <AccordionItem key={s.qid || String(s.no)} value={String(s.no)}>
                    <AccordionTrigger className="items-center gap-2 px-3 py-2.5 text-xs hover:no-underline">
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                          {s.no}.
                        </span>
                        <span className="min-w-0 flex-1 truncate font-normal">{s.pertanyaan}</span>
                      </span>
                      {s.kunci ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm font-mono text-[11px] font-normal text-emerald-700 dark:text-emerald-400"
                        >
                          {s.kunci.toUpperCase()}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm text-[11px] font-normal text-amber-700 dark:text-amber-400"
                        >
                          tanpa kunci
                        </Badge>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="px-3">
                      <ul className="space-y-1">
                        {s.opsi.map((o, i) => {
                          const benar = i === idx
                          return (
                            <li
                              key={i}
                              className={`flex items-start gap-2 rounded-sm px-2 py-1 text-xs ${
                                benar ? "bg-emerald-50 font-medium dark:bg-emerald-950/40" : ""
                              }`}
                            >
                              <span
                                className={`w-4 shrink-0 font-mono text-[11px] ${
                                  benar ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                                }`}
                              >
                                {HURUF[i]}.
                              </span>
                              <span className="min-w-0 flex-1">{o}</span>
                              {benar ? (
                                <span className="flex shrink-0 items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                                  <Check className="size-3.5" />
                                  kunci
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                      <div className="mt-2 flex justify-end gap-1 border-t pt-2">
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-sm text-[11px]" onClick={() => onEdit(s)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 rounded-sm text-[11px] text-destructive hover:text-destructive"
                          onClick={() => onHapus(s)}
                        >
                          <Trash2 className="size-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
            <ScrollBar />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export function ImporSoalPage({
  bankId,
  kode,
  judul,
  mapel,
  formId,
  backHref,
  soalFormAwal,
}: {
  bankId: string
  kode: string
  judul: string
  mapel: string
  formId: string
  backHref: string
  soalFormAwal: SoalForm[]
}) {
  const [model, setModel] = useState<"manual" | "teks">("manual")
  const [tersimpan, setTersimpan] = useState<SoalForm[]>(soalFormAwal)
  const [edit, setEdit] = useState<{ qid: string; pertanyaan: string; opsi: string[]; kunci: string } | null>(null)
  const [hapus, setHapus] = useState<SoalForm | null>(null)
  const [sedangUbah, startUbah] = useTransition()

  function tambah(data: Isian) {
    return new Promise<boolean>((resolve) => {
      startUbah(async () => {
        const hasil = await tambahSoal(bankId, data)
        if (!hasil.ok) {
          toast.error(hasil.message)
          resolve(false)
          return
        }
        if (hasil.soal) setTersimpan(hasil.soal)
        toast.success(hasil.message)
        resolve(true)
      })
    })
  }

  function bukaEdit(s: SoalForm) {
    const opsi = [...s.opsi]
    while (opsi.length < 5) opsi.push("")
    setEdit({ qid: s.qid, pertanyaan: s.pertanyaan, opsi, kunci: s.kunci })
  }

  function simpanEdit() {
    if (!edit) return
    startUbah(async () => {
      const hasil = await ubahSoal(bankId, edit.qid, {
        pertanyaan: edit.pertanyaan,
        opsi: edit.opsi.filter((o) => o.trim()),
        hurufKunci: edit.kunci,
      })
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      if (hasil.soal) setTersimpan(hasil.soal)
      setEdit(null)
      toast.success(hasil.message)
    })
  }

  function konfirmasiHapus() {
    if (!hapus) return
    startUbah(async () => {
      const hasil = await hapusSoal(bankId, hapus.qid)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      if (hasil.soal) setTersimpan(hasil.soal)
      setHapus(null)
      toast.success(hasil.message)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/* Identitas bank soal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 rounded-sm">
            <AvatarFallback className="rounded-sm bg-primary/10 font-mono text-sm font-medium text-primary">
              {kode.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">Input Soal — {judul}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="rounded-sm font-mono font-normal">
                {kode}
              </Badge>
              <Badge variant="outline" className="rounded-sm font-normal">
                {mapel}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://docs.google.com/forms/d/${formId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 gap-2 rounded-sm sm:h-8" })}
          >
            <ExternalLink className="size-4" />
            Buka form
          </a>
          <Button variant="outline" size="sm" className="h-11 gap-2 rounded-sm sm:h-8" render={<Link href={backHref} />}>
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
        </div>
      </div>

      <Tabs value={model} onValueChange={(v) => setModel(v as "manual" | "teks")} className="flex flex-col gap-4">
        <TabsList className="h-9 w-fit">
          <TabsTrigger value="manual" className="gap-1.5">
            <Keyboard data-icon="inline-start" />
            Input manual
          </TabsTrigger>
          <TabsTrigger value="teks" className="gap-1.5">
            <FileText data-icon="inline-start" />
            Tempel teks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelManual onTambah={tambah} />
            <DaftarSoal soal={tersimpan} onEdit={bukaEdit} onHapus={setHapus} />
          </div>
        </TabsContent>

        <TabsContent value="teks">
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelTeks
              bankId={bankId}
              tersimpan={tersimpan}
              onSelesai={(soal) => setTersimpan(soal)}
            />
            <DaftarSoal soal={tersimpan} onEdit={bukaEdit} onHapus={setHapus} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog edit soal */}
      <Dialog open={Boolean(edit)} onOpenChange={(buka) => !buka && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit soal</DialogTitle>
            <DialogDescription>Ubah pertanyaan, opsi, atau kunci. Perubahan langsung ke Google Form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Pertanyaan</label>
              <Textarea
                value={edit?.pertanyaan ?? ""}
                onChange={(e) => setEdit((v) => (v ? { ...v, pertanyaan: e.target.value } : v))}
                className="min-h-20 rounded-sm text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Opsi</label>
              <div className="space-y-1.5">
                {(edit?.opsi ?? []).map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 text-xs font-medium text-muted-foreground">{HURUF[i]}</span>
                    <Input
                      value={o}
                      onChange={(e) =>
                        setEdit((v) =>
                          v ? { ...v, opsi: v.opsi.map((x, j) => (j === i ? e.target.value : x)) } : v,
                        )
                      }
                      placeholder={`Opsi ${HURUF[i]} (kosongkan bila tidak dipakai)`}
                      className="h-8 rounded-sm text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Kunci jawaban</label>
              <div className="flex flex-wrap gap-1.5">
                {[...HURUF].map((huruf, i) => {
                  const aktif = (edit?.kunci ?? "").toUpperCase() === huruf
                  const kosong = !(edit?.opsi?.[i] ?? "").trim()
                  return (
                    <Button
                      key={huruf}
                      type="button"
                      size="sm"
                      variant={aktif ? "default" : "outline"}
                      disabled={kosong}
                      className="h-8 w-8 rounded-sm p-0 font-mono text-xs"
                      onClick={() => setEdit((v) => (v ? { ...v, kunci: huruf } : v))}
                    >
                      {huruf}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-11 rounded-sm sm:h-8" onClick={() => setEdit(null)} disabled={sedangUbah}>
              Batal
            </Button>
            <Button size="sm" className="h-11 gap-2 rounded-sm sm:h-8" onClick={simpanEdit} disabled={sedangUbah}>
              {sedangUbah ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan ke form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus soal */}
      <AlertDialog open={Boolean(hapus)} onOpenChange={(buka) => !buka && setHapus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus soal ini dari form?</AlertDialogTitle>
            <AlertDialogDescription>
              “{hapus?.pertanyaan}” akan dihapus permanen dari Google Form. Nomor soal setelahnya ikut bergeser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sedangUbah}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={sedangUbah} onClick={konfirmasiHapus}>
              {sedangUbah ? <Loader2 className="size-4 animate-spin" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
