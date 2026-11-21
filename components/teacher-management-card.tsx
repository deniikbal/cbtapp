"use client"

import { useMemo, useState, useTransition } from "react"
import { Edit, Loader2, MoreHorizontal, Plus, Search, Trash2, UserRound } from "lucide-react"
import { toast } from "sonner"

import { createTeacher, deleteTeacher, updateTeacher } from "@/app/dashboard/guru/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type TeacherItem = {
  id: string
  name: string
  nip: string
  nuptk: string
  gender: string
  birthPlace: string
  birthDate: string
  active: boolean
  hasPassword: boolean
  bankCount: number
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export function TeacherManagementCard({ teachers }: { teachers: TeacherItem[] }) {
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeacherItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const rows = useMemo(() => {
    const key = query.trim().toLowerCase()
    if (!key) return teachers
    return teachers.filter((teacher) =>
      [teacher.name, teacher.nip, teacher.nuptk, teacher.gender].some((field) =>
        field.toLowerCase().includes(key),
      ),
    )
  }, [teachers, query])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = (activePage - 1) * pageSize
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize)
  const from = rows.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, rows.length)

  function submit(formData: FormData, mode: "create" | "edit") {
    setError(null)
    startTransition(async () => {
      const result = mode === "create" ? await createTeacher(formData) : await updateTeacher(formData)
      if (!result.ok) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setCreateOpen(false)
      setEditTarget(null)
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    setError(null)
    startTransition(async () => {
      const result = await deleteTeacher(deleteTarget.id)
      if (!result.ok) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setDeleteTarget(null)
    })
  }

  return (
    <Card>
      <CardHeader className="gap-3 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
            Data Guru
          </CardTitle>
          <CardDescription>{teachers.length} guru terdaftar. Password dipakai untuk login guru.</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Cari nama, NIP, NUPTK..."
              className="pl-9 sm:w-64"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }}
            />
          </div>
          <Button className="gap-2" onClick={() => { setError(null); setCreateOpen(true) }}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Guru
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && !createOpen && !editTarget && !deleteTarget && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="hidden overflow-x-auto rounded-lg border lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>NUPTK</TableHead>
                <TableHead>JK</TableHead>
                <TableHead>Tempat / Tgl Lahir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Password</TableHead>
                <TableHead className="w-24 text-center">Bank Soal</TableHead>
                <TableHead className="w-16 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-sm text-muted-foreground">
                    Tidak ada data guru yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((teacher, index) => (
                  <TableRow key={teacher.id} className="hover:bg-muted/40">
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell className="font-mono text-xs">{teacher.nip}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {teacher.nuptk || "-"}
                    </TableCell>
                    <TableCell className="text-sm">{teacher.gender || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[teacher.birthPlace, teacher.birthDate].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={teacher.active ? "secondary" : "outline"}>
                        {teacher.active ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={teacher.hasPassword ? "secondary" : "outline"}>
                        {teacher.hasPassword ? "Terisi" : "Belum diatur"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {teacher.bankCount > 0 ? (
                        <Badge variant="secondary" className="tabular-nums">{teacher.bankCount}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                          <span className="sr-only">Aksi guru</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setError(null); setEditTarget(teacher) }}>
                            <Edit className="size-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setError(null); setDeleteTarget(teacher) }}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Daftar kartu mobile: pengganti tabel di layar sempit (R-03). */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {paginatedRows.length === 0 ? (
            <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              Tidak ada data guru yang cocok.
            </div>
          ) : (
            paginatedRows.map((teacher) => (
              <div key={teacher.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{teacher.name}</p>
                  <Badge variant={teacher.active ? "secondary" : "outline"} className="shrink-0">
                    {teacher.active ? "Aktif" : "Tidak aktif"}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">NIP</dt>
                    <dd className="font-mono text-xs">{teacher.nip}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">NUPTK</dt>
                    <dd className="font-mono text-xs">{teacher.nuptk || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Tempat / Tgl Lahir</dt>
                    <dd className="text-muted-foreground">{[teacher.birthPlace, teacher.birthDate].filter(Boolean).join(", ") || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Password</dt>
                    <dd>
                      <Badge variant={teacher.hasPassword ? "secondary" : "outline"} className="font-normal">
                        {teacher.hasPassword ? "Terisi" : "Belum diatur"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Bank Soal</dt>
                    <dd className="tabular-nums">{teacher.bankCount > 0 ? teacher.bankCount : "-"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end border-t pt-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="size-11 rounded-sm sm:size-6" />}>
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                      <span className="sr-only">Aksi guru</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setError(null); setEditTarget(teacher) }}>
                        <Edit className="size-4" aria-hidden="true" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setError(null); setDeleteTarget(teacher) }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Menampilkan <span className="font-medium text-foreground">{from}</span>–
            <span className="font-medium text-foreground">{to}</span> dari{" "}
            <span className="font-medium text-foreground">{rows.length}</span> entri
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per halaman</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value: string | null) => {
                setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-11 w-[80px] sm:h-8"><span>{pageSize}</span></SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Sebelumnya"
                  className={activePage === 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => { event.preventDefault(); setCurrentPage(Math.max(1, activePage - 1)) }}
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
                      onClick={(event) => { event.preventDefault(); setCurrentPage(page) }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Berikutnya"
                  className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => { event.preventDefault(); setCurrentPage(Math.min(totalPages, activePage + 1)) }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>

      <Dialog
        open={createOpen}
        onOpenChange={(next) => { setCreateOpen(next); if (!next) setError(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Guru</DialogTitle>
            <DialogDescription>Isi identitas guru dan password untuk login.</DialogDescription>
          </DialogHeader>
          <form action={(formData) => submit(formData, "create")} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-name">Nama</Label>
                <Input id="create-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-nip">NIP</Label>
                <Input id="create-nip" name="nip" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-nuptk">NUPTK</Label>
                <Input id="create-nuptk" name="nuptk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-gender">Jenis Kelamin</Label>
                <Select name="gender" defaultValue="Laki-laki">
                  <SelectTrigger id="create-gender" className="w-full">
                    <SelectValue>Laki-laki</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-active">Status</Label>
                <Select name="active" defaultValue="true">
                  <SelectTrigger id="create-active" className="w-full">
                    <SelectValue>Aktif</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Tidak aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-birth-place">Tempat Lahir</Label>
                <Input id="create-birth-place" name="birthPlace" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-birth-date">Tanggal Lahir</Label>
                <Input id="create-birth-date" name="birthDate" placeholder="17 Agustus 1990" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-password">Password Login</Label>
                <Input id="create-password" name="password" type="text" required />
              </div>
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(next) => { if (!next) { setEditTarget(null); setError(null) } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guru</DialogTitle>
            <DialogDescription>Kosongkan password jika tidak diganti.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form action={(formData) => submit(formData, "edit")} className="space-y-4">
              <input type="hidden" name="id" value={editTarget.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-name">Nama</Label>
                  <Input id="edit-name" name="name" defaultValue={editTarget.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nip">NIP</Label>
                  <Input id="edit-nip" name="nip" defaultValue={editTarget.nip} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nuptk">NUPTK</Label>
                  <Input id="edit-nuptk" name="nuptk" defaultValue={editTarget.nuptk} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Jenis Kelamin</Label>
                  <Select name="gender" defaultValue={editTarget.gender || "Laki-laki"}>
                    <SelectTrigger id="edit-gender" className="w-full">
                      <SelectValue>{editTarget.gender || "Laki-laki"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-active">Status</Label>
                  <Select name="active" defaultValue={String(editTarget.active)}>
                    <SelectTrigger id="edit-active" className="w-full">
                      <SelectValue>{editTarget.active ? "Aktif" : "Tidak aktif"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Aktif</SelectItem>
                      <SelectItem value="false">Tidak aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-birth-place">Tempat Lahir</Label>
                  <Input id="edit-birth-place" name="birthPlace" defaultValue={editTarget.birthPlace} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-birth-date">Tanggal Lahir</Label>
                  <Input id="edit-birth-date" name="birthDate" defaultValue={editTarget.birthDate} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-password">Password Baru</Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="text"
                    placeholder="Kosongkan jika tidak diganti"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" disabled={isPending} onClick={() => setEditTarget(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => { if (!next) { setDeleteTarget(null); setError(null) } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus guru?</AlertDialogTitle>
            <AlertDialogDescription>
              Data “{deleteTarget?.name}” akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
