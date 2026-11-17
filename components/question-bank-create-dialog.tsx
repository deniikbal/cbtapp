"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createQuestionBank } from "@/app/dashboard/bank-soal/actions"
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
}: {
  subjects: SubjectOption[]
  teachers?: TeacherOption[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId)

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
          setError(null)
        }
      }}
    >
      <DialogTrigger render={<Button className="gap-2" disabled={subjects.length === 0} />}>
        <Plus className="size-4" />
        Tambah Bank Soal
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Bank Soal</DialogTitle>
          <DialogDescription>Kode dan judul dibuat otomatis dari mapel agar konsisten.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subjectId">Mapel</Label>
            <Select
              name="subjectId"
              value={selectedSubjectId}
              onValueChange={(value: string | null) => setSelectedSubjectId(value ?? "")}
              required
            >
              <SelectTrigger id="subjectId" className="w-full"><SelectValue placeholder="Pilih mapel">{selectedSubject ? `${selectedSubject.code} — ${selectedSubject.name}` : "Pilih mapel"}</SelectValue></SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code} — {subject.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Kode dan judul akan mengikuti mapel dan kelas.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Kelas</Label>
            <Select name="grade" required>
              <SelectTrigger id="grade" className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="X">X</SelectItem>
                <SelectItem value="XI">XI</SelectItem>
                <SelectItem value="XII">XII</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Contoh kode otomatis: MTK-X, KIM-XI.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacherId">Guru Pembuat</Label>
            <TeacherCombobox teachers={teachers} id="teacherId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleFormUrl">Link Google Form untuk siswa (opsional)</Label>
            <Input id="googleFormUrl" name="googleFormUrl" placeholder="https://docs.google.com/forms/d/…/viewform" />
            <p className="text-xs text-muted-foreground">Link yang dibagikan ke siswa, bukan link edit. Kalau yang ditempel link edit, otomatis diubah ke viewform. Boleh dikosongkan — form bisa dibuat lewat tombol <span className="font-medium">Buat form kosong</span> di tabel.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="formId">Form ID (opsional, untuk sync hasil)</Label>
            <Input id="formId" name="formId" placeholder="tempel link /d/…/edit atau ID-nya" />
            <p className="text-xs text-muted-foreground">Diambil dari URL saat form dibuka lewat tombol Edit. Link viewform/forms.gle tidak bisa dipakai.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="active">Status</Label>
            <Select name="active" defaultValue="true">
              <SelectTrigger id="active" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
