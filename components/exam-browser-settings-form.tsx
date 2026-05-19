"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, Settings } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { updateExamBrowserSettings } from "@/app/dashboard/pengaturan/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExamBrowserSettings } from "@/lib/exam-browser"

type ExamBrowserSettingsFormProps = {
  settings: ExamBrowserSettings
}

export function ExamBrowserSettingsForm({ settings }: ExamBrowserSettingsFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateExamBrowserSettings(formData)
        toast.success("Pengaturan berhasil disimpan.")
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan pengaturan."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <form
      key={`${settings.forceExamBrowser}-${settings.allowedUserAgentPattern}-${settings.blockedMessage}-${settings.downloadUrl}`}
      action={handleSubmit}
      className="space-y-5"
    >
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
        <input id="forceExamBrowser" name="forceExamBrowser" type="checkbox" defaultChecked={settings.forceExamBrowser} disabled={isPending} className="mt-1 size-4 rounded border-border" />
        <div className="space-y-1">
          <Label htmlFor="forceExamBrowser">Wajib menggunakan ExamBro</Label>
          <p className="text-sm text-muted-foreground">Jika aktif, Chrome/browser biasa akan diarahkan ke halaman blokir.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedUserAgentPattern">Pola User-Agent yang diizinkan</Label>
        <Textarea id="allowedUserAgentPattern" name="allowedUserAgentPattern" defaultValue={settings.allowedUserAgentPattern} placeholder="Contoh: exambro&#10;exam browser" rows={5} disabled={isPending} />
        <p className="text-xs text-muted-foreground">Bisa lebih dari satu, pisahkan dengan baris baru atau koma. Gunakan keyword unik, jangan User-Agent lengkap.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blockedMessage">Pesan saat diblokir</Label>
        <Textarea id="blockedMessage" name="blockedMessage" defaultValue={settings.blockedMessage} rows={3} disabled={isPending} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="downloadUrl">Link Play Store ExamBro</Label>
        <Input id="downloadUrl" name="downloadUrl" defaultValue={settings.downloadUrl} placeholder="https://play.google.com/store/apps/details?id=..." disabled={isPending} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button nativeButton={false} variant="outline" className="gap-2" disabled={isPending} render={<Link href="/cek-browser" />}>Cek User-Agent</Button>
        <Button type="submit" className="gap-2" disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}{isPending ? "Menyimpan..." : "Simpan Pengaturan"}</Button>
      </div>
    </form>
  )
}
