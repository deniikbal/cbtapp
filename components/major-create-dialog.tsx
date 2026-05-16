"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"

import { createMajor } from "@/app/dashboard/jurusan/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function MajorCreateDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await createMajor(formData)
        setOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal menyimpan jurusan.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Tambah Jurusan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Jurusan</DialogTitle>
          <DialogDescription>Buat data jurusan untuk pengelompokan kelas.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Jurusan</Label>
            <Input id="name" name="name" placeholder="Rekayasa Perangkat Lunak" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Kode</Label>
            <Input id="code" name="code" placeholder="RPL" required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
