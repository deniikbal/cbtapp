import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { StudentLoginForm } from "@/components/student-login-form"
import { canAccessStudentArea } from "@/lib/exam-browser"

export default async function Page() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  if (!(await canAccessStudentArea(headerStore.get("user-agent") ?? ""))) {
    redirect("/blocked")
  }

  if (cookieStore.get("student_id")?.value) {
    redirect("/siswa/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <StudentLoginForm />
    </main>
  )
}
