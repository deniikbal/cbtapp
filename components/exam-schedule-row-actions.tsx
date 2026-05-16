"use client"

import { useState, useTransition } from "react"
import { Edit, Loader2, Trash2 } from "lucide-react"

import { deleteExamSchedule, updateExamSchedule } from "@/app/dashboard/jadwal/actions"
import type { ScheduleBankOption, ScheduleClassroomOption } from "@/components/exam-schedule-create-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ScheduleRowActionData = { id: string; questionBankId: string; classroomId: string; examDate: string; startTime: string; durationMinutes: number; active: boolean; title: string }

export function ExamScheduleRowActions({ schedule, banks, classrooms }: { schedule: ScheduleRowActionData; banks: ScheduleBankOption[]; classrooms: ScheduleClassroomOption[] }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    setError(null)
    formData.set("id", schedule.id)
    startTransition(async () => {
      try {
        await updateExamSchedule(formData)
        setEditOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal mengubah jadwal.")
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteExamSchedule(schedule.id)
      setDeleteOpen(false)
    })
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}><Edit className="size-4" /><span className="sr-only">Edit jadwal</span></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Jadwal</DialogTitle><DialogDescription>Ubah bank soal, kelas, tanggal, jam mulai, durasi, atau status.</DialogDescription></DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2"><Label>Bank Soal</Label><Select name="questionBankId" defaultValue={schedule.questionBankId} required><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{banks.map((bank) => <SelectItem key={bank.id} value={bank.id}>{bank.code} — {bank.title}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Kelas</Label><Select name="classroomId" defaultValue={schedule.classroomId} required><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name} — {classroom.majorCode}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Tanggal</Label><Input name="examDate" type="date" defaultValue={schedule.examDate} required /></div><div className="space-y-2"><Label>Jam Mulai</Label><Input name="startTime" type="time" defaultValue={schedule.startTime.slice(0, 5)} required /></div><div className="space-y-2"><Label>Durasi</Label><Input name="durationMinutes" type="number" min="1" defaultValue={schedule.durationMinutes} required /></div></div>
            <div className="space-y-2"><Label>Status</Label><Select name="active" defaultValue={String(schedule.active)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}><Trash2 className="size-4" /><span className="sr-only">Hapus jadwal</span></AlertDialogTrigger>
        <AlertDialogContent><AlertDialogHeader><AlertDialogMedia><Trash2 className="size-5" /></AlertDialogMedia><AlertDialogTitle>Hapus jadwal?</AlertDialogTitle><AlertDialogDescription>Jadwal “{schedule.title}” akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive/10 text-destructive hover:bg-destructive/20" disabled={isPending} onClick={handleDelete}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
