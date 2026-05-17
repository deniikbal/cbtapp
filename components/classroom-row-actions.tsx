"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import { deleteClassroom, updateClassroom } from "@/app/dashboard/kelas/actions"
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

export type ClassroomRowActionData = {
  id: string
  name: string
  grade: string
  majorId: string
  studentCount: number
}

export type ClassroomMajorOption = {
  id: string
  name: string
  code: string
}

export function ClassroomRowActions({
  classroom,
  majors,
}: {
  classroom: ClassroomRowActionData
  majors: ClassroomMajorOption[]
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedMajor = majors.find((major) => major.id === classroom.majorId)

  function handleUpdate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateClassroom(formData)
        toast.success("Kelas berhasil diperbarui.")
        setEditOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal memperbarui kelas."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        await deleteClassroom(classroom.id)
        toast.success("Kelas berhasil dihapus.")
        setDeleteOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menghapus kelas."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Aksi kelas</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={classroom.studentCount > 0}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kelas</DialogTitle>
            <DialogDescription>Perbarui nama kelas, tingkat, dan jurusan.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <input type="hidden" name="id" value={classroom.id} />
            <div className="space-y-2">
              <Label htmlFor={`name-${classroom.id}`}>Nama Kelas</Label>
              <Input id={`name-${classroom.id}`} name="name" defaultValue={classroom.name} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`grade-${classroom.id}`}>Tingkat</Label>
                <Select name="grade" defaultValue={classroom.grade} required>
                  <SelectTrigger id={`grade-${classroom.id}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">X</SelectItem>
                    <SelectItem value="XI">XI</SelectItem>
                    <SelectItem value="XII">XII</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`major-${classroom.id}`}>Jurusan</Label>
                <Select name="majorId" defaultValue={classroom.majorId} required>
                  <SelectTrigger id={`major-${classroom.id}`} className="w-full">
                    <SelectValue>
                      {selectedMajor ? `${selectedMajor.code} — ${selectedMajor.name}` : "Pilih jurusan"}
                    </SelectValue>
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
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelas “{classroom.name}” akan dihapus permanen. Kelas yang sudah memiliki peserta tidak dapat dihapus.
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
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
