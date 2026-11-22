"use client"

import { useRef, useState, useTransition } from "react"
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { importRuanganExcel } from "@/app/dashboard/ruangan/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Hasil = Awaited<ReturnType<typeof importRuanganExcel>>

export function RuanganImportDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setHasil(null)

    startTransition(async () => {
      try {
        const response = await importRuanganExcel(formData)
        setHasil(response)
        if (response.dipetakan > 0) {
          toast.success(`${response.dipetakan} peserta dipetakan ke ruangan.`)
        }
        if (response.ruanganBaru.length > 0) {
          toast.info(`${response.ruanganBaru.length} ruangan baru dibuat.`)
        }
        if (response.errors.length > 0) {
          toast.warning("Sebagian baris tidak diproses.")
        }
        if (response.dipetakan > 0 && response.errors.length === 0) {
          formRef.current?.reset()
          setOpen(false)
        }
      } catch (err) {
        const pesan = err instanceof Error ? err.message : "Gagal import ruangan."
        setError(pesan)
        toast.error(pesan)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setError(null)
          setHasil(null)
          formRef.current?.reset()
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Upload className="size-4" aria-hidden="true" /> Import Ruangan
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Ruangan dari Excel</DialogTitle>
          <DialogDescription>
            File berisi dua kolom: <strong>NIS</strong> dan <strong>Ruangan</strong>. Peserta dipetakan sesuai isi
            file; nama ruangan yang belum ada akan dibuat otomatis.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <Button nativeButton={false} type="button" variant="outline" className="w-full gap-2" render={<a href="/templates/import-ruangan.xlsx" download />}>
            <Download className="size-4" aria-hidden="true" />
            Download Template Excel
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="file-ruangan">File Excel (.xlsx / .csv)</Label>
            <Input id="file-ruangan" name="file" type="file" accept=".xlsx,.xls,.csv" required />
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
              <FileSpreadsheet className="size-3.5" aria-hidden="true" /> Contoh isi file
            </p>
            <p className="font-mono">NIS | Ruangan</p>
            <p className="font-mono">252610212 | Ruang 1</p>
            <p className="font-mono">242510402 | Ruang 2</p>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {hasil && (
            <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
              <p>{hasil.dipetakan} peserta dipetakan ke ruangan.</p>
              {hasil.ruanganBaru.length > 0 && <p>Ruangan baru: {hasil.ruanganBaru.join(", ")}.</p>}
              {hasil.errors.map((pesan) => (
                <p key={pesan} className="text-destructive">
                  {pesan}
                </p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Tutup
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              {isPending ? "Mengimpor…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
