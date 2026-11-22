import { readFile } from "node:fs/promises"
import path from "node:path"

// Folder public/ di-cache Next saat start, jadi berkas unggahan baru akan 404
// sampai server di-restart. Route ini membaca disk langsung agar aman.
const TIPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  pdf: "application/pdf",
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segmen } = await params
  const berkas = path.join(process.cwd(), "public", "uploads", ...segmen)
  if (!berkas.startsWith(path.join(process.cwd(), "public", "uploads"))) {
    return new Response("Tidak diizinkan", { status: 403 })
  }

  try {
    const isi = await readFile(berkas)
    const ext = path.extname(berkas).slice(1).toLowerCase()
    return new Response(new Uint8Array(isi), {
      headers: {
        "content-type": TIPE[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    })
  } catch {
    return new Response("Berkas tidak ditemukan", { status: 404 })
  }
}
