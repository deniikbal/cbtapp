"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { BookOpenCheck, CalendarDays, RotateCcw, Search } from "lucide-react"

import { ProgressDetailDialog, type ProgressStudent } from "@/components/progress-detail-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const subscribe = () => () => {}

type ProgressRow = {
  id: string
  examDate: string
  startTime: string
  durationMinutes: number
  active: boolean
  title: string
  code: string
  subjectCode: string
  className: string
  classroomId: string
  majorCode: string
  totalStudents: number
  notStarted: number
  started: number
  submitted: number
  percent: number
  students: ProgressStudent[]
}

export function ProgressTableCard({ rows }: { rows: ProgressRow[] }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const [search, setSearch] = useState("")
  const [todayOnly, setTodayOnly] = useState(false)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return rows.filter((row) => {
      if (todayOnly && row.examDate !== getTodayDateValue()) return false
      if (!keyword) return true

      return [row.title, row.code, row.subjectCode, row.className, row.majorCode, row.examDate]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    })
  }, [rows, search, todayOnly])

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const from = total === 0 ? 0 : (activePage - 1) * pageSize + 1
  const to = Math.min(activePage * pageSize, total)
  const pageRange = buildPageRange(activePage, totalPages)
  const paginatedRows = filteredRows.slice((activePage - 1) * pageSize, activePage * pageSize)
  const hasActiveFilter = search.trim() !== "" || todayOnly

  function handleSearchChange(value: string) {
    setSearch(value)
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
    setTodayOnly(false)
    setCurrentPage(1)
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Rekap per Jadwal</CardTitle>
              <Badge variant="secondary" className="font-normal">{rows.length} jadwal</Badge>
            </div>
            <CardDescription>Lihat jumlah peserta yang belum mulai, sedang mengerjakan, dan sudah selesai.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Memuat rekap pengerjaan...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2"><CardTitle>Rekap per Jadwal</CardTitle><Badge variant="secondary" className="font-normal">{filteredRows.length} jadwal</Badge></div>
            <CardDescription>Lihat jumlah peserta yang belum mulai, sedang mengerjakan, dan sudah selesai.</CardDescription>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Label htmlFor="search-progress" className="sr-only">Cari pengerjaan</Label>
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search-progress" value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Cari bank soal, kode, atau kelas..." className="pl-8" />
          </div>
          <div className="md:col-span-3">
            <Button variant={todayOnly ? "default" : "outline"} className="w-full gap-2" onClick={handleTodayFilterClick}>
              <CalendarDays className="size-4" />
              Hari ini
            </Button>
          </div>
          <div className="md:col-span-3">
            <Button variant="outline" className="w-full gap-2" onClick={resetFilters} disabled={!hasActiveFilter}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-12 text-center">#</TableHead><TableHead>Bank Soal</TableHead><TableHead>Kelas</TableHead><TableHead>Jadwal</TableHead><TableHead className="text-center">Target</TableHead><TableHead className="text-center">Belum</TableHead><TableHead className="text-center">Sedang</TableHead><TableHead className="text-center">Selesai</TableHead><TableHead>Progress</TableHead><TableHead className="w-20 text-right">Detail</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={10} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><BookOpenCheck className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">{hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada data pengerjaan"}</div><p className="text-sm">{hasActiveFilter ? "Coba ubah kata kunci atau atur ulang filter." : "Data akan muncul setelah jadwal dibuat dan siswa mulai mengerjakan."}</p></div>{hasActiveFilter && <Button size="sm" variant="outline" onClick={resetFilters}><RotateCcw className="size-4" />Reset filter</Button>}</div></TableCell></TableRow>
              ) : paginatedRows.map((row, index) => (
                <TableRow key={row.id} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{(activePage - 1) * pageSize + index + 1}</TableCell><TableCell><div className="flex flex-col"><span className="font-medium">{row.title}</span><span className="font-mono text-xs text-muted-foreground">{row.code} • {row.subjectCode}</span></div></TableCell><TableCell><Badge variant="outline" className="font-normal">{row.className}</Badge><p className="text-xs text-muted-foreground">{row.majorCode}</p></TableCell><TableCell><div className="flex flex-col"><span>{formatDate(row.examDate)}</span><span className="text-xs text-muted-foreground">{row.startTime.slice(0, 5)} • {row.durationMinutes} menit</span></div></TableCell><TableCell className="text-center tabular-nums">{row.totalStudents}</TableCell><TableCell className="text-center tabular-nums">{row.notStarted}</TableCell><TableCell className="text-center tabular-nums">{row.started}</TableCell><TableCell className="text-center tabular-nums">{row.submitted}</TableCell><TableCell><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${row.percent}%` }} /></div><span className="text-xs tabular-nums text-muted-foreground">{row.percent}%</span></div></TableCell><TableCell className="text-right"><ProgressDetailDialog title={row.title} className={row.className} students={row.students} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">Menampilkan <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> dari <span className="font-medium text-foreground">{total}</span> entri</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per halaman</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger>
                <SelectContent align="end">{PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><PaginationPrevious href="#" text="Sebelumnya" className={activePage === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.max(1, page - 1)) }} /></PaginationItem>{pageRange.map((page, index) => page === "..." ? <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink href="#" isActive={page === activePage} onClick={(event) => { event.preventDefault(); setCurrentPage(page) }}>{page}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" text="Berikutnya" className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.min(totalPages, page + 1)) }} /></PaginationItem></PaginationContent></Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
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

function formatDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)) }
