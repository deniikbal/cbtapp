"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, Loader2, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { setAksesPdf } from "@/app/dashboard/guru/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type AksesRow = { id: string; name: string; nip: string; status: string; diaktifkanPada: string | null }

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const NATURAL_SORTER = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })

const gaya: Record<string, string> = {
  aktif: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-400",
  menunggu: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ditolak: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  belum: "bg-muted text-muted-foreground",
}

export function PdfAccessCard({ rows }: { rows: AksesRow[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("semua")
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const hasActiveFilter = search.trim() !== "" || statusFilter !== "semua"

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim()
    return rows
      .filter((row) => {
        if (statusFilter !== "semua" && row.status !== statusFilter) return false
        if (!keyword) return true
        return [row.name, row.nip].join(" ").toLowerCase().includes(keyword)
      })
      .sort((a, b) => NATURAL_SORTER.compare(a.name, b.name))
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = (activePage - 1) * pageSize
  const paginated = filtered.slice(startIndex, startIndex + pageSize)
  const from = filtered.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, filtered.length)

  function resetFilters() {
    setSearch("")
    setStatusFilter("semua")
    setCurrentPage(1)
  }

  function ubah(teacherId: string, aktif: boolean) {
    setPendingId(teacherId)
    startTransition(async () => {
      const hasil = await setAksesPdf(teacherId, aktif)
      if (hasil.ok) toast.success(hasil.message)
      else toast.error(hasil.message)
      setPendingId(null)
    })
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <CardTitle>Akses unduh PDF analisis butir</CardTitle>
            <Badge variant="secondary" className="font-normal">
              {filtered.length} hasil
            </Badge>
          </div>
          <CardDescription>
            Sekali bayar, aktif permanen. Guru menandai &quot;saya sudah bayar&quot;, superadmin memverifikasi lalu
            mengaktifkan.
          </CardDescription>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Label htmlFor="search-akses-pdf" className="sr-only">
              Cari guru
            </Label>
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="search-akses-pdf"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari nama atau NIP..."
              className="pl-8"
            />
          </div>
          <div className="md:col-span-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value ?? "semua")
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <span>{statusFilter === "semua" ? "Semua status" : `Status: ${statusFilter}`}</span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="semua">Semua status</SelectItem>
                <SelectItem value="menunggu">Menunggu</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
                <SelectItem value="belum">Belum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button variant="outline" className="w-full gap-2" disabled={!hasActiveFilter} onClick={resetFilters}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="hidden overflow-hidden rounded-lg border lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Diaktifkan</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                      <div className="rounded-full bg-muted p-4">
                        <Search className="size-7" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada data guru"}
                        </div>
                        <p className="text-sm">
                          {hasActiveFilter
                            ? "Coba ubah kata kunci atau atur ulang filter."
                            : "Tambahkan guru terlebih dahulu di menu Guru."}
                        </p>
                      </div>
                      {hasActiveFilter && (
                        <Button size="sm" variant="outline" onClick={resetFilters}>
                          <RotateCcw className="size-4" aria-hidden="true" />
                          Reset filter
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, index) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(row.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{row.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.nip}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={gaya[row.status] ?? gaya.belum}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.diaktifkanPada ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Aktifkan akses"
                          className="size-11 text-lime-600 hover:bg-lime-500/10 hover:text-lime-600 sm:size-6"
                          disabled={pendingId === row.id || row.status === "aktif"}
                          onClick={() => ubah(row.id, true)}
                        >
                          {pendingId === row.id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="size-4" aria-hidden="true" />
                          )}
                          <span className="sr-only">Aktifkan</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Tolak akses"
                          className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-6"
                          disabled={pendingId === row.id || row.status === "belum"}
                          onClick={() => ubah(row.id, false)}
                        >
                          <X className="size-4" aria-hidden="true" />
                          <span className="sr-only">Tolak</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Daftar kartu mobile: pengganti tabel di layar sempit (R-03). */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {paginated.length === 0 ? (
            <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada pengajuan akses PDF.
            </div>
          ) : (
            paginated.map((row) => (
              <div key={row.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {getInitials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{row.nip}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn("shrink-0 font-normal", row.status === "aktif" ? "bg-lime-500/10 text-lime-700 dark:text-lime-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
                    {row.status === "aktif" ? "Aktif" : row.status === "belum" ? "Belum" : "Ditolak"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Diaktifkan: {row.diaktifkanPada ?? "-"}</p>
                <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Aktifkan akses"
                    className="size-11 text-lime-600 hover:bg-lime-500/10 hover:text-lime-600 sm:size-6"
                    disabled={pendingId === row.id || row.status === "aktif"}
                    onClick={() => ubah(row.id, true)}
                  >
                    {pendingId === row.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                    <span className="sr-only">Aktifkan</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Tolak akses"
                    className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-6"
                    disabled={pendingId === row.id || row.status === "belum"}
                    onClick={() => ubah(row.id, false)}
                  >
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">Tolak</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{from}</span>–
              <span className="font-medium text-foreground">{to}</span> dari{" "}
              <span className="font-medium text-foreground">{filtered.length}</span> entri
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per halaman</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  if (!value) return
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-11 w-[80px] sm:h-8">
                  <span>{pageSize}</span>
                </SelectTrigger>
                <SelectContent align="end">
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
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
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
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
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
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
