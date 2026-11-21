"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Keyboard,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { SoalImpor } from "@/lib/impor-docx"

type Jenis = "PILIHAN_GANDA" | "CENTANG" | "JAWABAN_SINGKAT" | "URAIAN"
type SoalForm = { no: number; qid: string; pertanyaan: string; jenis: Jenis; poin: number; opsi: string[]; kunci: string }
type Isian = {
  pertanyaan: string
  jenis: Jenis
  bobot: number
  opsi: string[]
  hurufKunci: string
  kunciTeks: string
}

const HURUF = "ABCDE"
const OPSI_AWAL = ["", "", "", "", ""]
const JENIS: { value: Jenis; label: string }[] = [
  { value: "PILIHAN_GANDA", label: "Pilihan ganda" },
  { value: "CENTANG", label: "Centang banyak" },
  { value: "JAWABAN_SINGKAT", label: "Jawaban singkat" },
  { value: "URAIAN", label: "Uraian" },
]
const labelJenis = (j: Jenis) => JENIS.find((x) => x.value === j)?.label ?? j
const pakaiOpsi = (j: Jenis) => j === "PILIHAN_GANDA" || j === "CENTANG"

const SUPER: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ",
}
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  a: "ₐ", e: "ₑ", h: "ₕ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", s: "ₛ", t: "ₜ", u: "ᵤ", x: "ₓ",
}

function keUnicode(teks: string, peta: Record<string, string>) {
  return Array.from(teks)
    .map((kar) => peta[kar.toLowerCase()] ?? peta[kar] ?? kar)
    .join("")
}

const kunciTeks = (teks: string) => teks.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

const CONTOH = `1. Hasil dari 12 x 2 adalah ...
12
18
24
30
36
Kunci: C`

