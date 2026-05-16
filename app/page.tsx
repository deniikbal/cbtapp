import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { StudentLoginForm } from "@/components/student-login-form"

export default async function Page() {
  const cookieStore = await cookies()

  if (cookieStore.get("student_id")?.value) {
    redirect("/siswa/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <StudentLoginForm />
    </main>
  )
}
