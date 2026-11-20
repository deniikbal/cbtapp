"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import { imporSoalTeks, imporSoalWord, pratinjauSoalTeks, pratinjauSoalWord, rapikanSoalTeks, daftarSoalForm, ubahSoal, hapusSoal, tambahSoal } from "@/app/actions/impor-soal"
import { AksiIkon } from "@/components/aksi-ikon"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Textarea } from "@/components/ui/textarea"
import type { SoalImpor } from "@/lib/impor-docx"

type SoalForm = { no: number; qid: string; pertanyaan: string; opsi: string[]; kunci: string }

const kunciTeks = (teks: string) => teks.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

const CONTOH = `1. Hasil dari 12 x 2 adalah ...
12
18
24
30
36
Kunci: C`

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
  const [sumber, setSumber] = useState<"docx" | "teks">("docx")
  const [nama, setNama] = useState("")
  const [teks, setTeks] = useState("")
  const [soal, setSoal] = useState<SoalImpor[] | null>(null)
  const [peringatan, setPeringatan] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasil, setHasil] = useState<string | null>(null)
  const [tersimpan, setTersimpan] = useState<SoalForm[]>(soalFormAwal)
  const [edit, setEdit] = useState<{ qid: string | null; pertanyaan: string; opsi: string[]; kunci: string } | null>(null)
  const [hapus, setHapus] = useState<SoalForm | null>(null)
  const [sedangUbah, startUbah] = useTransition()
  const [pending, startTransition] = useTransition()
  const [merapikan, startMerapikan] = useTransition()
  const fileRef = useRef<File | null>(null)

  function reset() {
    fileRef.current = null
    setNama("")
    setTeks("")
    setSoal(null)
    setPeringatan([])
    setError(null)
    setHasil(null)
  }

  function pilihFile(file: File | null) {
    if (!file) return
    fileRef.current = file
    setNama(file.name)
    setHasil(null)
    setError(null)
    const fd = new FormData()
    fd.set("file", file)
    startTransition(async () => {
      const hasil = await pratinjauSoalWord(fd)
      if (!hasil.ok) {
        setSoal(null)
        setError(hasil.message)
        return
      }
      setSoal(hasil.soal)
      setPeringatan(hasil.peringatan)
    })
  }

  function periksaTeks() {
    setHasil(null)
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
      const hasil =
        sumber === "docx" && fileRef.current
          ? await (async () => {
              const fd = new FormData()
              fd.set("file", fileRef.current as File)
              return imporSoalWord(bankId, fd)
            })()
          : await imporSoalTeks(bankId, teks)
      if (!hasil.ok) {
        setError(hasil.message)
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message)
      setHasil(hasil.message)
      setSoal(null)
      setPeringatan([])
      const terbaru = await daftarSoalForm(bankId)
      if (terbaru.ok) setTersimpan(terbaru.soal)
    })
  }

  function bukaEdit(s: SoalForm) {
    const opsi = [...s.opsi]
    while (opsi.length < 5) opsi.push("")
    setEdit({ qid: s.qid, pertanyaan: s.pertanyaan, opsi, kunci: s.kunci })
  }

  function tambahBaru() {
    setEdit({ qid: null, pertanyaan: "", opsi: ["", "", "", "", ""], kunci: "" })
  }

  function simpanEdit() {
    if (!edit) return
    startUbah(async () => {
      const payload = {
        pertanyaan: edit.pertanyaan,
        opsi: edit.opsi.filter((o) => o.trim()),
        hurufKunci: edit.kunci,
      }
      const hasil = edit.qid ? await ubahSoal(bankId, edit.qid, payload) : await tambahSoal(bankId, payload)
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

  const siap = (soal ?? []).filter((s) => s.opsi.length >= 2 && s.kunci).length

  if (hasil) {
    return (
      <Card className="mx-auto max-w-xl gap-0 rounded-sm py-0">
        <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Impor berhasil</p>
            <p className="text-sm text-muted-foreground">{hasil}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={`https://docs.google.com/forms/d/${formId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm", className: "h-11 gap-2 rounded-sm sm:h-8" })}
            >
              <ExternalLink className="size-4" />
              Buka form untuk cek
            </a>
            <Button variant="outline" size="sm" className="h-11 gap-2 rounded-sm sm:h-8" onClick={reset}>
              <FileUp className="size-4" />
              Impor lagi
            </Button>
            <Button variant="outline" size="sm" className="h-11 gap-2 rounded-sm sm:h-8" render={<Link href={backHref} />}>
              <ArrowLeft className="size-4" />
              Kembali
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Identitas bank soal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 rounded-sm">
            <AvatarFallback className="rounded-sm bg-primary/10 font-mono text-sm font-medium text-primary">
              {kode.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">Impor Soal PG — {judul}</h1>
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
        <Button variant="outline" size="sm" className="h-11 gap-2 rounded-sm sm:h-8" render={<Link href={backHref} />}>
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
      </div>

      {/* Soal yang sudah ada di form */}
      <Card className="gap-0 rounded-sm py-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="space-y-1">
            <CardTitle className="text-sm">Soal yang sudah ada di form</CardTitle>
            <CardDescription className="text-[11px]">
              Daftar soal yang terbaca dari Google Form saat ini.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="rounded-sm font-normal tabular-nums">
              {tersimpan.length} soal
            </Badge>
            <Button size="sm" className="h-11 gap-1.5 rounded-sm sm:h-8" onClick={tambahBaru}>
              <Plus className="size-4" />
              Tambah soal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-3">
          {tersimpan.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Form masih kosong — belum ada soal yang masuk. Impor soal di langkah 1 di bawah.
            </p>
          ) : (
            <ScrollArea className="max-h-64 rounded-sm border border-border">
              <ol className="divide-y divide-border">
                {tersimpan.map((s) => (
                  <li key={s.no} className="flex items-start gap-2 px-2 py-1.5">
                    <span className="w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{s.no}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{s.pertanyaan}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {s.opsi.map((o, i) => `${"ABCDE"[i]}. ${o}`).join("  ·  ")}
                      </p>
                    </div>
                    {s.kunci ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-sm font-mono text-[11px] font-normal text-emerald-700 dark:text-emerald-400"
                      >
                        {s.kunci}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-sm text-[11px] font-normal text-amber-700 dark:text-amber-400"
                      >
                        tanpa kunci
                      </Badge>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <AksiIkon label="Edit soal">
                        <Button variant="ghost" size="icon-sm" className="rounded-sm" onClick={() => bukaEdit(s)}>
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit soal</span>
                        </Button>
                      </AksiIkon>
                      <AksiIkon label="Hapus soal">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-sm text-destructive hover:text-destructive"
                          onClick={() => setHapus(s)}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Hapus soal</span>
                        </Button>
                      </AksiIkon>
                    </div>
                  </li>
                ))}
              </ol>
              <ScrollBar />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog edit soal */}
      <Dialog open={Boolean(edit)} onOpenChange={(buka) => !buka && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit?.qid ? "Edit soal" : "Tambah soal"}</DialogTitle>
            <DialogDescription>
              {edit?.qid
                ? "Ubah pertanyaan, opsi, atau kunci. Perubahan langsung ke Google Form."
                : "Ketik pertanyaan, opsi A–E, lalu pilih kunci. Soal langsung masuk ke Google Form."}
            </DialogDescription>
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
                    <span className="w-4 text-xs font-medium text-muted-foreground">{"ABCDE"[i]}</span>
                    <Input
                      value={o}
                      onChange={(e) =>
                        setEdit((v) =>
                          v ? { ...v, opsi: v.opsi.map((x, j) => (j === i ? e.target.value : x)) } : v,
                        )
                      }
                      placeholder={`Opsi ${"ABCDE"[i]} (kosongkan bila tidak dipakai)`}
                      className="h-8 rounded-sm text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Kunci jawaban</label>
              <div className="flex flex-wrap gap-1.5">
                {[..."ABCDE"].map((huruf, i) => {
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
              {edit?.qid ? "Simpan ke form" : "Tambah ke form"}
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

      {/* Langkah 1: sumber soal */}
      <Card className="gap-0 rounded-sm py-0">
        <CardHeader className="gap-1 border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="flex size-5 items-center justify-center rounded-sm bg-primary/10 font-mono text-[11px] font-medium text-primary">
              1
            </span>
            Sumber soal
          </CardTitle>
          <CardDescription className="text-[11px]">
            Pilih file Word (.docx) atau tempel teks soal langsung.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <ToggleGroup
            variant="outline"
            multiple={false}
            value={[sumber]}
            onValueChange={(v) => {
              if (!v.length) return
              setSumber(v[0] as "docx" | "teks")
              setSoal(null)
              setPeringatan([])
              setError(null)
              setHasil(null)
            }}
            className="w-full sm:w-fit"
          >
            <ToggleGroupItem value="docx" className="flex-1 gap-1.5 sm:flex-none">
              <FileUp data-icon="inline-start" />
              File Word (.docx)
            </ToggleGroupItem>
            <ToggleGroupItem value="teks" className="flex-1 gap-1.5 sm:flex-none">
              <FileText data-icon="inline-start" />
              Tempel teks
            </ToggleGroupItem>
          </ToggleGroup>

          {sumber === "docx" ? (
            <div className="mt-3">
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border bg-muted/40 px-4 py-10 text-center transition-colors hover:bg-muted"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  pilihFile(e.dataTransfer.files?.[0] ?? null)
                }}
              >
                {pending ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : (
                  <FileUp className="size-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{nama || "Pilih atau tarik file .docx ke sini"}</span>
                <span className="text-[11px] text-muted-foreground">Maksimal 5 MB</span>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => pilihFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Textarea
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                placeholder={CONTOH}
                className="min-h-[480px] rounded-sm font-mono text-xs"
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
                  onClick={periksaTeks}
                  disabled={pending || merapikan || teks.trim().length === 0}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  Periksa format
                </Button>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div className="text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">Format yang dikenali:</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-sm bg-muted/60 px-3 py-2 font-mono text-[11px] text-foreground">
              {CONTOH}
            </pre>
            <p className="mt-1">
              Tiap baris setelah pertanyaan = satu opsi. Google Form memberi huruf A–E sendiri, jadi tidak perlu
              menulis &quot;a.&quot;, &quot;b.&quot; (tetap didukung bila ditulis). Kunci:{" "}
              <span className="font-mono">Kunci: C</span> per soal, atau dikumpulkan di akhir{" "}
              <span className="font-mono">Kunci Jawaban: 1.C 2.A</span>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Langkah 2: pratinjau */}
      <Card className="gap-0 rounded-sm py-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex size-5 items-center justify-center rounded-sm bg-primary/10 font-mono text-[11px] font-medium text-primary">
                2
              </span>
              Pratinjau &amp; masukkan ke form
            </CardTitle>
            <CardDescription className="text-[11px]">
              Periksa dulu hasil pembacaan, baru masukkan ke Google Form.
            </CardDescription>
          </div>
          {soal ? (
            <Badge variant="secondary" className="shrink-0 rounded-sm font-normal">
              {soal.length} soal terbaca · {siap} siap
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 py-4">
          {error ? (
            <Alert variant="destructive" className="rounded-sm px-3 py-2">
              <TriangleAlert />
              <AlertTitle className="text-xs">Gagal membaca soal</AlertTitle>
              <AlertDescription className="text-[11px]">{error}</AlertDescription>
            </Alert>
          ) : null}

          {soal ? (
            <div className="flex flex-col gap-2">
              <ScrollArea className="h-80 rounded-sm border border-border">
                <div className="divide-y divide-border">
                  {soal.map((s) => (
                    <div key={s.no} className="flex items-start gap-2 px-2 py-1.5">
                      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                        {s.no}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">{s.pertanyaan}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.opsi.length} opsi · kunci {s.kunci ? s.kunci.toUpperCase() : "belum ada"}
                          {s.opsi[s.kunci.charCodeAt(0) - 97] ? ` (${s.opsi[s.kunci.charCodeAt(0) - 97]})` : ""}
                        </p>
                      </div>
                      {tersimpan.some((t) => kunciTeks(t.pertanyaan) === kunciTeks(s.pertanyaan)) ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-sm font-normal text-muted-foreground"
                          title="Soal dengan isi sama sudah ada di form — tidak akan ditambahkan lagi"
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
                    </div>
                  ))}
                </div>
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
            </div>
          ) : (
            !error && (
              <Empty className="rounded-sm border p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>Belum ada soal diperiksa</EmptyTitle>
                  <EmptyDescription>
                    Pilih file Word atau tempel teks soal di langkah 1, hasil pembacaan muncul di sini.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" className="h-11 rounded-sm sm:h-8" onClick={reset} disabled={pending}>
              Ulangi
            </Button>
            <Button size="sm" className="h-11 gap-2 rounded-sm sm:h-8" onClick={simpan} disabled={pending || siap === 0}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              Masukkan {siap || ""} soal ke form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
