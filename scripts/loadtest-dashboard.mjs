// Load test dashboard siswa (halaman setelah login) dengan cookie uji
import fs from "node:fs"

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)"?/)[1]
const { neon } = await import("@neondatabase/serverless")
const sql = neon(url)
const rows = await sql`select id from students where active = true limit 1`
const sid = rows[0].id
const cookie = `student_id=${sid}`

const BASE = "http://127.0.0.1:3006"

async function bench(conc, n) {
  const start = Date.now()
  let ok = 0, err = 0, statuses = {}
  async function worker() {
    for (let i = 0; i < n; i++) {
      try {
        const r = await fetch(BASE + "/siswa/dashboard", { headers: { cookie } })
        statuses[r.status] = (statuses[r.status] || 0) + 1
        if (r.status === 200) ok++; else err++
      } catch { err++ }
    }
  }
  await Promise.all(Array.from({ length: conc }, worker))
  const dt = (Date.now() - start) / 1000
  console.log(`GET /siswa/dashboard conc=${conc} total=${conc * n} ok=${ok} err=${err} status=${JSON.stringify(statuses)} waktu=${dt.toFixed(1)}s rps=${((conc * n) / dt).toFixed(0)}`)
}

(async () => {
  await bench(50, 1)
  await bench(200, 1)
  await bench(500, 1)
})()