/** Editor satu soal: jenis, bobot, pertanyaan, opsi & kunci. Dipakai untuk tambah dan ubah. */
function EditorSoal({
  awal,
  mode,
  onSimpan,
  backHref,
}: {
  awal?: SoalForm
  mode: "tambah" | "ubah"
  onSimpan: (data: Isian) => Promise<boolean>
  backHref?: string
}) {
  const [pertanyaan, setPertanyaan] = useState(awal?.pertanyaan ?? "")
  const [jenis, setJenis] = useState<Jenis>(awal?.jenis ?? "PILIHAN_GANDA")
  const [bobot, setBobot] = useState(String(awal?.poin ?? 1))
  const [opsi, setOpsi] = useState<string[]>(() => {
    const isi = awal?.opsi.length ? [...awal.opsi] : [...OPSI_AWAL]
    while (isi.length < 3) isi.push("")
    return isi
  })
  const [kunciIdx, setKunciIdx] = useState<number>(() => {
    if (!pakaiOpsi(awal?.jenis ?? "PILIHAN_GANDA")) return -1
    const kunci = (awal?.kunci ?? "").trim().toUpperCase()
    // "ABCDE".indexOf("") = 0, jadi kunci kosong wajib dicek dulu.
    return kunci.length === 1 ? HURUF.indexOf(kunci) : -1
  })
  const [kunciIsi, setKunciIsi] = useState(pakaiOpsi(awal?.jenis ?? "PILIHAN_GANDA") ? "" : (awal?.kunci ?? ""))
  const [proses, setProses] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const simpanRef = (elemen: HTMLInputElement | HTMLTextAreaElement | null) => {
    inputRef.current = elemen
  }
  const [fieldAktif, setFieldAktif] = useState<"pertanyaan" | "kunci" | number | null>(null)

  function terapkanFormat(peta: Record<string, string>, contoh: string) {
    const el = inputRef.current
    if (!el || fieldAktif === null) {
      toast.info("Klik kolom teks dulu, lalu pilih bagian yang mau diubah.")
      return
    }
    const mulai = el.selectionStart ?? 0
    const akhir = el.selectionEnd ?? 0
    const pilihan = el.value.slice(mulai, akhir)
    const ganti = pilihan ? keUnicode(pilihan, peta) : contoh
    const nilaiBaru = el.value.slice(0, mulai) + ganti + el.value.slice(akhir)

    if (fieldAktif === "pertanyaan") setPertanyaan(nilaiBaru)
    else if (fieldAktif === "kunci") setKunciIsi(nilaiBaru)
    else setOpsi((v) => v.map((isi, i) => (i === fieldAktif ? nilaiBaru : isi)))

    requestAnimationFrame(() => {
      const fokus = inputRef.current
      if (!fokus) return
      fokus.focus()
      const posisi = mulai + ganti.length
      fokus.setSelectionRange(posisi, posisi)
    })
  }

  const perluOpsi = pakaiOpsi(jenis)
  const opsiTerisi = opsi.filter((o) => o.trim())
  const siap = perluOpsi
    ? Boolean(pertanyaan.trim()) && opsiTerisi.length >= 2 && kunciIdx >= 0 && Boolean(opsi[kunciIdx]?.trim())
    : Boolean(pertanyaan.trim()) && (jenis === "URAIAN" || Boolean(kunciIsi.trim()))

  function ubahJenis(nilai: Jenis) {
    setJenis(nilai)
    setPesan(null)
    if (!pakaiOpsi(nilai)) setKunciIdx(-1)
  }

  async function simpan() {
    setProses(true)
    const ok = await onSimpan({
      pertanyaan,
      jenis,
      bobot: Number(bobot) > 0 ? Number(bobot) : 1,
      opsi: perluOpsi ? opsi : [],
      hurufKunci: kunciIdx >= 0 ? HURUF[kunciIdx] : "",
      kunciTeks: perluOpsi ? "" : kunciIsi,
    })
    setProses(false)
    if (!ok) return
    setPesan(mode === "tambah" ? "Soal tersimpan di topik ini." : "Perubahan tersimpan.")
    setPertanyaan("")
    setOpsi([...OPSI_AWAL])
    setKunciIdx(-1)
    setKunciIsi("")
    setBobot("1")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="space-y-1">
          <label className="text-xs font-medium">Jenis</label>
          <NativeSelect
            value={jenis}
            onChange={(e) => ubahJenis(e.target.value as Jenis)}
            className="h-9 w-full"
            aria-label="Jenis soal"
          >
            {JENIS.map((j) => (
              <NativeSelectOption key={j.value} value={j.value}>
                {j.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Bobot</label>
          <Input
            type="number"
            min={1}
            value={bobot}
            onChange={(e) => setBobot(e.target.value)}
            className="h-9 rounded-sm text-xs tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-medium">Pertanyaan</label>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Teks khusus</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Ubah huruf/angka terpilih jadi superscript"
              aria-label="Terapkan superscript"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => terapkanFormat(SUPER, "²")}
              className="h-11 min-w-11 rounded-sm px-2 text-xs sm:h-8 sm:min-w-8"
            >
              x²
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Ubah huruf/angka terpilih jadi subscript"
              aria-label="Terapkan subscript"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => terapkanFormat(SUB, "₂")}
              className="h-11 min-w-11 rounded-sm px-2 text-xs sm:h-8 sm:min-w-8"
            >
              x₂
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pilih huruf atau angka, lalu tekan x² atau x₂. Karakter tanpa bentuk khusus tetap ditulis biasa.
        </p>
        <Textarea
          ref={simpanRef}
          onFocus={() => setFieldAktif("pertanyaan")}
          value={pertanyaan}
          maxLength={2000}
          onChange={(e) => setPertanyaan(e.target.value)}
          placeholder="Tulis pertanyaan lengkapnya di sini..."
          className="min-h-28 rounded-sm text-xs"
        />
        <p className="text-right font-mono text-[11px] text-muted-foreground">{pertanyaan.length}/2000</p>
      </div>

      <Separator />

      {perluOpsi ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-xs font-medium">Opsi dan kunci</label>
            <span className="text-[11px] text-muted-foreground">Klik huruf di kiri untuk menandai jawaban benar.</span>
          </div>
          {opsi.map((o, i) => {
            const aktif = kunciIdx === i
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!o.trim()}
                  onClick={() => setKunciIdx(aktif ? -1 : i)}
                  title={o.trim() ? `Tandai ${HURUF[i]} sebagai kunci` : "Isi opsi dulu"}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] transition-colors disabled:opacity-40 sm:size-7 ${
                    aktif
                      ? "border-lime-600 bg-lime-600 text-white"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {aktif ? <Check className="size-3.5" aria-hidden="true" /> : HURUF[i]}
                </button>
                <Input
                  ref={simpanRef}
                  onFocus={() => setFieldAktif(i)}
                  value={o}
                  onChange={(e) => {
                    const nilai = e.target.value
                    setOpsi((v) => v.map((x, j) => (j === i ? nilai : x)))
                    if (!nilai.trim() && aktif) setKunciIdx(-1)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && o.trim()) {
                      e.preventDefault()
                      setKunciIdx(i)
                    }
                  }}
                  placeholder={`Opsi ${HURUF[i]}`}
                  className="h-9 rounded-sm text-xs"
                />
                {opsi.length > 2 ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-11 w-11 shrink-0 rounded-sm text-muted-foreground sm:h-6 sm:w-6"
                    title="Hapus opsi"
                    onClick={() => {
                      setOpsi((v) => v.filter((_, j) => j !== i))
                      if (kunciIdx === i) setKunciIdx(-1)
                      else if (kunciIdx > i) setKunciIdx(kunciIdx - 1)
                    }}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Hapus opsi</span>
                  </Button>
                ) : null}
              </div>
            )
          })}
          {opsi.length < HURUF.length ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 gap-1.5 rounded-sm px-2 text-[11px] text-muted-foreground sm:h-8"
              onClick={() => setOpsi((v) => [...v, ""])}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Tambah opsi {HURUF[opsi.length]}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-medium">
            {jenis === "URAIAN" ? "Kunci jawaban (tidak dinilai otomatis)" : "Kunci jawaban"}
          </label>
          <Input
            ref={simpanRef}
            onFocus={() => setFieldAktif("kunci")}
            value={kunciIsi}
            disabled={jenis === "URAIAN"}
            onChange={(e) => setKunciIsi(e.target.value)}
            placeholder={jenis === "URAIAN" ? "Uraian dinilai manual oleh guru" : "Teks jawaban benar, mis. 24"}
            className="h-9 rounded-sm text-xs"
          />
        </div>
      )}

      {pesan ? (
        <Alert className="rounded-sm border-lime-300/60 bg-lime-50 px-3 py-2 dark:border-lime-500/30 dark:bg-lime-950/40">
          <CheckCircle2 className="text-lime-700 dark:text-lime-400" aria-hidden="true" />
          <AlertDescription className="text-[11px] text-lime-900 dark:text-lime-200">{pesan}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        {mode === "tambah" ? (
          <>
            {backHref ? (
              <Button variant="ghost" size="sm" className="h-11 gap-1.5 rounded-sm sm:h-8" render={<Link href={backHref} />}>
                <X className="size-4" aria-hidden="true" />
                Selesai
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-11 gap-1.5 rounded-sm sm:h-8"
              onClick={simpan}
              disabled={proses || !siap}
            >
              {proses ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              Simpan &amp; tulis lagi
            </Button>
          </>
        ) : null}
        <Button size="sm" className="h-11 gap-2 rounded-sm sm:h-8" onClick={simpan} disabled={proses || !siap}>
          {proses ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {mode === "tambah" ? "Simpan soal" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  )
}

/** Kolom 1 mode tempel teks: textarea + AI + pratinjau + tombol masukkan. */
function PanelTeks({
  bankId,
  tersimpan,
  onSelesai,
}: {
  bankId: string
  tersimpan: SoalForm[]
  onSelesai: (soal: SoalForm[]) => void
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
      if (terbaru.ok) onSelesai(terbaru.soal)
    })
  }

  const siap = (soal ?? []).filter((s) => s.opsi.length >= 2 && s.kunci).length

  return (
    <Card className="gap-0 rounded-sm py-0">
      <CardHeader className="gap-1 border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
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
            {merapikan ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Rapikan dengan AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 gap-2 rounded-sm sm:h-8"
            onClick={periksa}
            disabled={pending || merapikan || teks.trim().length === 0}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
            Periksa format
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" className="rounded-sm px-3 py-2">
            <TriangleAlert aria-hidden="true" />
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
            <div className="max-h-64 overflow-y-auto overscroll-contain rounded-sm border border-border">
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
                          title="Soal dengan isi sama sudah ada di form, tidak ditambahkan lagi"
                        >
                          sudah ada
                        </Badge>
                      ) : s.opsi.length >= 2 && s.kunci ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm font-normal text-lime-700 dark:text-lime-400"
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
            </div>

            {peringatan.length ? (
              <Alert className="rounded-sm border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-950/40">
                <TriangleAlert className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Kunci boleh huruf (<span className="font-mono">Kunci: C</span>) atau teks opsinya.
          </p>
          <Button size="sm" className="h-11 gap-2 rounded-sm sm:h-8" onClick={simpan} disabled={pending || siap === 0}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            Masukkan {siap || ""} soal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const BUKA_AWAL = -1

/** Kolom 2: daftar soal yang sudah ada di Google Form (scroll sendiri, kartu ringkas). */
function DaftarSoal({
  soal,
  onUbah,
  onHapus,
}: {
  soal: SoalForm[]
  onUbah: (s: SoalForm) => void
  onHapus: (s: SoalForm) => void
}) {
  const [buka, setBuka] = useState<number>(BUKA_AWAL)

  return (
    <Card className="flex min-h-64 flex-col gap-0 rounded-sm py-0 lg:max-h-[calc(100dvh-13rem)]">
      <CardHeader className="gap-1 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Soal di topik ini</CardTitle>
          <Badge variant="secondary" className="shrink-0 rounded-sm font-normal tabular-nums">
            {soal.length} soal
          </Badge>
        </div>
        <CardDescription className="text-[11px]">Klik satu soal untuk lihat opsi &amp; kunci.</CardDescription>
      </CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {soal.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            Belum ada soal. Tambah lewat editor atau tempel teks.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {soal.map((s) => {
              const kunci = (s.kunci || "").trim().toUpperCase()
              const idx = kunci.length === 1 ? HURUF.indexOf(kunci) : -1
              const terbuka = buka === s.no
              return (
                <li key={s.qid || String(s.no)}>
                  <button
                    type="button"
                    onClick={() => setBuka(terbuka ? BUKA_AWAL : s.no)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-[11px] text-muted-foreground">
                      {s.no}.
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-xs font-medium leading-snug">{s.pertanyaan}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {s.poin} poin · {labelJenis(s.jenis)}
                        {idx >= 0 ? ` · kunci ${HURUF[idx]}` : s.kunci ? ` · kunci ${s.kunci}` : ""}
                      </span>
                    </span>
                    <ChevronDown
                      className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${terbuka ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>

                  {terbuka ? (
                    <div className="space-y-2 border-t bg-muted/30 px-3 py-2.5">
                      {s.opsi.length ? (
                        <ul className="space-y-1">
                          {s.opsi.map((o, i) => {
                            const benar = i === idx
                            return (
                              <li
                                key={i}
                                className={`flex items-start gap-2 rounded-sm px-1.5 py-1 text-xs ${
                                  benar ? "bg-lime-50 dark:bg-lime-950/40" : ""
                                }`}
                              >
                                <span
                                  className={`w-4 shrink-0 font-mono text-[11px] ${
                                    benar ? "text-lime-700 dark:text-lime-400" : "text-muted-foreground"
                                  }`}
                                >
                                  {HURUF[i]}.
                                </span>
                                <span className={`min-w-0 flex-1 ${benar ? "font-medium" : ""}`}>{o}</span>
                                {benar ? <Check className="size-4 shrink-0 text-lime-600 dark:text-lime-400" aria-hidden="true" /> : null}
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="rounded-sm border border-lime-300/60 bg-lime-50 px-2 py-1 text-xs dark:border-lime-500/30 dark:bg-lime-950/40">
                          <span className="text-muted-foreground">Kunci: </span>
                          <span className="font-medium text-lime-800 dark:text-lime-300">{s.kunci || "-"}</span>
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-11 w-11 rounded-sm text-primary hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-8"
                          onClick={() => onUbah(s)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          <span className="sr-only">Ubah soal</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-11 w-11 rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                          onClick={() => onHapus(s)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Hapus soal</span>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
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
  const [ubah, setUbah] = useState<SoalForm | null>(null)
  const [hapus, setHapus] = useState<SoalForm | null>(null)
  const [proses, setProses] = useState(false)

  async function tambah(data: Isian) {
    setProses(true)
    const hasil = await tambahSoal(bankId, data)
    setProses(false)
    if (!hasil.ok) {
      toast.error(hasil.message)
      return false
    }
    if (hasil.soal) setTersimpan(hasil.soal)
    toast.success(hasil.message)
    return true
  }

  async function simpanUbah(data: Isian) {
    if (!ubah) return false
    setProses(true)
    const hasil = await ubahSoal(bankId, ubah.qid, data)
    setProses(false)
    if (!hasil.ok) {
      toast.error(hasil.message)
      return false
    }
    if (hasil.soal) setTersimpan(hasil.soal)
    toast.success(hasil.message)
    return true
  }

  async function konfirmasiHapus() {
    if (!hapus) return
    setProses(true)
    const hasil = await hapusSoal(bankId, hapus.qid)
    setProses(false)
    if (!hasil.ok) {
      toast.error(hasil.message)
      return
    }
    if (hasil.soal) setTersimpan(hasil.soal)
    setHapus(null)
    toast.success(hasil.message)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 rounded-sm">
            <AvatarFallback className="rounded-sm bg-primary/10 font-mono text-sm font-medium text-primary">
              {kode.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">Input Soal: {judul}</h1>
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
            <ExternalLink className="size-4" aria-hidden="true" />
            Buka form
          </a>
          <Button variant="outline" size="sm" className="h-11 gap-2 rounded-sm sm:h-8" render={<Link href={backHref} />}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Button>
        </div>
      </div>

      <Tabs value={model} onValueChange={(v) => setModel(v as "manual" | "teks")} className="flex flex-col gap-4">
        <TabsList className="h-11 w-fit sm:h-9">
          <TabsTrigger value="manual" className="gap-1.5">
            <Keyboard data-icon="inline-start" aria-hidden="true" />
            Input manual
          </TabsTrigger>
          <TabsTrigger value="teks" className="gap-1.5">
            <FileText data-icon="inline-start" aria-hidden="true" />
            Tempel teks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card className="gap-0 rounded-sm py-0">
              <CardHeader className="gap-1 border-b px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Keyboard className="size-4 text-muted-foreground" aria-hidden="true" />
                  Editor soal
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Soal langsung tersimpan ke Google Form milik bank soal ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <EditorSoal mode="tambah" onSimpan={tambah} backHref={backHref} />
              </CardContent>
            </Card>
            <DaftarSoal soal={tersimpan} onUbah={setUbah} onHapus={setHapus} />
          </div>
        </TabsContent>

        <TabsContent value="teks">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <PanelTeks bankId={bankId} tersimpan={tersimpan} onSelesai={setTersimpan} />
            <DaftarSoal soal={tersimpan} onUbah={setUbah} onHapus={setHapus} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog ubah soal */}
      <Dialog open={Boolean(ubah)} onOpenChange={(buka) => !buka && setUbah(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ubah soal</DialogTitle>
            <DialogDescription>Perubahan langsung dikirim ke Google Form.</DialogDescription>
          </DialogHeader>
          {ubah ? <EditorSoal awal={ubah} mode="ubah" onSimpan={simpanUbah} /> : null}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-11 rounded-sm sm:h-8"
              onClick={() => setUbah(null)}
              disabled={proses}
            >
              Tutup
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
            <AlertDialogCancel disabled={proses}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={proses} onClick={konfirmasiHapus}>
              {proses ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
