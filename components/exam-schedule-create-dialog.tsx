"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"

import { createExamSchedule } from "@/app/dashboard/jadwal/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ScheduleBankOption = { id: string; code: string; title: string; subjectCode: string }
export type ScheduleClassroomOption = { id: string; name: string; majorCode: string }

export function ExamScheduleCreateDialog({ banks, classrooms }: { banks: ScheduleBankOption[]; classrooms: ScheduleClassroomOption[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const disabled = banks.length === 0 || classrooms.length === 0

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await createExamSchedule(formData)
        setOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal menyimpan jadwal.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" disabled={disabled} />}>
        <Plus className="size-4" />Tambah Jadwal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Jadwal</DialogTitle><DialogDescription>Atur bank soal untuk kelas tertentu, jam mulai, dan durasi.</DialogDescription></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="questionBankId">Bank Soal</Label><Select name="questionBankId" required><SelectTrigger id="questionBankId" className="w-full"><SelectValue placeholder="Pilih bank soal" /></SelectTrigger><SelectContent>{banks.map((bank) => <SelectItem key={bank.id} value={bank.id}>{bank.code} — {bank.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="classroomId">Kelas</Label><Select name="classroomId" required><SelectTrigger id="classroomId" className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger><SelectContent>{classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name} — {classroom.majorCode}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="examDate">Tanggal</Label><Input id="examDate" name="examDate" type="date" required /></div>
            <div className="space-y-2"><Label htmlFor="startTime">Jam Mulai</Label><Input id="startTime" name="startTime" type="time" required /></div>
            <div className="space-y-2"><Label htmlFor="durationMinutes">Durasi</Label><Input id="durationMinutes" name="durationMinutes" type="number" min="1" placeholder="90" required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="active">Status</Label><Select name="active" defaultValue="true"><SelectTrigger id="active" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
