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

  function resetFilters() {
    setSearch("")
    setClassroomId("ALL")
    setStatus("ALL")
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
            <Input id="search-student" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIS..." className="pl-8" />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="filter-class" className="sr-only">Filter kelas</Label>
            <Select value={classroomId} onValueChange={(value: string | null) => setClassroomId(value ?? "ALL")}>
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
            <Select value={status} onValueChange={(value: string | null) => setStatus(value ?? "ALL")}>
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
              ) : filteredStudents.map((student, index) => (
                <TableRow key={student.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{index + 1}</TableCell>
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
      </CardContent>
    </Card>
  )
}

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
}
