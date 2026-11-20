"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, Save, Upload } from "lucide-react"
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

  function handleSubmit(formData: FormData) {
    formData.set("existingLogoUrl", settings.logoUrl)
    formData.set("existingSignatureUrl", settings.signatureUrl)
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
          <Label htmlFor="academicYear">Tahun Pelajaran</Label>
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
      <Button type="submit" size="sm" className="gap-2" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Simpan Pengaturan Kartu
      </Button>
    </form>
  )
}
