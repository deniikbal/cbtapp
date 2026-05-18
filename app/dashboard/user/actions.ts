"use server"

import { randomUUID } from "node:crypto"

import { hashPassword } from "better-auth/crypto"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, user } from "@/lib/db/schema"

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase()
}

function revalidateUserPaths() {
  revalidatePath("/dashboard/user")
}

export async function createUser(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const email = normalizeEmail(formData.get("email"))
  const password = String(formData.get("password") ?? "").trim()
  const emailVerified = formData.get("emailVerified") === "on"

  if (!name || !email || !password) {
    throw new Error("Nama, email, dan password wajib diisi.")
  }

  if (password.length < 8) {
    throw new Error("Password minimal 8 karakter.")
  }

  const id = randomUUID()
  const passwordHash = await hashPassword(password)

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name,
      email,
      emailVerified,
    })

    await tx.insert(account).values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: passwordHash,
    })
  })

  revalidateUserPaths()
}

export async function updateUser(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const email = normalizeEmail(formData.get("email"))
  const password = String(formData.get("password") ?? "").trim()
  const emailVerified = formData.get("emailVerified") === "on"

  if (!id || !name || !email) {
    throw new Error("Data user tidak lengkap.")
  }

  if (password && password.length < 8) {
    throw new Error("Password minimal 8 karakter.")
  }

  await db.transaction(async (tx) => {
    await tx.update(user).set({ name, email, emailVerified, updatedAt: new Date() }).where(eq(user.id, id))

    if (password) {
      const passwordHash = await hashPassword(password)
      const existingCredential = await tx
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
        .limit(1)

      if (existingCredential[0]) {
        await tx
          .update(account)
          .set({ password: passwordHash, updatedAt: new Date() })
          .where(eq(account.id, existingCredential[0].id))
      } else {
        await tx.insert(account).values({
          id: randomUUID(),
          userId: id,
          accountId: id,
          providerId: "credential",
          password: passwordHash,
        })
      }
    }
  })

  revalidateUserPaths()
}

export async function deleteUser(id: string) {
  if (!id) throw new Error("ID user tidak valid.")

  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user.id === id) {
    throw new Error("User yang sedang login tidak dapat dihapus.")
  }

  await db.delete(user).where(eq(user.id, id))

  revalidateUserPaths()
}
