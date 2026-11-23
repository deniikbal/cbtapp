"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createQuestionBank } from "@/app/dashboard/bank-soal/actions"
import { LabelHint } from "@/components/label-hint"
import { TeacherCombobox, type TeacherOption } from "@/components/teacher-combobox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SubjectOption = { id: string; name: string; code: string }

export function QuestionBankCreateDialog({
  subjects,
  teachers = [],
  majors = [],
}: {
  subjects: SubjectOption[]
  teachers?: TeacherOption[]
  majors?: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [selectedMajorId, setSelectedMajorId] = useState("ALL")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId)
  const selectedMajor = majors.find((major) => major.id === selectedMajorId)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createQuestionBank(formData)
      if (!result.ok) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setSelectedSubjectId("")
      setSelectedMajorId("ALL")
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSelectedSubjectId("")
          setSelectedMajorId("ALL")
          setError(null)
        }
      }}
    >
      <DialogTrigger render={<Button className="gap-2" disabled={subjects.length === 0} />}>
        <Plus className="size-4" aria-hidden="true" />
        Tambah Bank Soal
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Bank Soal</DialogTitle>
          <DialogDescription>Kode dan judul dibuat otomatis dari mapel.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="subjectId">Mapel</Label><Select name="subjectId" value={selectedSubjectId} onValueChange={(value: string | null) => setSelectedSubjectId(value ?? "")} required><SelectTrigger id="subjectId" className="w-full"><SelectValue placeholder="Pilih mapel">{selectedSubject ? `${selectedSubject.code} - ${selectedSubject.name}` : "Pilih mapel"}</SelectValue></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code} - {subject.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="grade">Kelas</Label><Select name="grade" required><SelectTrigger id="grade" className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger><SelectContent><SelectItem value="X">X</SelectItem><SelectItem value="XI">XI</SelectItem><SelectItem value="XII">XII</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><span className="flex items-center gap-1.5"><Label htmlFor="majorId">Jurusan</Label><LabelHint text="Menentukan daftar kelas di Google Form (mis. IPA saja)." /></span><Select name="majorId" value={selectedMajorId} onValueChange={(value: string | null) => setSelectedMajorId(value ?? "ALL")}><SelectTrigger id="majorId" className="w-full"><SelectValue>{selectedMajorId === "ALL" ? "Semua jurusan" : selectedMajor?.name ?? "Semua jurusan"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ALL">Semua jurusan</SelectItem>{majors.map((major) => <SelectItem key={major.id} value={major.id}>{major.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="active">Status</Label><Select name="active" defaultValue="true"><SelectTrigger id="active" className="w-full"><SelectValue>Aktif</SelectValue></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="teacherIds">Guru Pengampu</Label><TeacherCombobox teachers={teachers} multiple id="teacherIds" /></div>
            <div className="space-y-1.5"><span className="flex items-center gap-1.5"><Label htmlFor="proctorIds">Proktor</Label><LabelHint text="Proktor bisa mengimpor soal dari Word lewat login NIP." /></span><TeacherCombobox teachers={teachers} multiple id="proctorIds" name="proctorIds" /></div>
            <div className="space-y-1.5"><Label htmlFor="googleFormUrl">Link Google Form (opsional)</Label><Input id="googleFormUrl" name="googleFormUrl" placeholder="https://docs.google.com/forms/d/…/viewform" /><p className="text-xs text-muted-foreground">Link edit otomatis jadi viewform; boleh kosong, buat lewat tombol Buat form kosong.</p></div>
            <div className="space-y-1.5"><Label htmlFor="formId">Form ID (opsional)</Label><Input id="formId" name="formId" placeholder="link /d/…/edit atau ID-nya" /><p className="text-xs text-muted-foreground">Untuk sync hasil; link viewform/forms.gle tidak bisa dipakai.</p></div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
