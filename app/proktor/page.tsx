import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"

import { loginProktor } from "@/app/proktor/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

export default async function ProktorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const cookieStore = await cookies()
  if (cookieStore.get("proctor_id")?.value) redirect("/proktor/dashboard")

  const { error } = await searchParams

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm rounded-sm">
        <CardHeader className="gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-primary/10 p-1.5 text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <CardTitle>Login Proktor</CardTitle>
          </div>
          <CardDescription>Masuk dengan NIP. Tanpa password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginProktor} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                name="nip"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Contoh: 198711232022211008"
                required
                className="h-11"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full">
              Masuk
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Login guru: <Link href="/guru" className="underline underline-offset-4">/guru</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
