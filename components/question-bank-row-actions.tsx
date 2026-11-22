"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, FilePlus2, FileUp, Loader2, RefreshCw, Trash2 } from "lucide-react"

import { buatFormDariBank, deleteQuestionBank, sinkronFormItems, updateQuestionBank } from "@/app/dashboard/bank-soal/actions"
import Link from "next/link"
import type { SubjectOption } from "@/components/question-bank-create-dialog"
import { TeacherCombobox, type TeacherOption } from "@/components/teacher-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type QuestionBankRowActionData = { id: string; code: string; title: string; teacherName: string; teacherId: string | null; teacherIds?: string[]; grade: string; majorId?: string | null; proctorIds?: string[]; googleFormUrl: string; formId: string; active: boolean; subjectId: string }

export function QuestionBankRowActions({ bank, subjects, teachers, majors = [] }: { bank: QuestionBankRowActionData; subjects: SubjectOption[]; teachers: TeacherOption[]; majors?: { id: string; name: string }[] }) {
  const [editOpen, setEditOpen] = useState(false)
  const [editMajorId, setEditMajorId] = useState(bank.majorId ?? "ALL")
  const editMajor = majors.find((major) => major.id === editMajorId)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buatOpen, setBuatOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    setError(null)
    formData.set("id", bank.id)
    startTransition(async () => {
      const result = await updateQuestionBank(formData)
      if (!result.ok) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setEditOpen(false)
    })
  }

  function handleSinkron(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const hasil = await sinkronFormItems(bank.id)
      if (!hasil.ok) {
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message)
    })
  }

  function handleBuatForm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const hasil = await buatFormDariBank(bank.id)
      if (!hasil.ok) {
        setError(hasil.message)
        toast.error(hasil.message)
        return
      }
      toast.success(hasil.message, {
        description: "Link siswa tersimpan. Untuk mengisi soal, buka link edit.",
        action: { label: "Edit form", onClick: () => window.open(hasil.editUrl, "_blank", "noopener") },
      })
      setBuatOpen(false)
    })
  }

  function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteQuestionBank(bank.id)
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        toast.success(result.message)
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
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="size-11 rounded-sm sm:size-6" />}><Edit className="size-4" aria-hidden="true" /><span className="sr-only">Edit bank soal</span></DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit Bank Soal</DialogTitle><DialogDescription>Kode dan judul dibuat otomatis. Ubah mapel, guru, link, atau status.</DialogDescription></DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Kode Otomatis</Label><Input value={bank.code} disabled /></div>
              <div className="space-y-2"><Label htmlFor={`subject-${bank.id}`}>Mapel</Label><Select name="subjectId" defaultValue={bank.subjectId} required><SelectTrigger id={`subject-${bank.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code} - {subject.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Judul Otomatis</Label><Input value={bank.title} disabled /></div>
            <div className="space-y-2"><Label htmlFor={`grade-${bank.id}`}>Kelas</Label><Select name="grade" defaultValue={bank.grade} required><SelectTrigger id={`grade-${bank.id}`} className="w-full"><SelectValue>{bank.grade}</SelectValue></SelectTrigger><SelectContent><SelectItem value="X">X</SelectItem><SelectItem value="XI">XI</SelectItem><SelectItem value="XII">XII</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor={`majorId-${bank.id}`}>Jurusan</Label><Select name="majorId" value={editMajorId} onValueChange={(value: string | null) => setEditMajorId(value ?? "ALL")}><SelectTrigger id={`majorId-${bank.id}`} className="w-full"><SelectValue>{editMajorId === "ALL" ? "Semua jurusan" : editMajor?.name ?? "Semua jurusan"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ALL">Semua jurusan</SelectItem>{majors.map((major) => <SelectItem key={major.id} value={major.id}>{major.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor={`proctor-${bank.id}`}>Proktor</Label><TeacherCombobox teachers={teachers} multiple defaultValues={bank.proctorIds ?? []} id={`proctor-${bank.id}`} name="proctorIds" /></div>
            <div className="space-y-2"><Label htmlFor={`teacher-${bank.id}`}>Guru Pengampu</Label><TeacherCombobox teachers={teachers} multiple defaultValues={bank.teacherIds?.length ? bank.teacherIds : bank.teacherId ? [bank.teacherId] : []} id={`teacher-${bank.id}`} /></div>
            <div className="space-y-2"><Label htmlFor={`url-${bank.id}`}>Link Google Form untuk siswa (opsional)</Label><Input id={`url-${bank.id}`} name="googleFormUrl" defaultValue={bank.googleFormUrl} placeholder="https://docs.google.com/forms/d/…/viewform" /><p className="text-xs text-muted-foreground">Link yang dibagikan ke siswa. Link edit otomatis diubah ke viewform.</p></div>
            <div className="space-y-2"><Label htmlFor={`formid-${bank.id}`}>Form ID (sync hasil)</Label><Input id={`formid-${bank.id}`} name="formId" defaultValue={bank.formId} placeholder="tempel link /d/…/edit atau ID-nya" /><p className="text-xs text-muted-foreground">Ambil dari URL saat form dibuka lewat tombol Edit. Link viewform/forms.gle tidak bisa dipakai.</p></div>
            <div className="space-y-2"><Label htmlFor={`active-${bank.id}`}>Status</Label><Select name="active" defaultValue={String(bank.active)}><SelectTrigger id={`active-${bank.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setEditOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-6"
              disabled={!bank.formId || isPending}
              title={bank.formId ? "Sinkron jumlah soal dari Google" : "Buat form dulu"}
              onClick={handleSinkron}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
              <span className="sr-only">Sinkron jumlah soal</span>
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-6"
              disabled={!bank.formId}
              title={bank.formId ? "Impor soal dari Word" : "Buat form dulu"}
              render={<Link href={`/dashboard/bank-soal/impor?bank=${bank.id}`} />}
            >
              <FileUp className="size-4" aria-hidden="true" />
              <span className="sr-only">Impor soal dari Word</span>
            </Button>
      <AlertDialog open={buatOpen} onOpenChange={setBuatOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="size-11 sm:size-6" disabled={Boolean(bank.formId)} title={bank.formId ? "Sudah punya form" : "Buat form kosong"} />}><FilePlus2 className="size-4" aria-hidden="true" /><span className="sr-only">Buat form kosong</span></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia><FilePlus2 className="size-5" aria-hidden="true" /></AlertDialogMedia><AlertDialogTitle>Buat form kosong?</AlertDialogTitle><AlertDialogDescription>Form baru berjudul “{bank.code} | {bank.title}” dibuat di akun Google sekolah (akun pemilik token) dalam <span className="font-medium">mode kuis</span>, sudah berisi butir wajib <span className="font-medium">NIS, Nama Lengkap, Kelas</span>, dan bagian kosong “Soal” untuk diisi guru. Yang disimpan ke bank soal: Form ID dan link siswa (viewform).</AlertDialogDescription></AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={handleBuatForm}>{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{isPending ? "Membuat..." : "Buat form"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-6" />}><Trash2 className="size-4" aria-hidden="true" /><span className="sr-only">Hapus bank soal</span></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia><Trash2 className="size-5" aria-hidden="true" /></AlertDialogMedia><AlertDialogTitle>Hapus bank soal?</AlertDialogTitle><AlertDialogDescription>Bank soal “{bank.title}” akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive/10 text-destructive hover:bg-destructive/20" disabled={isPending} onClick={handleDelete}>{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{isPending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
