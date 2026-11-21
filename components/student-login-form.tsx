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
          <BookOpenCheck className="size-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">{APP_NAME}</CardTitle>
        <CardDescription className="text-[14px] sm:text-xs">{APP_TAGLINE}</CardDescription>
        <CardDescription className="text-[14px] sm:text-xs">Masuk menggunakan Username dan password dari Panitia.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nis" className="text-[14px] sm:text-xs">Username</Label>
            <Input
              id="nis"
              name="nis"
              placeholder="Masukkan Username"
              className="h-11 text-[14px] placeholder:text-muted-foreground sm:h-7 sm:text-xs/relaxed"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[14px] sm:text-xs">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="******"
                className="h-11 pr-10 text-[14px] placeholder:text-muted-foreground sm:h-7 sm:text-xs/relaxed"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 sm:size-6"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="h-11 w-full gap-2 sm:h-7" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
            {pending ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
