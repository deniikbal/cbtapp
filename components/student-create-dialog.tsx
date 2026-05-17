"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createStudent } from "@/app/dashboard/peserta/actions"
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

export type ClassroomOption = {
  id: string
  name: string
  majorName: string
}

export function StudentCreateDialog({ classrooms }: { classrooms: ClassroomOption[] }) {
  const [open, setOpen] = useState(false)
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedClassroomId)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await createStudent(formData)
        toast.success("Peserta berhasil ditambahkan.")
        setSelectedClassroomId("")
        setOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan peserta."
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
          setSelectedClassroomId("")
          setError(null)
        }
      }}
    >
      <DialogTrigger render={<Button className="gap-2" disabled={classrooms.length === 0} />}>
        <Plus className="size-4" />
        Tambah Peserta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Peserta</DialogTitle>
          <DialogDescription>
            Buat akun peserta ujian dan hubungkan dengan kelas.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" placeholder="Nama lengkap" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nis">NIS</Label>
              <Input id="nis" name="nis" placeholder="2026001" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <Select name="active" defaultValue="true">
                <SelectTrigger id="active" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Tidak aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classroomId">Kelas</Label>
            <Select
              name="classroomId"
              value={selectedClassroomId}
              onValueChange={(value: string | null) => setSelectedClassroomId(value ?? "")}
              required
            >
              <SelectTrigger id="classroomId" className="w-full">
                <SelectValue placeholder="Pilih kelas">
                  {selectedClassroom
                    ? `${selectedClassroom.name} — ${selectedClassroom.majorName}`
                    : "Pilih kelas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name} — {classroom.majorName}
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
