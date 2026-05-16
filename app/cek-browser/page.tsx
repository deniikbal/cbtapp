import { Copy, Smartphone } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CekBrowserPage() {
  const headerStore = await headers()
  const userAgent = headerStore.get("user-agent") ?? "User-Agent tidak ditemukan"

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Cek Browser / ExamBro</CardTitle>
              <CardDescription>Buka halaman ini dari aplikasi ExamBro, lalu salin User-Agent atau keyword uniknya.</CardDescription>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="size-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">User-Agent</Badge>
              <span className="text-xs text-muted-foreground">Salin teks di bawah ini</span>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/50 p-4 text-sm leading-relaxed">{userAgent}</pre>
          </div>
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            Tips: biasanya cukup simpan keyword unik seperti <span className="font-mono text-foreground">exambro</span> atau <span className="font-mono text-foreground">exam</span>, bukan seluruh User-Agent.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="gap-2" render={<Link href="/" />}>Kembali Login</Button>
            <Button className="gap-2" render={<Link href="/dashboard/pengaturan" />}><Copy className="size-4" />Buka Pengaturan</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
