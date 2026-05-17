"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, Loader2, Trash2 } from "lucide-react"

import { deleteExamSchedule, updateExamSchedule } from "@/app/dashboard/jadwal/actions"
import type { ScheduleBankOption, ScheduleClassroomOption } from "@/components/exam-schedule-create-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type ScheduleRowActionData = { id: string; questionBankId: string; classroomId: string; examDate: string; startTime: string; durationMinutes: number; active: boolean; title: string }

export function ExamScheduleRowActions({ schedule, banks, classrooms }: { schedule: ScheduleRowActionData; banks: ScheduleBankOption[]; classrooms: ScheduleClassroomOption[] }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState(schedule.questionBankId)
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([schedule.classroomId])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedBank = banks.find((bank) => bank.id === selectedBankId)
  const allSelected = classrooms.length > 0 && selectedClassroomIds.length === classrooms.length

  function toggleClassroom(id: string) {
    setSelectedClassroomIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function toggleAllClassrooms() {
    setSelectedClassroomIds(allSelected ? [] : classrooms.map((classroom) => classroom.id))
  }

  function handleUpdate(formData: FormData) {
    setError(null)
    formData.set("id", schedule.id)

    if (selectedClassroomIds.length === 0) {
      const message = "Pilih minimal satu kelas."
      setError(message)
      toast.error(message)
      return
    }

    startTransition(async () => {
      try {
        const result = await updateExamSchedule(formData)
        toast.success(
          result.created > 0 || result.skipped > 0
            ? `Jadwal diperbarui. ${result.created} jadwal tambahan dibuat, ${result.skipped} duplikat dilewati.`
            : "Jadwal berhasil diperbarui."
        )
        setEditOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal mengubah jadwal."
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
        await deleteExamSchedule(schedule.id)
        toast.success("Jadwal berhasil dihapus.")
        setDeleteOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menghapus jadwal."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen)
          if (nextOpen) {
            setSelectedBankId(schedule.questionBankId)
            setSelectedClassroomIds([schedule.classroomId])
          }
          if (!nextOpen) setError(null)
        }}
      >
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}><Edit className="size-4" /><span className="sr-only">Edit jadwal</span></DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit Jadwal</DialogTitle><DialogDescription>Ubah bank soal, pilih satu atau beberapa kelas, tanggal, jam mulai, durasi, atau status.</DialogDescription></DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Soal</Label>
              <Select name="questionBankId" value={selectedBankId} onValueChange={(value: string | null) => setSelectedBankId(value ?? "")} required>
                <SelectTrigger className="w-full"><SelectValue>{selectedBank ? `${selectedBank.code} — ${selectedBank.title}` : "Pilih bank soal"}</SelectValue></SelectTrigger>
                <SelectContent>{banks.map((bank) => <SelectItem key={bank.id} value={bank.id}>{bank.code} — {bank.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Kelas</Label>
                <Button type="button" variant="outline" size="sm" onClick={toggleAllClassrooms}>
                  {allSelected ? "Hapus pilihan" : "Pilih semua"}
                </Button>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border p-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {classrooms.map((classroom) => {
                    const checked = selectedClassroomIds.includes(classroom.id)

                    return (
                      <label key={classroom.id} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted/60", checked && "border-primary bg-primary/10")}>
                        <input type="checkbox" name="classroomIds" value={classroom.id} checked={checked} onChange={() => toggleClassroom(classroom.id)} className="size-4 accent-primary" />
                        <span className="min-w-0"><span className="block font-medium">{classroom.name}</span><span className="block text-xs text-muted-foreground">{classroom.majorCode}</span></span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{selectedClassroomIds.length} kelas dipilih. Baris jadwal ini akan diperbarui, kelas tambahan akan dibuat sebagai jadwal baru.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Tanggal</Label><Input name="examDate" type="date" defaultValue={schedule.examDate} required /></div><div className="space-y-2"><Label>Jam Mulai</Label><Input name="startTime" type="time" defaultValue={schedule.startTime.slice(0, 5)} required /></div><div className="space-y-2"><Label>Durasi</Label><Input name="durationMinutes" type="number" min="1" defaultValue={schedule.durationMinutes} required /></div></div>
            <div className="space-y-2"><Label>Status</Label><Select name="active" defaultValue={String(schedule.active)}><SelectTrigger className="w-full"><SelectValue>{schedule.active ? "Aktif" : "Tidak aktif"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}><Trash2 className="size-4" /><span className="sr-only">Hapus jadwal</span></AlertDialogTrigger>
        <AlertDialogContent><AlertDialogHeader><AlertDialogMedia><Trash2 className="size-5" /></AlertDialogMedia><AlertDialogTitle>Hapus jadwal?</AlertDialogTitle><AlertDialogDescription>Jadwal “{schedule.title}” akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>{error && <p className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive/10 text-destructive hover:bg-destructive/20" disabled={isPending} onClick={handleDelete}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
