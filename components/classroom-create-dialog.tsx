"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"

import { createClassroom } from "@/app/dashboard/kelas/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type MajorOption = {
  id: string
  name: string
  code: string
}

export function ClassroomCreateDialog({ majors }: { majors: MajorOption[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await createClassroom(formData)
        setOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal menyimpan kelas.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" disabled={majors.length === 0} />}>
        <Plus className="size-4" />
        Tambah Kelas
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kelas</DialogTitle>
          <DialogDescription>Buat kelas dan hubungkan dengan jurusan.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kelas</Label>
              <Input id="name" name="name" placeholder="X RPL 1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Tingkat</Label>
              <Select name="grade" required>
                <SelectTrigger id="grade" className="w-full">
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="X">X</SelectItem>
                  <SelectItem value="XI">XI</SelectItem>
                  <SelectItem value="XII">XII</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="majorId">Jurusan</Label>
            <Select name="majorId" required>
              <SelectTrigger id="majorId" className="w-full">
                <SelectValue placeholder="Pilih jurusan" />
              </SelectTrigger>
              <SelectContent>
                {majors.map((major) => (
                  <SelectItem key={major.id} value={major.id}>
                    {major.code} — {major.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
