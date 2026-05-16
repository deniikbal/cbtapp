"use client"

import { useState, useTransition } from "react"
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
        setOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal menyimpan bank soal.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" disabled={subjects.length === 0} />}>
        <Plus className="size-4" />
        Tambah Bank Soal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Bank Soal</DialogTitle>
          <DialogDescription>Simpan kode soal, mapel, dan link Google Form.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Soal</Label>
              <Input id="code" name="code" placeholder="MTK-X-001" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectId">Mapel</Label>
              <Select name="subjectId" required>
                <SelectTrigger id="subjectId" className="w-full"><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code} — {subject.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" name="title" placeholder="Ujian Matematika Kelas X" required />
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
