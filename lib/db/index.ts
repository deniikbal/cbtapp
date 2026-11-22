import { neon } from "@neondatabase/serverless"
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const url = process.env.DATABASE_URL

// Neon dipanggil lewat HTTP (tanpa koneksi TCP). Postgres lokal memakai pool TCP biasa.
// Kedua driver punya API query yang sama; tipe disamakan supaya tidak jadi union type.
export const db = (
  url.includes(".neon.tech")
    ? drizzleNeon(neon(url), { schema })
    : drizzlePg(new Pool({ connectionString: url, max: 20 }), { schema })
) as unknown as NeonHttpDatabase<typeof schema>
