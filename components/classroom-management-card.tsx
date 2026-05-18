"use client"

import { useMemo, useState } from "react"
import { Download, Filter, GraduationCap, RotateCcw, Search } from "lucide-react"

import { ClassroomCreateDialog } from "@/components/classroom-create-dialog"
import { ClassroomRowActions } from "@/components/classroom-row-actions"
import { MajorCreateDialog } from "@/components/major-create-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export type ClassroomManagementRow = {
  id: string
  name: string
  grade: string
  majorId: string
  majorName: string
  majorCode: string
  studentCount: number
}

export type ClassroomManagementMajor = {
  id: string
  name: string
  code: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const NATURAL_SORTER = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })

export function ClassroomManagementCard({
  rows,
  majorOptions,
}: {
  rows: ClassroomManagementRow[]
  majorOptions: ClassroomManagementMajor[]
}) {
  const [search, setSearch] = useState("")
  const [majorId, setMajorId] = useState("ALL")
  const [grade, setGrade] = useState("ALL")
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState(1)

  const selectedMajor = majorOptions.find((major) => major.id === majorId)
  const hasActiveFilter = search.trim() !== "" || majorId !== "ALL" || grade !== "ALL"

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return rows
      .filter((row) => {
        if (majorId !== "ALL" && row.majorId !== majorId) return false
        if (grade !== "ALL" && row.grade !== grade) return false
        if (!keyword) return true

        return [row.name, row.grade, row.majorName, row.majorCode]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      })
      .sort((a, b) => NATURAL_SORTER.compare(a.name, b.name))
  }, [rows, search, majorId, grade])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = (activePage - 1) * pageSize
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize)
  const from = filteredRows.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, filteredRows.length)

  function handleSearchChange(value: string) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handleMajorChange(value: string | null) {
    setMajorId(value ?? "ALL")
    setCurrentPage(1)
  }

  function handleGradeChange(value: string | null) {
    setGrade(value ?? "ALL")
    setCurrentPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) return
    setPageSize(Number(value))
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearch("")
    setMajorId("ALL")
    setGrade("ALL")
    setCurrentPage(1)
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Daftar Kelas</CardTitle>
              <Badge variant="secondary" className="font-normal">{filteredRows.length} hasil</Badge>
            </div>
            <CardDescription>Kelola kelas berdasarkan tingkat dan jurusan.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            <Button variant="outline" className="gap-2"><Download className="size-4" />Export</Button>
            {majorOptions.length === 0 ? <MajorCreateDialog /> : <ClassroomCreateDialog majors={majorOptions} />}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Label htmlFor="search-class" className="sr-only">Cari kelas</Label>
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search-class" value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Cari kelas atau jurusan..." className="pl-8" />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="filter-major" className="sr-only">Filter jurusan</Label>
            <Select value={majorId} onValueChange={handleMajorChange}>
              <SelectTrigger id="filter-major" className="w-full">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="size-4 text-muted-foreground" />
                  <SelectValue>{selectedMajor ? selectedMajor.code : "Semua jurusan"}</SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="ALL">Semua jurusan</SelectItem>
                {majorOptions.map((major) => <SelectItem key={major.id} value={major.id}>{major.code} — {major.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="filter-grade" className="sr-only">Filter tingkat</Label>
            <Select value={grade} onValueChange={handleGradeChange}>
              <SelectTrigger id="filter-grade" className="w-full"><SelectValue>{grade === "ALL" ? "Semua" : grade}</SelectValue></SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="X">X</SelectItem>
                <SelectItem value="XI">XI</SelectItem>
                <SelectItem value="XII">XII</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Button variant="outline" className="w-full gap-2" disabled={!hasActiveFilter} onClick={resetFilters}><RotateCcw className="size-4" />Reset</Button></div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-12 text-center">#</TableHead><TableHead>Nama Kelas</TableHead><TableHead>Tingkat</TableHead><TableHead>Jurusan</TableHead><TableHead>Peserta</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><GraduationCap className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">{hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada kelas"}</div><p className="text-sm">{hasActiveFilter ? "Coba ubah kata kunci atau atur ulang filter." : majorOptions.length === 0 ? "Tambahkan jurusan terlebih dahulu." : "Tambahkan kelas untuk mengelompokkan peserta."}</p></div>{hasActiveFilter ? <Button size="sm" variant="outline" onClick={resetFilters}><RotateCcw className="size-4" />Reset filter</Button> : majorOptions.length === 0 ? <MajorCreateDialog /> : <ClassroomCreateDialog majors={majorOptions} />}</div></TableCell></TableRow>
              ) : paginatedRows.map((row, index) => (
                <TableRow key={row.id} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{startIndex + index + 1}</TableCell><TableCell className="font-medium">{row.name}</TableCell><TableCell><Badge variant="outline" className="font-normal">{row.grade}</Badge></TableCell><TableCell><div className="flex flex-col"><span>{row.majorName}</span><span className="text-xs text-muted-foreground">{row.majorCode}</span></div></TableCell><TableCell className="tabular-nums">{row.studentCount}</TableCell><TableCell><Badge variant="secondary" className={cn("font-normal", row.studentCount > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{row.studentCount > 0 ? "Terisi" : "Kosong"}</Badge></TableCell><TableCell className="text-right"><ClassroomRowActions classroom={row} majors={majorOptions} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">Menampilkan <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> dari <span className="font-medium text-foreground">{filteredRows.length}</span> entri</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per halaman</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger>
                <SelectContent align="end">{PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" text="Sebelumnya" className={activePage === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.max(1, page - 1)) }} /></PaginationItem>
                {pageRange.map((page, index) => page === "..." ? <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink href="#" isActive={page === activePage} onClick={(event) => { event.preventDefault(); setCurrentPage(page) }}>{page}</PaginationLink></PaginationItem>)}
                <PaginationItem><PaginationNext href="#" text="Berikutnya" className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.min(totalPages, page + 1)) }} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
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
