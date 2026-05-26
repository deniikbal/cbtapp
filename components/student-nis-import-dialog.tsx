"use client"

import { useRef, useState, useTransition } from "react"
import { CheckCircle2, Download, Loader2, RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"

import { confirmStudentNisUpdates, previewStudentNisUpdatesExcel } from "@/app/dashboard/peserta/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

 type PreviewRow = {
  rowNumber: number
  name: string
  className: string
  oldNis: string
  newNis: string
  valid: boolean
  message: string
}

type PreviewResult = {
  valid: number
  invalid: number
  rows: PreviewRow[]
}

export function StudentNisImportDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function resetState() {
    setError(null)
    setPreview(null)
    formRef.current?.reset()
  }

  function handlePreview(formData: FormData) {
    setError(null)
    setPreview(null)

    startTransition(async () => {
      try {
        const response = await previewStudentNisUpdatesExcel(formData)
        setPreview(response)
        toast.success(`Review selesai: ${response.valid} valid, ${response.invalid} tidak valid.`)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal membaca file update NIS."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleConfirm() {
    if (!preview) return

    const updates = preview.rows
      .filter((row) => row.valid)
      .map((row) => ({ oldNis: row.oldNis, newNis: row.newNis }))

    startTransition(async () => {
      try {
        const response = await confirmStudentNisUpdates(updates)
        toast.success(`${response.updated} NIS peserta berhasil diperbarui.`)
        setOpen(false)
        resetState()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal update NIS peserta."
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
        if (!nextOpen) resetState()
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <RefreshCw className="size-4" />
        Update NIS
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Update NIS Massal</DialogTitle>
          <DialogDescription>Upload file Excel, review validasi, lalu konfirmasi update NIS peserta.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handlePreview} className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Format kolom:</p>
            <p className="mt-1 font-mono text-xs">A: nama, B: kelas, C: nis_lama, D: nis_baru</p>
            <p className="mt-2">Sistem membaca NIS lama dari kolom C dan NIS baru dari kolom D. Data valid jika 3 angka terakhir NIS lama dan NIS baru sama.</p>
          </div>

          <Button nativeButton={false} type="button" variant="outline" className="w-full gap-2" render={<a href="/dashboard/peserta/template-update-nis" download />}>
            <Download className="size-4" />
            Download Template dari Data Peserta
          </Button>

          <div className="space-y-2">
            <Label htmlFor="nis-file">File Excel</Label>
            <Input id="nis-file" name="file" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {preview && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Card size="sm" className="border-emerald-500/20 bg-emerald-500/5">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-5" />Valid</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-semibold">{preview.valid}</p></CardContent>
                </Card>
                <Card size="sm" className="border-rose-500/20 bg-rose-500/5">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300"><XCircle className="size-5" />Tidak Valid</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-semibold">{preview.invalid}</p></CardContent>
                </Card>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-12">Baris</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="w-24">Kelas</TableHead>
                      <TableHead className="w-24">NIS Lama</TableHead>
                      <TableHead className="w-24">NIS Baru</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.oldNis}-${row.newNis}`}>
                        <TableCell className="whitespace-normal text-xs">{row.rowNumber}</TableCell>
                        <TableCell className="truncate text-xs" title={row.name}>{row.name || "—"}</TableCell>
                        <TableCell className="truncate text-xs" title={row.className}>{row.className || "—"}</TableCell>
                        <TableCell className="truncate font-mono text-xs" title={row.oldNis}>{row.oldNis || "—"}</TableCell>
                        <TableCell className="truncate font-mono text-xs" title={row.newNis}>{row.newNis || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className={row.valid ? "bg-emerald-500/10 px-1.5 text-xs text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 px-1.5 text-xs text-rose-700 dark:text-rose-300"}>{row.valid ? "Valid" : "Invalid"}</Badge></TableCell>
                        <TableCell className="whitespace-normal break-words text-xs text-muted-foreground">{row.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button>
            {preview ? (
              <>
                <Button type="button" variant="outline" disabled={isPending} onClick={resetState}>Upload Ulang</Button>
                <Button type="button" disabled={isPending || preview.valid === 0} onClick={handleConfirm}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Mengupdate..." : `Update ${preview.valid} Data Valid`}</Button>
              </>
            ) : (
              <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Mereview..." : "Review File"}</Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
