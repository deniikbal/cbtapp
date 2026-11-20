"use client"

import { useMemo, useState, useTransition } from "react"
import { BookOpen, Download, ExternalLink, FileText, LinkIcon, Loader2, RotateCcw, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteQuestionBanks } from "@/app/dashboard/bank-soal/actions"
import { QuestionBankCreateDialog } from "@/components/question-bank-create-dialog"
import type { TeacherOption } from "@/components/teacher-combobox"
import { QuestionBankRowActions } from "@/components/question-bank-row-actions"
import { SubjectCreateDialog } from "@/components/subject-create-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type QuestionBankManagementRow = {
  id: string
  code: string
  title: string
  teacherName: string
  teacherId: string | null
  grade: string
  googleFormUrl: string
  formId: string
  syncedAt: Date | null
  active: boolean
  subjectId: string
  subjectName: string
  subjectCode: string
  formItems: unknown | null
}

export type QuestionBankManagementSubject = {
  id: string
  name: string
  code: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export function QuestionBankManagementCard({
  rows,
  subjects,
  teachers,
}: {
  rows: QuestionBankManagementRow[]
  subjects: QuestionBankManagementSubject[]
  teachers: TeacherOption[]
}) {
  const [search, setSearch] = useState("")
  const [subjectId, setSubjectId] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDelete] = useTransition()
  const selectedSubject = subjects.find((subject) => subject.id === subjectId)
  const hasActiveFilter = search.trim() !== "" || subjectId !== "ALL" || status !== "ALL"

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return rows.filter((row) => {
      if (subjectId !== "ALL" && row.subjectId !== subjectId) return false
      if (status === "ACTIVE" && !row.active) return false
      if (status === "INACTIVE" && row.active) return false
      if (!keyword) return true

      return [row.code, row.title, row.teacherName, row.grade, row.subjectName, row.subjectCode]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    })
  }, [rows, search, subjectId, status])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = (activePage - 1) * pageSize
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize)
  const from = filteredRows.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, filteredRows.length)

  const pageIds = paginatedRows.map((row) => row.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

  function toggleRow(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  function togglePage() {
    setSelectedIds((prev) => (allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]))
  }

  function handleBulkDelete() {
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteQuestionBanks(selectedIds)
      if (!result.ok) {
        setDeleteError(result.message)
        toast.error(result.message)
        return
      }
      setSelectedIds([])
      toast.success(result.message)
    })
  }

  function resetFilters() {
    setSearch("")
    setSubjectId("ALL")
    setStatus("ALL")
    setCurrentPage(1)
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Daftar Bank Soal</CardTitle>
              <Badge variant="secondary" className="font-normal">{filteredRows.length} hasil</Badge>
            </div>
            <CardDescription>Bank soal hanya menyimpan kode, mapel, dan link Google Form. Durasi nanti di jadwal.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            {selectedIds.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" className="gap-2" disabled={deletePending} />}>
                  {deletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Hapus terpilih ({selectedIds.length})
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus {selectedIds.length} bank soal?</AlertDialogTitle>
                    <AlertDialogDescription>Bank soal yang masih dipakai jadwal akan dilewati. Sisanya dihapus permanen.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleBulkDelete}>Hapus</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" className="gap-2"><Download className="size-4" />Export</Button>
            {subjects.length === 0 ? <SubjectCreateDialog /> : <QuestionBankCreateDialog subjects={subjects} teachers={teachers} />}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Label htmlFor="search-bank" className="sr-only">Cari bank soal</Label>
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search-bank" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} placeholder="Cari kode, judul, atau mapel..." className="pl-8" />
          </div>
          <div className="md:col-span-3">
            <Select value={subjectId} onValueChange={(value) => { setSubjectId(value ?? "ALL"); setCurrentPage(1) }}>
              <SelectTrigger className="w-full"><div className="flex items-center gap-2 truncate"><BookOpen className="size-4 text-muted-foreground" /><SelectValue>{selectedSubject ? selectedSubject.code : "Semua mapel"}</SelectValue></div></SelectTrigger>
              <SelectContent align="start"><SelectItem value="ALL">Semua mapel</SelectItem>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code} — {subject.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={status} onValueChange={(value) => { setStatus(value ?? "ALL"); setCurrentPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue>{status === "ACTIVE" ? "Aktif" : status === "INACTIVE" ? "Tidak aktif" : "Semua"}</SelectValue></SelectTrigger>
              <SelectContent align="start"><SelectItem value="ALL">Semua</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Tidak aktif</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Button variant="outline" className="w-full gap-2" disabled={!hasActiveFilter} onClick={resetFilters}><RotateCcw className="size-4" />Reset</Button></div>
        </div>
        {deleteError && <p className="mt-3 text-sm text-destructive" role="alert">{deleteError}</p>}
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-10"><Checkbox checked={allPageSelected} onCheckedChange={togglePage} aria-label="Pilih semua bank soal di halaman ini" /></TableHead><TableHead className="w-12 text-center">#</TableHead><TableHead>Kode Soal</TableHead><TableHead>Judul</TableHead><TableHead>Kelas</TableHead><TableHead>Guru</TableHead><TableHead>Mapel</TableHead><TableHead className="text-center">Soal</TableHead><TableHead>Link GForm</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={11} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><FileText className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">{hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada bank soal"}</div><p className="text-sm">{hasActiveFilter ? "Coba ubah kata kunci atau atur ulang filter." : subjects.length === 0 ? "Tambahkan mapel terlebih dahulu." : "Tambahkan link Google Form untuk mulai membuat jadwal."}</p></div>{hasActiveFilter ? <Button size="sm" variant="outline" onClick={resetFilters}>Reset filter</Button> : subjects.length === 0 ? <SubjectCreateDialog /> : <QuestionBankCreateDialog subjects={subjects} teachers={teachers} />}</div></TableCell></TableRow>
              ) : paginatedRows.map((row, index) => (
                <TableRow key={row.id} data-state={selectedIds.includes(row.id) ? "selected" : undefined} className="transition-colors data-[state=selected]:bg-muted/60 hover:bg-muted/40"><TableCell><Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleRow(row.id)} aria-label={`Pilih ${row.code}`} /></TableCell><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{startIndex + index + 1}</TableCell><TableCell><Badge variant="outline" className="font-mono font-normal">{row.code}</Badge></TableCell><TableCell className="font-medium">{row.title}</TableCell><TableCell><Badge variant="outline" className="font-normal">{row.grade}</Badge></TableCell><TableCell>{row.teacherName || "—"}</TableCell><TableCell><div className="flex flex-col"><span>{row.subjectName}</span><span className="text-xs text-muted-foreground">{row.subjectCode}</span></div></TableCell><TableCell className="text-center"><div className="flex flex-col items-center"><span className="text-sm font-medium tabular-nums">{row.formId ? hitungSoal(row.formItems) : "—"}</span>{row.syncedAt ? <span className="text-[10px] text-muted-foreground">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(row.syncedAt))}</span> : null}</div></TableCell><TableCell><div className="flex items-center gap-1">{row.googleFormUrl ? <Button nativeButton={false} variant="ghost" size="sm" className="gap-2" render={<a href={row.googleFormUrl} target="_blank" rel="noreferrer" />}><LinkIcon className="size-4" />Siswa <ExternalLink className="size-3" /></Button> : <span className="text-sm text-muted-foreground">Belum ada form</span>}{row.formId && <Button nativeButton={false} variant="ghost" size="sm" className="gap-2" render={<a href={`https://docs.google.com/forms/d/${row.formId}/edit`} target="_blank" rel="noreferrer" />}><FileText className="size-4" />Edit <ExternalLink className="size-3" /></Button>}</div></TableCell><TableCell><Badge variant="secondary" className={cn("font-normal", row.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300")}>{row.active ? "Aktif" : "Tidak aktif"}</Badge></TableCell><TableCell><QuestionBankRowActions bank={row} subjects={subjects} teachers={teachers} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">Menampilkan <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> dari <span className="font-medium text-foreground">{filteredRows.length}</span> entri</p>
            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Per halaman</span><Select value={String(pageSize)} onValueChange={(value) => { if (!value) return; setPageSize(Number(value)); setCurrentPage(1) }}><SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger><SelectContent align="end">{PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent></Select></div>
          </div>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><PaginationPrevious href="#" text="Sebelumnya" className={activePage === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.max(1, page - 1)) }} /></PaginationItem>{pageRange.map((page, index) => page === "..." ? <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink href="#" isActive={page === activePage} onClick={(event) => { event.preventDefault(); setCurrentPage(page) }}>{page}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" text="Berikutnya" className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.min(totalPages, page + 1)) }} /></PaginationItem></PaginationContent></Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function hitungSoal(formItems: unknown): number {
  if (!Array.isArray(formItems)) return 0
  return formItems.filter((item) => {
    if (typeof item !== "object" || item === null) return false
    const q = (item as { questionItem?: { question?: { grading?: { pointValue?: number } } } }).questionItem?.question
    return (q?.grading?.pointValue ?? 0) > 0
  }).length
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const range: (number | "...")[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)

  if (left > 2) range.push("...")
  for (let page = left; page <= right; page++) range.push(page)
  if (right < total - 1) range.push("...")
  range.push(total)

  return range
}
