"use client"

import { useActionState } from "react"
import { Check, Loader2, Save } from "lucide-react"

import type { IdentitasLaporan, IdentitasResult } from "@/app/guru/dashboard/actions"
import { simpanIdentitasLaporan } from "@/app/guru/dashboard/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const awal: IdentitasResult = { ok: false, message: "" }

export function GuruIdentitasForm({ identitas }: { identitas: IdentitasLaporan }) {
  const [state, aksi, pending] = useActionState(simpanIdentitasLaporan, awal)
  const nilai = state.values ?? identitas

  return (
    <form action={aksi} className="grid gap-3 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="grid gap-1">
        <Label htmlFor="namaTes" className="text-[11px]">
          Nama tes
        </Label>
        <Input
          id="namaTes"
          name="namaTes"
          defaultValue={nilai.namaTes}
          placeholder="Asesmen Sumatif Akhir Semester"
          className="h-8 text-xs"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="tahunPelajaran" className="text-[11px]">
          Tahun pelajaran
        </Label>
        <Input
          id="tahunPelajaran"
          name="tahunPelajaran"
          defaultValue={nilai.tahunPelajaran}
          placeholder="2025/2026"
          className="h-8 text-xs"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="semester" className="text-[11px]">
          Semester
        </Label>
        <select
          id="semester"
          name="semester"
          defaultValue={nilai.semester}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">-</option>
          <option value="Ganjil">Ganjil</option>
          <option value="Genap">Genap</option>
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="kkm" className="text-[11px]">
          KKM
        </Label>
        <Input
          id="kkm"
          name="kkm"
          type="number"
          min={0}
          max={100}
          defaultValue={nilai.kkm}
          className="h-8 text-xs"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="kepalaSekolah" className="text-[11px]">
          Kepala sekolah
        </Label>
        <Input
          id="kepalaSekolah"
          name="kepalaSekolah"
          defaultValue={nilai.kepalaSekolah}
          placeholder="Nama lengkap & gelar"
          className="h-8 text-xs"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="nipKepalaSekolah" className="text-[11px]">
          NIP kepala sekolah
        </Label>
        <Input
          id="nipKepalaSekolah"
          name="nipKepalaSekolah"
          defaultValue={nilai.nipKepalaSekolah}
          placeholder="197109291995121002"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={pending} className="h-7 gap-1 px-2 text-[11px]">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : state.ok ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
          Simpan identitas
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-[11px] text-emerald-600" : "text-[11px] text-destructive"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  )
}
