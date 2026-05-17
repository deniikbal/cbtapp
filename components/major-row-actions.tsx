"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import { deleteMajor, updateMajor } from "@/app/dashboard/jurusan/actions"
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

export type MajorRowActionData = {
  id: string
  name: string
  code: string
  classCount: number
}

export function MajorRowActions({ major }: { major: MajorRowActionData }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateMajor(formData)
        toast.success("Jurusan berhasil diperbarui.")
        setEditOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal memperbarui jurusan."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        await deleteMajor(major.id)
        toast.success("Jurusan berhasil dihapus.")
        setDeleteOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menghapus jurusan."
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
            <span className="sr-only">Aksi jurusan</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={major.classCount > 0}
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
            <DialogTitle>Edit Jurusan</DialogTitle>
            <DialogDescription>Perbarui nama dan kode jurusan.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <input type="hidden" name="id" value={major.id} />
            <div className="space-y-2">
              <Label htmlFor={`name-${major.id}`}>Nama Jurusan</Label>
              <Input id={`name-${major.id}`} name="name" defaultValue={major.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`code-${major.id}`}>Kode</Label>
              <Input id={`code-${major.id}`} name="code" defaultValue={major.code} required />
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
            <AlertDialogTitle>Hapus jurusan?</AlertDialogTitle>
            <AlertDialogDescription>
              Jurusan “{major.name}” akan dihapus permanen. Jurusan yang sudah memiliki kelas tidak dapat dihapus.
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
