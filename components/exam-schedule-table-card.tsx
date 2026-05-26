"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { CalendarDays, Clock3, RotateCcw, Search } from "lucide-react"

import { ExamScheduleCreateDialog, type ScheduleBankOption, type ScheduleClassroomOption } from "@/components/exam-schedule-create-dialog"
import { ExamScheduleRowActions } from "@/components/exam-schedule-row-actions"
import { ExamScheduleStatusSwitch } from "@/components/exam-schedule-status-switch"
import { QuestionBankCreateDialog } from "@/components/question-bank-create-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const naturalClassroomCollator = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })
const subscribe = () => () => {}

type ScheduleRow = { id: string; questionBankId: string; classroomId: string; examDate: string; startTime: string; durationMinutes: number; active: boolean; title: string; code: string; className: string; majorCode: string; subjectCode: string }

type ScheduleGroup = Omit<ScheduleRow, "id" | "classroomId" | "className" | "majorCode" | "active"> & {
  key: string
  rows: ScheduleRow[]
  activeCount: number
}

export function ExamScheduleTableCard({ rows, banks, classrooms }: { rows: ScheduleRow[]; banks: ScheduleBankOption[]; classrooms: ScheduleClassroomOption[] }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const [search, setSearch] = useState("")
  const [classroomFilter, setClassroomFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [todayOnly, setTodayOnly] = useState(false)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [currentPage, setCurrentPage] = useState(1)

  const groupedRows = useMemo(() => groupScheduleRows(rows), [rows])
  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return groupedRows.filter((group) => {
      if (classroomFilter !== "ALL" && !group.rows.some((row) => row.classroomId === classroomFilter)) return false
      if (statusFilter === "ACTIVE" && group.activeCount !== group.rows.length) return false
      if (statusFilter === "INACTIVE" && group.activeCount === group.rows.length) return false
      if (todayOnly && group.examDate !== getTodayDateValue()) return false
      if (!keyword) return true

      return [group.title, group.code, group.subjectCode, group.examDate, ...group.rows.map((row) => `${row.className} ${row.majorCode}`)]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    })
  }, [groupedRows, search, classroomFilter, statusFilter, todayOnly])

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const from = total === 0 ? 0 : (activePage - 1) * pageSize + 1
  const to = Math.min(activePage * pageSize, total)
  const pageRange = buildPageRange(activePage, totalPages)
  const paginatedRows = filteredRows.slice((activePage - 1) * pageSize, activePage * pageSize)
  const hasActiveFilter = search.trim() !== "" || classroomFilter !== "ALL" || statusFilter !== "ALL" || todayOnly

  function handleSearchChange(value: string) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handleClassroomFilterChange(value: string | null) {
    setClassroomFilter(value || "ALL")
    setCurrentPage(1)
  }

  function handleStatusFilterChange(value: string | null) {
    setStatusFilter(value || "ALL")
    setCurrentPage(1)
  }

  function handleTodayFilterClick() {
    setTodayOnly((current) => !current)
    setCurrentPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) return
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearch("")
    setClassroomFilter("ALL")
    setStatusFilter("ALL")
    setTodayOnly(false)
    setCurrentPage(1)
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Daftar Jadwal</CardTitle>
              <Badge variant="secondary" className="font-normal">{groupedRows.length} hasil</Badge>
            </div>
            <CardDescription>Jadwal berisi bank soal, kelas, tanggal, jam mulai, dan durasi.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Memuat tabel jadwal...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Daftar Jadwal</CardTitle>
              <Badge variant="secondary" className="font-normal">{filteredRows.length} hasil</Badge>
            </div>
            <CardDescription>Jadwal berisi bank soal, kelas, tanggal, jam mulai, dan durasi.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            {banks.length === 0 ? <QuestionBankCreateDialog subjects={[]} /> : <ExamScheduleCreateDialog banks={banks} classrooms={classrooms} />}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Label htmlFor="search-schedule" className="sr-only">Cari jadwal</Label>
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search-schedule" value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Cari kode, judul, atau kelas..." className="pl-8" />
          </div>
          <div className="md:col-span-2">
            <Select value={classroomFilter} onValueChange={handleClassroomFilterChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Semua kelas" /></SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="ALL">Semua kelas</SelectItem>
                {classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent align="start"><SelectItem value="ALL">Semua</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Tidak aktif</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Button variant={todayOnly ? "default" : "outline"} className="w-full gap-2" onClick={handleTodayFilterClick}><CalendarDays className="size-4" />Hari ini</Button></div>
          <div className="md:col-span-2"><Button variant="outline" className="w-full gap-2" onClick={resetFilters} disabled={!hasActiveFilter}><RotateCcw className="size-4" />Reset</Button></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-12 text-center">#</TableHead><TableHead>Bank Soal</TableHead><TableHead>Kelas</TableHead><TableHead>Tanggal</TableHead><TableHead>Mulai</TableHead><TableHead>Durasi</TableHead><TableHead>Selesai</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={9} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><CalendarDays className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">{hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada jadwal"}</div><p className="text-sm">{hasActiveFilter ? "Coba ubah kata kunci atau atur ulang filter." : "Tambahkan bank soal dan kelas terlebih dahulu, lalu buat jadwal."}</p></div>{hasActiveFilter ? <Button size="sm" variant="outline" onClick={resetFilters}><RotateCcw className="size-4" />Reset filter</Button> : <ExamScheduleCreateDialog banks={banks} classrooms={classrooms} />}</div></TableCell></TableRow>
              ) : (
                paginatedRows.map((group, index) => <TableRow key={group.key} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{(activePage - 1) * pageSize + index + 1}</TableCell><TableCell><div className="flex flex-col"><span className="font-medium">{group.title}</span><span className="font-mono text-xs text-muted-foreground">{group.code} • {group.subjectCode}</span></div></TableCell><TableCell><Popover><PopoverTrigger render={<Button variant="outline" size="sm" className="h-8 font-normal" />}>{group.rows.length} kelas</PopoverTrigger><PopoverContent align="start" className="w-80"><PopoverHeader><PopoverTitle>Daftar kelas</PopoverTitle></PopoverHeader><div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">{group.rows.map((row) => <Badge key={row.id} variant="outline" className="font-normal">{row.className}</Badge>)}</div></PopoverContent></Popover></TableCell><TableCell>{formatDate(group.examDate)}</TableCell><TableCell><Clock3 className="mr-1 inline size-4 text-muted-foreground" />{group.startTime.slice(0, 5)}</TableCell><TableCell>{group.durationMinutes} menit</TableCell><TableCell>{calculateEndTime(group.startTime, group.durationMinutes)}</TableCell><TableCell><ExamScheduleStatusSwitch ids={group.rows.map((row) => row.id)} active={group.activeCount === group.rows.length} /></TableCell><TableCell><div className="flex justify-end gap-1.5"><ExamScheduleRowActions schedule={group.rows[0]} schedules={group.rows} banks={banks} classrooms={classrooms} /></div></TableCell></TableRow>)
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">Menampilkan <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> dari <span className="font-medium text-foreground">{total}</span> entri</p>
            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Per halaman</span><Select value={String(pageSize)} onValueChange={handlePageSizeChange}><SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger><SelectContent align="end">{PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><PaginationPrevious href="#" text="Sebelumnya" className={activePage === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.max(1, page - 1)) }} /></PaginationItem>{pageRange.map((page, index) => page === "..." ? <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink href="#" isActive={page === activePage} onClick={(event) => { event.preventDefault(); setCurrentPage(page) }}>{page}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" text="Berikutnya" className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.min(totalPages, page + 1)) }} /></PaginationItem></PaginationContent></Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function groupScheduleRows(rows: ScheduleRow[]): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>()
  for (const row of rows) {
    const key = [row.questionBankId, row.examDate, row.startTime, row.durationMinutes].join("|")
    const existing = groups.get(key)
    if (existing) {
      existing.rows.push(row)
      if (row.active) existing.activeCount += 1
      continue
    }
    groups.set(key, { key, questionBankId: row.questionBankId, examDate: row.examDate, startTime: row.startTime, durationMinutes: row.durationMinutes, title: row.title, code: row.code, subjectCode: row.subjectCode, rows: [row], activeCount: row.active ? 1 : 0 })
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => naturalClassroomCollator.compare(a.className, b.className)),
  }))
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const range: (number | "...")[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) range.push("...")
  for (let i = left; i <= right; i++) range.push(i)
  if (right < total - 1) range.push("...")
  range.push(total)
  return range
}

function getTodayDateValue() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
}

function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) }
function calculateEndTime(startTime: string, durationMinutes: number) { const [h, m] = startTime.split(":").map(Number); const d = new Date(2000, 0, 1, h, m); d.setMinutes(d.getMinutes() + durationMinutes); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
