"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Printer, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { generateKartuPassword, hapusKartuPassword } from "@/app/dashboard/peserta/kartu/actions"
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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type KartuClassroom = {
  id: string
  name: string
  majorName: string
}

export function KartuUjianControls({
  classrooms,
  classroomId,
  jumlahSiswa,
  jumlahTanpaPassword,
}: {
  classrooms: KartuClassroom[]
  classroomId: string
  jumlahSiswa: number
  jumlahTanpaPassword: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [konfirmasi, setKonfirmasi] = useState<"generate" | "hapus" | null>(null)
  const terpilih = classrooms.find((classroom) => classroom.id === classroomId)
  // Urutan natural: X1, X2, ... X12 sebelum XI IPA 1, bukan X1, X10, X11, X2.
  const urutNatural = [...classrooms].sort((a, b) =>
    a.name.localeCompare(b.name, "id", { numeric: true, sensitivity: "base" })
  )

  function pilihKelas(value: string | null) {
    if (!value) return
    router.push(`/dashboard/peserta/kartu?kelas=${value}`)
  }

  function jalankan(aksi: "generate" | "hapus") {
    startTransition(async () => {
      try {
        if (aksi === "generate") {
          const hasil = await generateKartuPassword(classroomId)
          toast.success(`Password baru dibuat untuk ${hasil.jumlah} peserta.`)
        } else {
          const hasil = await hapusKartuPassword(classroomId)
          toast.success(`Password kartu dikosongkan untuk ${hasil.jumlah} peserta.`)
        }
        setKonfirmasi(null)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memproses kartu ujian.")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 print:hidden">
      <div className="w-full sm:w-64">
        <Label htmlFor="kelas-kartu" className="text-xs text-muted-foreground">
          Kelas
        </Label>
        <Select value={classroomId || undefined} onValueChange={pilihKelas}>
          <SelectTrigger id="kelas-kartu" className="mt-1 w-full">
            <SelectValue>{terpilih ? `${terpilih.name} - ${terpilih.majorName}` : "Pilih kelas"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {urutNatural.map((classroom) => (
              <SelectItem key={classroom.id} value={classroom.id}>
                {classroom.name} - {classroom.majorName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="h-11 gap-1.5 sm:h-9"
        disabled={!classroomId || isPending}
        onClick={() => setKonfirmasi("generate")}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        {jumlahTanpaPassword > 0 ? "Buat password kartu" : "Buat ulang password"}
      </Button>

      <Button
        variant="outline"
        className="h-11 gap-1.5 sm:h-9"
        disabled={!classroomId || isPending || jumlahSiswa - jumlahTanpaPassword === 0}
        onClick={() => setKonfirmasi("hapus")}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Hapus password kartu
      </Button>

      <Button
        variant="secondary"
        className="h-11 gap-1.5 sm:h-9"
        disabled={jumlahSiswa - jumlahTanpaPassword === 0}
        onClick={() => window.print()}
      >
        <Printer className="size-4" aria-hidden="true" />
        Cetak
      </Button>

      <AlertDialog open={konfirmasi !== null} onOpenChange={(open) => !open && setKonfirmasi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {konfirmasi === "generate" ? "Buat password baru?" : "Kosongkan password kartu?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {konfirmasi === "generate"
                ? `Password lama ${jumlahSiswa} peserta di ${terpilih?.name ?? "kelas ini"} tidak bisa dipulihkan. Password baru 8 karakter (huruf kecil + angka) langsung tampil di kartu.`
                : "Password kartu yang tersimpan akan dihapus, kartu tidak bisa dicetak ulang sampai password dibuat lagi. Password login siswa tidak berubah."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                if (konfirmasi) jalankan(konfirmasi)
              }}
            >
              {isPending ? "Memproses..." : konfirmasi === "generate" ? "Ya, buat password" : "Ya, kosongkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
