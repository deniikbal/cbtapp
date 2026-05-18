"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Edit, Loader2, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react"

import { createUser, deleteUser, updateUser } from "@/app/dashboard/user/actions"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type UserManagementRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const NATURAL_SORTER = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })

type DialogMode = "create" | "edit"

export function UserManagementCard({ users, currentUserId }: { users: UserManagementRow[]; currentUserId: string }) {
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>("create")
  const [editing, setEditing] = useState<UserManagementRow | null>(null)
  const [deleting, setDeleting] = useState<UserManagementRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const hasActiveFilter = search.trim() !== ""

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return users
      .filter((row) => {
        if (!keyword) return true
        return [row.name, row.email].join(" ").toLowerCase().includes(keyword)
      })
      .sort((a, b) => NATURAL_SORTER.compare(a.name, b.name))
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = (activePage - 1) * pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize)
  const from = filteredUsers.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, filteredUsers.length)

  function handleSearchChange(value: string) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) return
    setPageSize(Number(value))
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearch("")
    setCurrentPage(1)
  }

  function openCreate() {
    setError(null)
    setDialogMode("create")
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(row: UserManagementRow) {
    setError(null)
    setDialogMode("edit")
    setEditing(row)
    setDialogOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        if (dialogMode === "edit" && editing) {
          formData.set("id", editing.id)
          await updateUser(formData)
          toast.success("User berhasil diperbarui.")
        } else {
          await createUser(formData)
          toast.success("User berhasil ditambahkan.")
        }
        setEditing(null)
        setDialogMode("create")
        setDialogOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan user."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleDelete() {
    if (!deleting) return
    startTransition(async () => {
      try {
        await deleteUser(deleting.id)
        toast.success("User berhasil dihapus.")
        setDeleting(null)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menghapus user.")
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <CardTitle>Daftar User</CardTitle>
                <Badge variant="secondary" className="font-normal">{filteredUsers.length} hasil</Badge>
              </div>
              <CardDescription>Kelola akun admin/operator yang dapat masuk ke dashboard.</CardDescription>
            </div>
            <Button className="gap-2 md:shrink-0" onClick={openCreate}><Plus className="size-4" />Tambah User</Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-10">
              <Label htmlFor="search-user" className="sr-only">Cari user</Label>
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="search-user" value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Cari nama atau email..." className="pl-8" />
            </div>
            <div className="md:col-span-2"><Button variant="outline" className="w-full gap-2" disabled={!hasActiveFilter} onClick={resetFilters}><RotateCcw className="size-4" />Reset</Button></div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-12 text-center">#</TableHead><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Dibuat</TableHead><TableHead className="w-32 text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><Users className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">{hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada user"}</div><p className="text-sm">{hasActiveFilter ? "Coba ubah kata kunci atau atur ulang filter." : "Tambahkan user untuk mengatur akses dashboard."}</p></div>{hasActiveFilter ? <Button size="sm" variant="outline" onClick={resetFilters}><RotateCcw className="size-4" />Reset filter</Button> : <Button size="sm" onClick={openCreate}><Plus className="size-4" />Tambah User</Button>}</div></TableCell></TableRow>
                ) : paginatedUsers.map((row, index) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{startIndex + index + 1}</TableCell><TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-sky-500/15 text-xs font-medium text-sky-700 dark:text-sky-300">{getInitials(row.name)}</AvatarFallback></Avatar><div className="font-medium">{row.name}{row.id === currentUserId && <span className="ml-2 text-xs font-normal text-muted-foreground">(Anda)</span>}</div></div></TableCell><TableCell className="font-mono text-xs text-muted-foreground">{row.email}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</TableCell><TableCell><div className="flex justify-end gap-1.5"><Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)}><Edit className="size-4" /><span className="sr-only">Edit</span></Button><Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={row.id === currentUserId} onClick={() => setDeleting(row)}><Trash2 className="size-4" /><span className="sr-only">Hapus</span></Button></div></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">Menampilkan <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> dari <span className="font-medium text-foreground">{filteredUsers.length}</span> entri</p>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Per halaman</span><Select value={String(pageSize)} onValueChange={handlePageSizeChange}><SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger><SelectContent align="end">{PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {totalPages > 1 && <Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><PaginationPrevious href="#" text="Sebelumnya" className={activePage === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.max(1, page - 1)) }} /></PaginationItem>{pageRange.map((page, index) => page === "..." ? <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink href="#" isActive={page === activePage} onClick={(event) => { event.preventDefault(); setCurrentPage(page) }}>{page}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" text="Berikutnya" className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); setCurrentPage((page) => Math.min(totalPages, page + 1)) }} /></PaginationItem></PaginationContent></Pagination>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setDialogMode("create"); setError(null) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogMode === "edit" ? "Edit User" : "Tambah User"}</DialogTitle><DialogDescription>{dialogMode === "edit" ? "Perbarui data user. Kosongkan password jika tidak diganti." : "Tambahkan user baru untuk akses dashboard."}</DialogDescription></DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <div className="space-y-2"><Label htmlFor="user-name">Nama</Label><Input id="user-name" name="name" defaultValue={editing?.name ?? ""} required /></div>
            <div className="space-y-2"><Label htmlFor="user-email">Email</Label><Input id="user-email" name="email" type="email" defaultValue={editing?.email ?? ""} required /></div>
            <div className="space-y-2"><Label htmlFor="user-password">Password</Label><Input id="user-password" name="password" type="password" placeholder={dialogMode === "edit" ? "Kosongkan jika tidak diganti" : "Minimal 8 karakter"} required={dialogMode === "create"} /></div>
            <label className="flex items-center gap-2 text-sm"><input name="emailVerified" type="checkbox" defaultChecked={editing?.emailVerified ?? true} className="size-4 rounded border-input" />Email terverifikasi</label>
            <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => { setDialogOpen(false); setEditing(null); setDialogMode("create") }}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogMedia><Trash2 className="size-5" /></AlertDialogMedia><AlertDialogTitle>Hapus user?</AlertDialogTitle><AlertDialogDescription>User <span className="font-medium text-foreground">{deleting?.name}</span> akan dihapus permanen beserta sesi dan akun login terkait.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive/10 text-destructive hover:bg-destructive/20" disabled={isPending} onClick={handleDelete}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
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
