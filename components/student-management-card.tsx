"use client"

import { useMemo, useState, useTransition } from "react"
import { Filter, RotateCcw, Search, Trash2, Users, X } from "lucide-react"
import { toast } from "sonner"

import { deleteStudents } from "@/app/dashboard/peserta/actions"

import { SeedMasterDataButton } from "@/components/seed-master-data-button"
import { StudentCreateDialog } from "@/components/student-create-dialog"
import { StudentImportDialog } from "@/components/student-import-dialog"
import { StudentNisImportDialog } from "@/components/student-nis-import-dialog"
import { StudentRowActions } from "@/components/student-row-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

export type StudentManagementRow = {
  id: string
  name: string
  nis: string
  active: boolean
  className: string
  classroomId: string
  majorName: string
  kartuPassword: string | null
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
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

  const pageIds = paginatedStudents.map((student) => student.id)
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length
  const allPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length
  const somePageSelected = selectedOnPage > 0 && !allPageSelected
  const selectedStudents = students.filter((student) => selectedIds.includes(student.id))
  const filterIds = filteredStudents.map((student) => student.id)

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  function togglePage() {
    setSelectedIds((prev) =>
      allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    )
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => [...new Set([...prev, ...filterIds])])
  }

  function handleBulkDelete() {
    startTransition(async () => {
      try {
        const hasil = await deleteStudents(selectedIds)
        toast.success(`${hasil.jumlah} peserta dihapus.`)
        setSelectedIds([])
        setConfirmOpen(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menghapus peserta.")
      }
    })
  }

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
            <StudentNisImportDialog />
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
        {selectedIds.length > 0 && (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-medium">{selectedIds.length} peserta</span> dipilih
              {filteredStudents.length > pageIds.length && selectedIds.length < filteredStudents.length && (
                <Button variant="link" className="h-auto px-2 py-0 text-sm" onClick={selectAllFiltered}>
                  Pilih semua {filteredStudents.length} hasil filter
                </Button>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-11 gap-1.5 sm:h-8" onClick={() => setSelectedIds([])}>
                <X className="size-4" aria-hidden="true" />Batalkan
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-11 gap-1.5 sm:h-8"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />Hapus {selectedIds.length} peserta
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected}
                    onCheckedChange={togglePage}
                    disabled={pageIds.length === 0}
                    aria-label="Pilih semua peserta di halaman ini"
                    className="after:-inset-x-3.5 after:-inset-y-3.5"
                  />
                </TableHead>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
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
                  <TableCell colSpan={9} className="h-48 text-center">
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
                <TableRow key={student.id} data-state={selectedIds.includes(student.id) ? "selected" : undefined} className="transition-colors data-[state=selected]:bg-muted/60 hover:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={() => toggleOne(student.id)}
                      aria-label={`Pilih ${student.name}`}
                      className="after:-inset-x-3.5 after:-inset-y-3.5"
                    />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{startIndex + index + 1}</TableCell>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-blue-500/15 text-xs font-medium text-blue-700 dark:text-blue-300">{getInitials(student.name)}</AvatarFallback></Avatar><span className="font-medium">{student.name}</span></div></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{student.nis}</TableCell>
                  <TableCell className="font-mono text-xs">{student.kartuPassword || "—"}</TableCell>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.length} peserta?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun login peserta berikut dihapus permanen. Riwayat hasil ujian tetap tersimpan, tetapi
              tidak lagi terhubung ke peserta. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-2 text-sm">
            {selectedStudents.slice(0, 8).map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{student.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{student.nis}</span>
              </li>
            ))}
            {selectedStudents.length > 8 && (
              <li className="text-xs text-muted-foreground">+{selectedStudents.length - 8} peserta lain</li>
            )}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                handleBulkDelete()
              }}
              className="gap-1.5 bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Menghapus..." : `Ya, hapus ${selectedIds.length} peserta`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
