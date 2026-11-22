"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DoorOpen, FileDown, Pencil, Plus, Trash2, Users } from "lucide-react"

import { buatRuangan, hapusRuangan, keluarkanSiswaDariRuangan, tambahSiswaKeRuangan, ubahRuangan } from "@/app/dashboard/ruangan/actions"
import { Badge } from "@/components/ui/badge"
import { RuanganImportDialog } from "@/components/ruangan-import-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const kolatorKelas = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })
// 0 = tampilkan semua ruangan sekaligus.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 0] as const

export type RuanganRow = { id: string; name: string; memberIds: string[]; perClass: { className: string; jumlah: number }[] }
export type SiswaRow = { id: string; name: string; nis: string; className: string; roomId: string | null }

export function RuanganManagementCard({ rooms, students }: { rooms: RuanganRow[]; students: SiswaRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pesan, setPesan] = useState<{ ok: boolean; text: string } | null>(null)

  const [tambahTerbuka, setTambahTerbuka] = useState(false)
  const [namaBaru, setNamaBaru] = useState("")
  const [editTarget, setEditTarget] = useState<RuanganRow | null>(null)
  const [namaEdit, setNamaEdit] = useState("")
  const [hapusTarget, setHapusTarget] = useState<RuanganRow | null>(null)
  const [kelolaTarget, setKelolaTarget] = useState<RuanganRow | null>(null)

  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const semuaBaris = pageSize === 0
  const totalPages = semuaBaris ? 1 : Math.max(1, Math.ceil(rooms.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageRange = buildPageRange(activePage, totalPages)
  const startIndex = semuaBaris ? 0 : (activePage - 1) * pageSize
  const pagedRooms = semuaBaris ? rooms : rooms.slice(startIndex, startIndex + pageSize)
  const dari = rooms.length === 0 ? 0 : startIndex + 1
  const sampai = semuaBaris ? rooms.length : Math.min(startIndex + pageSize, rooms.length)

  function gantiPageSize(value: string | null) {
    if (!value) return
    setPageSize(Number(value))
    setCurrentPage(1)
  }

  const belumDitempatkan = students.filter((s) => !s.roomId).length

  function jalankan(kerja: () => Promise<{ ok: boolean; message: string }>, tutup: () => void) {
    startTransition(async () => {
      const hasil = await kerja()
      setPesan({ ok: hasil.ok, text: hasil.message })
      if (hasil.ok) {
        tutup()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {pesan && (
        <p className={cn("text-sm", pesan.ok ? "text-lime-700" : "text-destructive")} role="status">
          {pesan.text}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rooms.length} ruangan • {belumDitempatkan} dari {students.length} siswa belum ditempatkan
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            nativeButton={false}
            render={<a href="/dashboard/ruangan/rekap-pdf" target="_blank" rel="noopener" />}
          >
            <FileDown className="size-4" aria-hidden="true" /> Export PDF
          </Button>
          <RuanganImportDialog />
          <Button onClick={() => { setNamaBaru(""); setTambahTerbuka(true) }} disabled={pending}>
            <Plus className="size-4" aria-hidden="true" /> Tambah Ruangan
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <DoorOpen className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Belum ada ruangan</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Buat ruangan ujian lalu tempatkan siswa dari kelas mana pun, satu ruangan boleh berisi kelas campuran.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Ruangan</TableHead>
                <TableHead className="text-center">Siswa</TableHead>
                <TableHead>Sebaran Kelas</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRooms.map((room) => (
                <TableRow key={room.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                        <DoorOpen className="size-4" aria-hidden="true" />
                      </span>
                      <span className="font-medium">{room.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{room.memberIds.length}</TableCell>
                  <TableCell>
                    {room.perClass.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Belum ada siswa</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {room.perClass.map((k) => (
                          <Badge key={k.className} variant="outline" className="font-normal">
                            {k.className}: {k.jumlah}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setKelolaTarget(room)}>
                        <Users className="size-4" aria-hidden="true" /> Kelola Siswa
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ubah ${room.name}`} onClick={() => { setEditTarget(room); setNamaEdit(room.name) }}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label={`Hapus ${room.name}`} onClick={() => setHapusTarget(room)}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 md:hidden">
          {pagedRooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DoorOpen className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{room.name}</p>
                      <p className="text-xs text-muted-foreground">{room.memberIds.length} siswa</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label={`Ubah ${room.name}`} onClick={() => { setEditTarget(room); setNamaEdit(room.name) }}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-8" aria-label={`Hapus ${room.name}`} onClick={() => setHapusTarget(room)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {room.perClass.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada siswa.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {room.perClass.map((k) => (
                      <Badge key={k.className} variant="outline" className="font-normal">
                        {k.className}: {k.jumlah}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setKelolaTarget(room)}>
                  <Users className="size-4" aria-hidden="true" /> Kelola Siswa
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{dari}</span>
              –<span className="font-medium text-foreground">{sampai}</span> dari{" "}
              <span className="font-medium text-foreground">{rooms.length}</span> ruangan
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per halaman</span>
              <Select value={String(pageSize)} onValueChange={gantiPageSize}>
                <SelectTrigger className="h-11 w-[80px] sm:h-8"><span>{semuaBaris ? "Semua" : pageSize}</span></SelectTrigger>
                <SelectContent align="end">
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>{option === 0 ? "Semua" : option}</SelectItem>
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
                  ),
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
        </>
      )}

      {/* Tambah ruangan */}
      <Dialog open={tambahTerbuka} onOpenChange={setTambahTerbuka}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Ruangan</DialogTitle>
            <DialogDescription>Contoh: Ruang 01, Ruang 02.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nama-ruangan">Nama ruangan</Label>
            <Input id="nama-ruangan" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} maxLength={60} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTambahTerbuka(false)}>Batal</Button>
            <Button disabled={pending || !namaBaru.trim()} onClick={() => jalankan(() => buatRuangan(namaBaru), () => setTambahTerbuka(false))}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ubah nama */}
      <Dialog open={editTarget !== null} onOpenChange={(terbuka) => !terbuka && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Ruangan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nama-ruangan-edit">Nama ruangan</Label>
            <Input id="nama-ruangan-edit" value={namaEdit} onChange={(e) => setNamaEdit(e.target.value)} maxLength={60} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button disabled={pending || !editTarget || !namaEdit.trim()} onClick={() => editTarget && jalankan(() => ubahRuangan(editTarget.id, namaEdit), () => setEditTarget(null))}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hapus ruangan */}
      <AlertDialog open={hapusTarget !== null} onOpenChange={(terbuka) => !terbuka && setHapusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {hapusTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {hapusTarget?.memberIds.length
                ? `${hapusTarget.memberIds.length} siswa di dalamnya akan lepas dari ruangan (kelas mereka tidak berubah).`
                : "Ruangan ini belum berisi siswa."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" disabled={pending}
              onClick={() => hapusTarget && jalankan(() => hapusRuangan(hapusTarget.id), () => setHapusTarget(null))}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kelola siswa ruangan */}
      {kelolaTarget && (
        <KelolaRuanganDialog
          room={kelolaTarget}
          students={students}
          pending={pending}
          onClose={() => setKelolaTarget(null)}
          onTambah={(ids) => jalankan(() => tambahSiswaKeRuangan(kelolaTarget.id, ids), () => setKelolaTarget(null))}
          onKeluarkan={(ids) => jalankan(() => keluarkanSiswaDariRuangan(ids), () => {})}
        />
      )}
    </div>
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

function KelolaRuanganDialog({
  room,
  students,
  pending,
  onClose,
  onTambah,
  onKeluarkan,
}: {
  room: RuanganRow
  students: SiswaRow[]
  pending: boolean
  onClose: () => void
  onTambah: (ids: string[]) => void
  onKeluarkan: (ids: string[]) => void
}) {
  const kelasList = useMemo(
    () => [...new Set(students.map((s) => s.className))].sort(kolatorKelas.compare),
    [students],
  )
  const [kelasDipilih, setKelasDipilih] = useState<string>(kelasList[0] ?? "")
  const [dipilihTambah, setDipilihTambah] = useState<Set<string>>(new Set())
  const [dipilihKeluarkan, setDipilihKeluarkan] = useState<Set<string>>(new Set())

  const anggota = useMemo(
    () => students.filter((s) => s.roomId === room.id).sort((a, b) => a.name.localeCompare(b.name, "id-ID")),
    [students, room.id],
  )
  const kandidat = useMemo(
    () =>
      students
        .filter((s) => s.className === kelasDipilih)
        .sort((a, b) => a.name.localeCompare(b.name, "id-ID")),
    [students, kelasDipilih],
  )

  function toggle(set: Set<string>, setSetter: (s: Set<string>) => void, id: string) {
    const baru = new Set(set)
    if (baru.has(id)) baru.delete(id)
    else baru.add(id)
    setSetter(baru)
  }

  return (
    <Dialog open onOpenChange={(terbuka) => !terbuka && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Kelola Siswa: {room.name}</DialogTitle>
          <DialogDescription>
            {anggota.length} siswa di ruangan ini. Siswa boleh berasal dari kelas apa pun.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Anggota ruangan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Isi ruangan</p>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || dipilihKeluarkan.size === 0}
                onClick={() => { onKeluarkan([...dipilihKeluarkan]); setDipilihKeluarkan(new Set()) }}
              >
                Keluarkan ({dipilihKeluarkan.size})
              </Button>
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10" />
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-20">NIS</TableHead>
                    <TableHead className="w-24">Kelas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anggota.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                        Ruangan masih kosong.
                      </TableCell>
                    </TableRow>
                  )}
                  {anggota.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40" onClick={() => toggle(dipilihKeluarkan, setDipilihKeluarkan, s.id)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={dipilihKeluarkan.has(s.id)} aria-label={`Pilih ${s.name}`} onCheckedChange={() => toggle(dipilihKeluarkan, setDipilihKeluarkan, s.id)} />
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{s.nis}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.className}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tambah dari kelas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Tambah dari kelas</p>
              <Button
                size="sm"
                disabled={pending || dipilihTambah.size === 0}
                onClick={() => { onTambah([...dipilihTambah]); setDipilihTambah(new Set()) }}
              >
                <Plus className="size-4" aria-hidden="true" /> Masukkan ({dipilihTambah.size})
              </Button>
            </div>
            <Select value={kelasDipilih} onValueChange={(v) => { setKelasDipilih(v ?? ""); setDipilihTambah(new Set()) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10" />
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-20">NIS</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kandidat.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                        Kelas ini tidak punya siswa.
                      </TableCell>
                    </TableRow>
                  )}
                  {kandidat.map((s) => {
                    const sudahDiRuanganLain = s.roomId !== null && s.roomId !== room.id
                    const diRuangIni = s.roomId === room.id
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/40" onClick={() => !diRuangIni && toggle(dipilihTambah, setDipilihTambah, s.id)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={dipilihTambah.has(s.id) || diRuangIni}
                            disabled={diRuangIni}
                            aria-label={`Pilih ${s.name}`}
                            onCheckedChange={() => toggle(dipilihTambah, setDipilihTambah, s.id)}
                          />
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">{s.nis}</TableCell>
                        <TableCell className="text-xs">
                          {diRuangIni ? (
                            <span className="text-lime-700">di ruang ini</span>
                          ) : sudahDiRuanganLain ? (
                            <span className="text-muted-foreground">pindah</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Siswa yang sudah punya ruangan lain akan dipindah.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
