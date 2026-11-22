"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { saveCardSettings, type CardSettings } from "@/app/dashboard/peserta/kartu/card-settings-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CardSettingsForm({ settings }: { settings: CardSettings }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl)
  const [sigPreview, setSigPreview] = useState(settings.signatureUrl)
  const [sigX, setSigX] = useState(settings.sigX)
  const [sigY, setSigY] = useState(settings.sigY)
  const [sigSize, setSigSize] = useState(settings.sigSize)
  const [nameX, setNameX] = useState(settings.nameX)

  function handleSubmit(formData: FormData) {
    formData.set("existingLogoUrl", settings.logoUrl)
    formData.set("existingSignatureUrl", settings.signatureUrl)
    formData.set("sigX", String(sigX))
    formData.set("sigY", String(sigY))
    formData.set("sigSize", String(sigSize))
    formData.set("nameX", String(nameX))
    startTransition(async () => {
      await saveCardSettings(formData)
      toast.success("Pengaturan kartu disimpan.")
      router.refresh()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-sm border bg-muted/30 p-4 print:hidden">
      <p className="text-sm font-semibold">Pengaturan Kartu Ujian</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="schoolName">Nama Sekolah</Label>
          <Input id="schoolName" name="schoolName" defaultValue={settings.schoolName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="examTitle">Judul Ujian</Label>
          <Input id="examTitle" name="examTitle" defaultValue={settings.examTitle} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="academicYear">Tahun Ajaran</Label>
          <Input id="academicYear" name="academicYear" defaultValue={settings.academicYear} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="principalName">Nama Kepala Sekolah</Label>
          <Input id="principalName" name="principalName" defaultValue={settings.principalName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="principalNip">NIP Kepala Sekolah</Label>
          <Input id="principalNip" name="principalNip" defaultValue={settings.principalNip} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Logo Sekolah</Label>
          <div className="flex items-center gap-3">
            {logoPreview && <img src={logoPreview} alt="Logo" className="size-12 object-contain" />}
            <Input type="file" name="logo" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogoPreview(URL.createObjectURL(f)) }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tanda Tangan Kepala Sekolah</Label>
          <div className="flex items-center gap-3">
            {sigPreview && <img src={sigPreview} alt="TTD" className="h-12 object-contain" />}
            <Input type="file" name="signature" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSigPreview(URL.createObjectURL(f)) }} />
          </div>
        </div>
      </div>

      {/* ─── Live position tuner ─── */}
      <div className="space-y-3 rounded-sm border bg-background p-3">
        <p className="text-sm font-semibold">Atur Posisi TTD (live preview)</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Geser Horizontal (X): {sigX}px</Label>
              <input type="range" min={-60} max={60} value={sigX} onChange={(e) => setSigX(Number(e.target.value))} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Geser Vertikal (Y): {sigY}px</Label>
              <input type="range" min={-60} max={60} value={sigY} onChange={(e) => setSigY(Number(e.target.value))} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ukuran TTD: {sigSize}px</Label>
              <input type="range" min={24} max={96} value={sigSize} onChange={(e) => setSigSize(Number(e.target.value))} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Geser Nama+NIP (X): {nameX}px</Label>
              <input type="range" min={-60} max={60} value={nameX} onChange={(e) => setNameX(Number(e.target.value))} className="w-full" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => { setSigX(0); setSigY(0); setSigSize(48); setNameX(0) }}>Reset posisi</Button>
          </div>
          {/* preview */}
          <div className="w-44 rounded-sm border bg-white p-2 text-[9px]">
            <p className="text-center text-muted-foreground">Kepala Sekolah,</p>
            <div className="relative mx-auto mt-2 h-24 w-40">
              <div className="absolute bottom-0 left-0 text-left" style={{ transform: `translateX(${nameX}px)` }}>
                <p className="font-semibold">{settings.principalName || "Nama Kepsek"}</p>
                <p className="text-[8px] text-muted-foreground">NIP. {settings.principalNip || "-"}</p>
              </div>
              {sigPreview && (
                <img
                  src={sigPreview}
                  alt="TTD"
                  className="absolute inset-0 h-full w-full object-contain opacity-90"
                  style={{ transform: `translate(${sigX}px, ${sigY}px)`, height: sigSize, width: "100%", margin: "auto" }}
                />
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Geser slider sampai TTD pas di atas nama. Preview di kanan mendekati hasil cetak. Simpan untuk menerapkan ke semua kartu.</p>
      </div>

      <Button type="submit" size="sm" className="gap-2" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        Simpan Pengaturan Kartu
      </Button>
    </form>
  )
}
