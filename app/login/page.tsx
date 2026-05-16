import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { auth } from "@/lib/auth"

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <AuthForm />
    </main>
  )
}
