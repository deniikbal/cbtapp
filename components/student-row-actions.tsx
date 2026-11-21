"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import { deleteStudent, findStudentsWithAttempts, updateStudent } from "@/app/dashboard/peserta/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type StudentRowActionData = {
  id: string
  name: string
  nis: string
  active: boolean
  classroomId: string
  session?: number
}

export type StudentClassroomOption = {
  id: string
  name: string
  majorName: string
}

export function StudentRowActions({
  student,
  classrooms,
}: {
  student: StudentRowActionData
  classrooms: StudentClassroomOption[]
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedClassroomId, setSelectedClassroomId] = useState(student.classroomId)
  const [error, setError] = useState<string | null>(null)
  const [hasAttempt, setHasAttempt] = useState(false)
  const [isPending, startTransition] = useTransition()
  const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedClassroomId)

  function handleUpdate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateStudent(formData)
        toast.success("Peserta berhasil diperbarui.")
        setEditOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal memperbarui peserta."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        await deleteStudent(student.id)
        toast.success("Peserta berhasil dihapus.")
        setDeleteOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menghapus peserta."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="size-11 rounded-sm sm:size-6" />}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">Aksi peserta</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit className="size-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen)
          if (nextOpen) {
            setSelectedClassroomId(student.classroomId)
            findStudentsWithAttempts([student.id])
              .then((ids) => setHasAttempt(ids.includes(student.id)))
              .catch(() => setHasAttempt(false))
          }
          if (!nextOpen) setError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Peserta</DialogTitle>
            <DialogDescription>Perbarui data login, kelas, dan status peserta.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <input type="hidden" name="id" value={student.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`name-${student.id}`}>Nama</Label>
                <Input id={`name-${student.id}`} name="name" defaultValue={student.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`nis-${student.id}`}>NIS</Label>
                <Input id={`nis-${student.id}`} name="nis" defaultValue={student.nis} required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`password-${student.id}`}>Password Baru</Label>
                <Input id={`password-${student.id}`} name="password" type="password" placeholder="Kosongkan jika tidak diganti" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`active-${student.id}`}>Status</Label>
                <Select name="active" defaultValue={String(student.active)}>
                  <SelectTrigger id={`active-${student.id}`} className="w-full">
                    <SelectValue>{student.active ? "Aktif" : "Tidak aktif"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Tidak aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`session-${student.id}`}>Sesi</Label>
              <Select name="session" defaultValue={String(student.session ?? 1)}>
                <SelectTrigger id={`session-${student.id}`} className="w-full">
                  <SelectValue>{`Sesi ${student.session ?? 1}`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sesi 1</SelectItem>
                  <SelectItem value="2">Sesi 2</SelectItem>
                  <SelectItem value="3">Sesi 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`classroom-${student.id}`}>Kelas</Label>
              <Select
                name="classroomId"
                value={selectedClassroomId}
                onValueChange={(value: string | null) => setSelectedClassroomId(value ?? "")}
                required
              >
                <SelectTrigger id={`classroom-${student.id}`} className="w-full">
                  <SelectValue>
                    {selectedClassroom
                      ? `${selectedClassroom.name} - ${selectedClassroom.majorName}`
                      : "Pilih kelas"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name} - {classroom.majorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasAttempt && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                <span className="font-medium">Perhatian:</span> peserta ini sudah memiliki percobaan ujian tercatat pada jadwal sesi lama. Setelah sesi diubah, dia tidak bisa melanjutkan pengerjaan lama dan akan mengerjakan ulang melalui jadwal sesi baru.
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus peserta?</AlertDialogTitle>
            <AlertDialogDescription>
              Peserta “{student.name}” akan dihapus permanen dan tidak bisa login lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
