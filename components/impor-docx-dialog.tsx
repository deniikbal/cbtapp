"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react"

import { imporSoalWord, pratinjauSoalWord } from "@/app/actions/impor-soal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { SoalImpor } from "@/lib/impor-docx"

const CONTOH = `1. Hasil dari 12 x 2 adalah ...
12
18
24
30
36
Kunci: C`

export function ImporDocxDialog({ bankId, kode, disabled, ikon }: { bankId: string; kode: string; disabled?: boolean; ikon?: boolean }) {
  const [open, setOpen] = useState(false)
  const [nama, setNama] = useState("")
  const [soal, setSoal] = useState<SoalImpor[] | null>(null)
  const [peringatan, setPeringatan] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<File | null>(null)

  function reset() {
    fileRef.current = null
    setNama("")
    setSoal(null)
    setPeringatan([])
    setError(null)
  }

  function pilihFile(file: File | null) {
    if (!file) return
    fileRef.current = file
    setNama(file.name)
    setSoal(null)
    setError(null)
    const fd = new FormData()
    fd.set("file", file)
    startTransition(async () => {
      const hasil = await pratinjauSoalWord(fd)
      if (!hasil.ok) {
        setError(hasil.message)
        return
      }
      setSoal(hasil.soal)
      setPeringatan(hasil.peringatan)
    })
  }

  function simpan() {
    const file = fileRef.current
    if (!file) return
    const fd = new FormData()
    fd.set("file", file)
    startTransition(async () => {
      const hasil = await imporSoalWord(bankId, fd)
      if (!hasil.ok) {
        setError(hasil.message)
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message)
      setOpen(false)
      reset()
    })
  }

  const siap = (soal ?? []).filter((s) => s.opsi.length >= 2 && s.kunci).length

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      {ikon ? (
        <Button variant="ghost" size="icon-sm" disabled={disabled} title={disabled ? "Buat form dulu" : "Impor soal dari Word"} onClick={() => setOpen(true)}>
          <FileUp className="size-4" />
          <span className="sr-only">Impor soal dari Word</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          title={disabled ? "Buat form dulu" : "Impor soal dari Word"}
          className="h-11 gap-1 rounded-sm px-1.5 text-[11px] sm:h-6"
          onClick={() => setOpen(true)}
        >
          <FileUp className="size-3.5" />
          Impor Word
        </Button>
      )}
      <DialogContent className="flex max-h-[92dvh] flex-col gap-3 overflow-hidden p-4 sm:max-w-2xl">
        <DialogHeader className="shrink-0 gap-1">
          <DialogTitle className="text-sm">Impor soal dari Word — {kode}</DialogTitle>
          <DialogDescription className="text-[11px]">
            Soal menggantikan 30 soal kosong bawaan form beserta kunci jawabannya. Placeholder yang sudah diisi manual tidak diubah.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 text-xs">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:bg-muted"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              pilihFile(e.dataTransfer.files?.[0] ?? null)
            }}
          >
            <FileUp className="size-5 text-muted-foreground" />
            <span className="font-medium">{nama || "Pilih atau tarik file .docx"}</span>
            <span className="text-[11px] text-muted-foreground">Maksimal 5 MB</span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => pilihFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {error ? (
            <p className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          ) : null}

          {soal ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                {soal.length} soal terbaca, {siap} siap diimpor
              </p>
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {soal.map((s) => (
                  <div key={s.no} className="flex items-start gap-2 px-2 py-1.5">
                    <span className="w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{s.no}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{s.pertanyaan}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.opsi.length} opsi · kunci {s.kunci ? s.kunci.toUpperCase() : "belum ada"}
                        {s.opsi[s.kunci.charCodeAt(0) - 97] ? ` (${s.opsi[s.kunci.charCodeAt(0) - 97]})` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {peringatan.length ? (
                <ul className="space-y-0.5 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
                  {peringatan.slice(0, 6).map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                  {peringatan.length > 6 ? <li>• … {peringatan.length - 6} catatan lain</li> : null}
                </ul>
              ) : null}
            </div>
          ) : !error ? (
            <div className="rounded-md bg-muted/60 px-2 py-1.5 text-[11px] text-muted-foreground">
              Format yang dikenali:
              <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-foreground">{CONTOH}</pre>
              <p className="mt-1">
                Tiap baris setelah pertanyaan = satu opsi. Google Form memberi huruf A–E sendiri, jadi tidak perlu menulis
                &quot;a.&quot;, &quot;b.&quot; (tetap didukung bila ditulis). Kunci: <span className="font-mono">Kunci: C</span> per
                soal, atau dikumpulkan di akhir <span className="font-mono">Kunci Jawaban: 1.C 2.A</span>.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button size="sm" onClick={simpan} disabled={pending || !siap}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
            Tambahkan {siap || ""} soal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
