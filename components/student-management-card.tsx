"use client"

import { useMemo, useState } from "react"
import { Filter, RotateCcw, Search, Users } from "lucide-react"

import { SeedMasterDataButton } from "@/components/seed-master-data-button"
import { StudentCreateDialog } from "@/components/student-create-dialog"
import { StudentImportDialog } from "@/components/student-import-dialog"
import { StudentRowActions } from "@/components/student-row-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

export type StudentManagementRow = {
  id: string
  name: string
  nis: string
  active: boolean
  className: string
  classroomId: string
  majorName: string
}

export type StudentManagementClassroom = {
  id: string
  name: string
  majorName: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export function StudentManagementCard({
  students,
  classrooms,
}: {
  students: StudentManagementRow[]
  classrooms: StudentManagementClassroom[]
}) {
  const [search, setSearch] = useState("")
  const [classroomId, setClassroomId] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const selectedClassroom = classrooms.find((classroom) => classroom.id === classroomId)
  const hasActiveFilter = search.trim() !== "" || classroomId !== "ALL" || status !== "ALL"

  const filteredStudents = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return students.filter((student) => {
      if (classroomId !== "ALL" && student.classroomId !== classroomId) return false
      if (status === "ACTIVE" && !student.active) return false
      if (status === "INACTIVE" && student.active) return false
      if (!keyword) return true

      return [student.name, student.nis, student.className, student.majorName]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    })
  }, [students, search, classroomId, status])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = (activePage - 1) * pageSize
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize)
  const from = filteredStudents.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, filteredStudents.length)

  function handleSearchChange(value: string) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handleClassroomChange(value: string | null) {
    setClassroomId(value ?? "ALL")
    setCurrentPage(1)
  }

  function handleStatusChange(value: string | null) {
    setStatus(value ?? "ALL")
    setCurrentPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) return
    setPageSize(Number(value))
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearch("")
    setClassroomId("ALL")
    setStatus("ALL")
    setCurrentPage(1)
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Daftar Peserta</CardTitle>
              <Badge variant="secondary" className="font-normal">{filteredStudents.length} hasil</Badge>
            </div>
            <CardDescription>Data login peserta berisi nama, NIS, password, kelas, jurusan, dan status.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            {classrooms.length === 0 && <SeedMasterDataButton />}
            <StudentImportDialog />
            <StudentCreateDialog classrooms={classrooms} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Label htmlFor="search-student" className="sr-only">Cari peserta</Label>
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search-student" value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Cari nama atau NIS..." className="pl-8" />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="filter-class" className="sr-only">Filter kelas</Label>
            <Select value={classroomId} onValueChange={handleClassroomChange}>
              <SelectTrigger id="filter-class" className="w-full">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="size-4 text-muted-foreground" />
                  <SelectValue>{selectedClassroom ? selectedClassroom.name : "Semua kelas"}</SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="ALL">Semua kelas</SelectItem>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>{classroom.name} — {classroom.majorName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="filter-status" className="sr-only">Filter status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue>{status === "ACTIVE" ? "Aktif" : status === "INACTIVE" ? "Tidak aktif" : "Semua status"}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="ALL">Semua status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Tidak aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button variant="outline" className="w-full gap-2" disabled={!hasActiveFilter} onClick={resetFilters}>
              <RotateCcw className="size-4" />Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Jurusan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                      <div className="rounded-full bg-muted p-4"><Users className="size-7" /></div>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada peserta"}</div>
                        <p className="text-sm">{hasActiveFilter ? "Coba ubah kata kunci atau atur ulang filter." : classrooms.length === 0 ? "Buat data awal kelas dan jurusan terlebih dahulu." : "Tambahkan peserta untuk mulai mengatur akun ujian."}</p>
                      </div>
                      {hasActiveFilter ? <Button size="sm" variant="outline" onClick={resetFilters}>Reset filter</Button> : classrooms.length === 0 && <SeedMasterDataButton />}
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedStudents.map((student, index) => (
                <TableRow key={student.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{startIndex + index + 1}</TableCell>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-blue-500/15 text-xs font-medium text-blue-700 dark:text-blue-300">{getInitials(student.name)}</AvatarFallback></Avatar><span className="font-medium">{student.name}</span></div></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{student.nis}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">••••••••</TableCell>
                  <TableCell><Badge variant="outline" className="font-normal">{student.className}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{student.majorName}</TableCell>
                  <TableCell><Badge variant="secondary" className={cn("font-normal", student.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300")}>{student.active ? "Aktif" : "Tidak aktif"}</Badge></TableCell>
                  <TableCell><div className="flex justify-end gap-1.5"><StudentRowActions student={student} classrooms={classrooms} /></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{from}</span>
              –<span className="font-medium text-foreground">{to}</span> dari{" "}
              <span className="font-medium text-foreground">{filteredStudents.length}</span> entri
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per halaman</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger>
                <SelectContent align="end">
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text="Sebelumnya"
                    className={activePage === 1 ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }}
                  />
                </PaginationItem>
                {pageRange.map((page, index) =>
                  page === "..." ? (
                    <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === activePage}
                        onClick={(event) => {
                          event.preventDefault()
                          setCurrentPage(page)
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text="Berikutnya"
                    className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
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
