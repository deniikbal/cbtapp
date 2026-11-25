import { and, eq } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { StudentLoginForm } from "@/components/student-login-form"
import { db } from "@/lib/db"
import { students } from "@/lib/db/schema"
import { canAccessStudentArea } from "@/lib/exam-browser"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function Page() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  if (!(await canAccessStudentArea(headerStore.get("user-agent") ?? ""))) {
    redirect("/blocked")
  }

  // Cookie siswa hanya dianggap sah bila siswanya masih ada & aktif. Tanpa cek ini,
  // cookie sisa lama membuat / -> /siswa/dashboard -> / ... berputar tanpa henti.
  const studentId = cookieStore.get("student_id")?.value
  if (studentId && UUID.test(studentId)) {
    const [siswa] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.active, true)))
      .limit(1)

    if (siswa) redirect("/siswa/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <StudentLoginForm simulasi={process.env.SIMULASI_PASSWORD_NIS === "1"} />
    </main>
  )
}
