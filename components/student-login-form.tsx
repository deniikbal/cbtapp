"use client"

import { useActionState } from "react"
import { BookOpenCheck, Loader2, LogIn } from "lucide-react"

import { loginStudent, type StudentLoginState } from "@/app/siswa/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: StudentLoginState = {}

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState(loginStudent, initialState)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpenCheck className="size-6" />
        </div>
        <CardTitle className="text-xl">Login Siswa</CardTitle>
        <CardDescription>Masuk menggunakan NIS dan password dari admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nis">NIS</Label>
            <Input id="nis" name="nis" placeholder="2026001" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
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
