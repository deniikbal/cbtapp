import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { TeacherLoginForm } from "@/components/teacher-login-form"

export default async function GuruLoginPage() {
  const cookieStore = await cookies()

  if (cookieStore.get("teacher_id")?.value) {
    redirect("/guru/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <TeacherLoginForm />
    </main>
  )
}
