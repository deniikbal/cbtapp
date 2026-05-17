"use client"

import { useRef, useState, useTransition } from "react"
import { Download, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { importStudentsExcel } from "@/app/dashboard/peserta/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function StudentImportDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setResult(null)

    startTransition(async () => {
      try {
        const response = await importStudentsExcel(formData)
        setResult(response)
        if (response.created > 0) {
          toast.success(`${response.created} peserta berhasil diimport.`)
        }
        if (response.skipped > 0) {
          toast.info(`${response.skipped} peserta dilewati karena NIS duplikat.`)
        }
        if (response.errors.length > 0) {
          toast.warning(`${response.errors.length} baris gagal diimport.`)
        }
        if (response.created > 0 && response.errors.length === 0) {
          formRef.current?.reset()
          setOpen(false)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal import peserta."
        setError(message)
        toast.error(message)
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
          setResult(null)
          formRef.current?.reset()
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Upload className="size-4" />
        Import
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Peserta</DialogTitle>
          <DialogDescription>Upload file Excel (.xlsx/.xls) berisi nama, NIS, password, kelas, dan status peserta.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Format kolom wajib:</p>
            <p className="mt-1 font-mono text-xs">nama, nis, password, kelas, status</p>
            <p className="mt-2">Nama kelas harus sama dengan data kelas di aplikasi. Status isi <b>aktif</b> atau <b>tidak aktif</b>.</p>
          </div>

          <Button nativeButton={false} type="button" variant="outline" className="w-full gap-2" render={<a href="/templates/import-peserta.xlsx" download />}>
            <Download className="size-4" />
            Download Template Excel
          </Button>

          <div className="space-y-2">
            <Label htmlFor="file">File Excel</Label>
            <Input id="file" name="file" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && result.errors.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-medium">Sebagian data gagal diimport:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.errors.slice(0, 20).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Mengimport..." : "Import Peserta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
