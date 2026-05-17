"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createQuestionBank } from "@/app/dashboard/bank-soal/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SubjectOption = { id: string; name: string; code: string }

export function QuestionBankCreateDialog({ subjects }: { subjects: SubjectOption[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await createQuestionBank(formData)
        toast.success("Bank soal berhasil ditambahkan.")
        setOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan bank soal."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Select name="subjectId" required>
              <SelectTrigger id="subjectId" className="w-full"><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
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
            <Label htmlFor="teacherName">Nama Guru Pembuat</Label>
            <Input id="teacherName" name="teacherName" placeholder="Nama guru" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleFormUrl">Link Google Form</Label>
            <Input id="googleFormUrl" name="googleFormUrl" placeholder="https://forms.gle/..." required />
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
