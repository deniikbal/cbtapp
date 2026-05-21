"use client"

import { useActionState, useState } from "react"
import { BookOpenCheck, Eye, EyeOff, Loader2, LogIn } from "lucide-react"

import { loginStudent, type StudentLoginState } from "@/app/siswa/login/actions"
import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: StudentLoginState = {}

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState(loginStudent, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpenCheck className="size-6" />
        </div>
        <CardTitle className="text-xl">{APP_NAME}</CardTitle>
        <CardDescription>{APP_TAGLINE}</CardDescription>
        <CardDescription>Masuk menggunakan Username dan password dari Panitia.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nis">Username</Label>
            <Input
              id="nis"
              name="nis"
              placeholder="Masukan Username"
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

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {pending ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
