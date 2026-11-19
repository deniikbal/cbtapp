// Load test: concurrent GETs + concurrent neon-http queries
const BASE = "http://127.0.0.1:3006"

async function benchHttp(conc, n) {
  const start = Date.now()
  let ok = 0, err = 0
  async function worker() {
    for (let i = 0; i < n; i++) {
      try {
        const r = await fetch(BASE + "/siswa/login")
        if (r.status < 500) ok++; else err++
      } catch { err++ }
    }
  }
  await Promise.all(Array.from({ length: conc }, worker))
  const dt = (Date.now() - start) / 1000
  console.log(`HTTP GET /siswa/login  conc=${conc} total=${conc * n} ok=${ok} err=${err} waktu=${dt.toFixed(1)}s rps=${((conc * n) / dt).toFixed(0)}`)
}

async function benchDb(conc) {
  const env = await import("node:fs")
  const url = env.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)"?/)[1]
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(url)
  const start = Date.now()
  let err = 0
  const results = await Promise.all(Array.from({ length: conc }, () =>
    sql`select count(*)::int as c from students`.catch(() => { err++; return null })
  ))
  const dt = (Date.now() - start) / 1000
  const c = results[0]?.[0]?.c
  console.log(`DB query  conc=${conc} err=${err} waktu=${dt.toFixed(2)}s (siswa=${c})`)
}

(async () => {
  await benchHttp(50, 2)
  await benchHttp(200, 2)
  await benchDb(50)
  await benchDb(200)
  await benchDb(500)
})()
