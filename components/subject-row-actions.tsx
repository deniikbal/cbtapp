"use client"

import { useState, useTransition } from "react"
import { Edit, Loader2, Trash2 } from "lucide-react"

import { deleteSubject, updateSubject } from "@/app/dashboard/mapel/actions"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SubjectRowActionData = { id: string; name: string; code: string; active: boolean }

export function SubjectRowActions({ subject }: { subject: SubjectRowActionData }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    setError(null)
    formData.set("id", subject.id)
    startTransition(async () => {
      try {
        await updateSubject(formData)
        setEditOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal mengubah mapel.")
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSubject(subject.id)
      setDeleteOpen(false)
    })
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <Edit className="size-4" />
          <span className="sr-only">Edit mapel</span>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mapel</DialogTitle>
            <DialogDescription>Ubah nama, kode, atau status mapel.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`name-${subject.id}`}>Nama Mapel</Label>
                <Input id={`name-${subject.id}`} name="name" defaultValue={subject.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`code-${subject.id}`}>Kode</Label>
                <Input id={`code-${subject.id}`} name="code" defaultValue={subject.code} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`active-${subject.id}`}>Status</Label>
              <Select name="active" defaultValue={String(subject.active)}>
                <SelectTrigger id={`active-${subject.id}`} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Tidak aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}>
          <Trash2 className="size-4" />
          <span className="sr-only">Hapus mapel</span>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><Trash2 className="size-5" /></AlertDialogMedia>
            <AlertDialogTitle>Hapus mapel?</AlertDialogTitle>
            <AlertDialogDescription>Mapel “{subject.name}” akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive/10 text-destructive hover:bg-destructive/20" disabled={isPending} onClick={handleDelete}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
