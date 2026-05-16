"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function logoutStudent() {
  const cookieStore = await cookies()
  cookieStore.set("student_id", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })
  redirect("/")
}
