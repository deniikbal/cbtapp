"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DoorOpen, Pencil, Plus, Trash2, Users } from "lucide-react"

import { buatRuangan, hapusRuangan, keluarkanSiswaDariRuangan, tambahSiswaKeRuangan, ubahRuangan } from "@/app/dashboard/ruangan/actions"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const kolatorKelas = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })

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
        <Button onClick={() => { setNamaBaru(""); setTambahTerbuka(true) }} disabled={pending}>
          <Plus className="size-4" /> Tambah Ruangan
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <DoorOpen className="size-8 text-muted-foreground" />
            <p className="font-medium">Belum ada ruangan</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Buat ruangan ujian lalu tempatkan siswa dari kelas mana pun, satu ruangan boleh berisi kelas campuran.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DoorOpen className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{room.name}</p>
                      <p className="text-xs text-muted-foreground">{room.memberIds.length} siswa</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Ubah ${room.name}`} onClick={() => { setEditTarget(room); setNamaEdit(room.name) }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Hapus ${room.name}`} onClick={() => setHapusTarget(room)}>
                      <Trash2 className="size-4" />
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
                  <Users className="size-4" /> Kelola Siswa
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
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
      <DialogContent className="sm:max-w-2xl">
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
            <ScrollArea className="h-72 rounded-md border">
              <div className="p-2">
                {anggota.length === 0 && <p className="p-3 text-sm text-muted-foreground">Ruangan kosong.</p>}
                {anggota.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                    <Checkbox checked={dipilihKeluarkan.has(s.id)} onCheckedChange={() => toggle(dipilihKeluarkan, setDipilihKeluarkan, s.id)} />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.className}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
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
                <Plus className="size-4" /> Masukkan ({dipilihTambah.size})
              </Button>
            </div>
            <Select value={kelasDipilih} onValueChange={(v) => { setKelasDipilih(v ?? ""); setDipilihTambah(new Set()) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <ScrollArea className="h-60 rounded-md border">
              <div className="p-2">
                {kandidat.length === 0 && <p className="p-3 text-sm text-muted-foreground">Kelas ini tidak punya siswa.</p>}
                {kandidat.map((s) => {
                  const sudahDiRuanganLain = s.roomId !== null && s.roomId !== room.id
                  return (
                    <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                      <Checkbox
                        checked={dipilihTambah.has(s.id) || s.roomId === room.id}
                        disabled={s.roomId === room.id}
                        onCheckedChange={() => toggle(dipilihTambah, setDipilihTambah, s.id)}
                      />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      {s.roomId === room.id ? (
                        <span className="text-xs text-lime-700">di ruang ini</span>
                      ) : sudahDiRuanganLain ? (
                        <span className="text-xs text-muted-foreground">pindah</span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            </ScrollArea>
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
