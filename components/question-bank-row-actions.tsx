"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, Loader2, Trash2 } from "lucide-react"

import { deleteQuestionBank, updateQuestionBank } from "@/app/dashboard/bank-soal/actions"
import type { SubjectOption } from "@/components/question-bank-create-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type QuestionBankRowActionData = { id: string; code: string; title: string; teacherName: string; grade: string; googleFormUrl: string; active: boolean; subjectId: string }

export function QuestionBankRowActions({ bank, subjects }: { bank: QuestionBankRowActionData; subjects: SubjectOption[] }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    setError(null)
    formData.set("id", bank.id)
    startTransition(async () => {
      try {
        await updateQuestionBank(formData)
        toast.success("Bank soal berhasil diperbarui.")
        setEditOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal mengubah bank soal."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await deleteQuestionBank(bank.id)
        toast.success("Bank soal berhasil dihapus.")
        setDeleteOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menghapus bank soal."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}><Edit className="size-4" /><span className="sr-only">Edit bank soal</span></DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit Bank Soal</DialogTitle><DialogDescription>Kode dan judul dibuat otomatis. Ubah mapel, guru, link, atau status.</DialogDescription></DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Kode Otomatis</Label><Input value={bank.code} disabled /></div>
              <div className="space-y-2"><Label htmlFor={`subject-${bank.id}`}>Mapel</Label><Select name="subjectId" defaultValue={bank.subjectId} required><SelectTrigger id={`subject-${bank.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code} — {subject.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Judul Otomatis</Label><Input value={bank.title} disabled /></div>
            <div className="space-y-2"><Label htmlFor={`grade-${bank.id}`}>Kelas</Label><Select name="grade" defaultValue={bank.grade} required><SelectTrigger id={`grade-${bank.id}`} className="w-full"><SelectValue>{bank.grade}</SelectValue></SelectTrigger><SelectContent><SelectItem value="X">X</SelectItem><SelectItem value="XI">XI</SelectItem><SelectItem value="XII">XII</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor={`teacher-${bank.id}`}>Nama Guru Pembuat</Label><Input id={`teacher-${bank.id}`} name="teacherName" defaultValue={bank.teacherName} required /></div>
            <div className="space-y-2"><Label htmlFor={`url-${bank.id}`}>Link Google Form</Label><Input id={`url-${bank.id}`} name="googleFormUrl" defaultValue={bank.googleFormUrl} required /></div>
            <div className="space-y-2"><Label htmlFor={`active-${bank.id}`}>Status</Label><Select name="active" defaultValue={String(bank.active)}><SelectTrigger id={`active-${bank.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}><Trash2 className="size-4" /><span className="sr-only">Hapus bank soal</span></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia><Trash2 className="size-5" /></AlertDialogMedia><AlertDialogTitle>Hapus bank soal?</AlertDialogTitle><AlertDialogDescription>Bank soal “{bank.title}” akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive/10 text-destructive hover:bg-destructive/20" disabled={isPending} onClick={handleDelete}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
