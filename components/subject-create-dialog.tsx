"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createSubject } from "@/app/dashboard/mapel/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SubjectCreateDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await createSubject(formData)
        toast.success("Mapel berhasil ditambahkan.")
        setOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan mapel."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Tambah Mapel
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Mapel</DialogTitle>
          <DialogDescription>Buat mata pelajaran untuk bank ujian Google Form.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Mapel</Label>
              <Input id="name" name="name" placeholder="Matematika" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input id="code" name="code" placeholder="MTK" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="active">Status</Label>
            <Select name="active" defaultValue="true">
              <SelectTrigger id="active" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Tidak aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
