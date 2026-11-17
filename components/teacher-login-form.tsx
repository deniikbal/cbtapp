"use client"

import { useActionState, useState } from "react"
import { BookOpenCheck, Eye, EyeOff, Loader2, LogIn } from "lucide-react"

import { loginGuru, type GuruLoginState } from "@/app/guru/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"

const initialState: GuruLoginState = {}

export function TeacherLoginForm() {
  const [state, formAction, pending] = useActionState(loginGuru, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpenCheck className="size-6" />
        </div>
        <CardTitle className="text-xl">{APP_NAME}</CardTitle>
        <CardDescription>{APP_TAGLINE}</CardDescription>
        <CardDescription>Area guru — masuk dengan NIP dan password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nip">NIP</Label>
            <Input
              id="nip"
              name="nip"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Masukan NIP"
              className="placeholder:text-muted-foreground/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="******"
                className="pr-10 placeholder:text-muted-foreground/60"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {state.error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Masuk
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Lupa password? Hubungi admin/panitia untuk pengaturan ulang.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
