// Uji beban login siswa lewat jalur asli (server action Next.js), bukan sekadar GET halaman.
// Hanya percobaan login dengan password yang benar dari kolom kartuPassword: tidak ada satu pun
// operasi tulis, jadi hasil ujian/data siswa tidak tersentuh.
//
// Pakai: node scripts/uji-beban-login.mjs [jumlah] [konkurensi]
//   node scripts/uji-beban-login.mjs 1421 100   -> 1.421 login, 100 bersamaan (≈15 menit serentak)
import fs from "node:fs"

const BASE = process.env.UJI_BASE ?? "http://127.0.0.1:3006"
const TOTAL = Number(process.argv[2] ?? 300)
const CONC = Number(process.argv[3] ?? 50)

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")] })
)

const { default: pg } = await import("pg")
const db = new pg.Client({ connectionString: env.DATABASE_URL })
await db.connect()

const { rows: siswa } = await db.query(
  `select nis, "kartuPassword" as pass from students
   where active and "kartuPassword" is not null and "kartuPassword" <> ''
   order by random() limit $1`, [TOTAL]
)
if (siswa.length === 0) { console.error("tidak ada siswa dengan password kartu"); process.exit(1) }

// Ambil field $ACTION_* sekali; id aksi stabil per build, jadi semua pekerja memakainya.
const html = await fetch(BASE + "/").then((r) => r.text())
const aksi = [...html.matchAll(/name="(\$ACTION[^"]*)"(?: value="([^"]*)")?/g)]
  .map(([, n, v]) => [n, (v ?? "").replaceAll("&quot;", '"')])
if (!aksi.length) { console.error("field $ACTION_* tidak ditemukan di halaman login"); process.exit(1) }

const lat = []
let ok = 0, redirect = 0, gagal = 0
const kodeGagal = {}
const connLog = []
const pemantau = setInterval(async () => {
  const r = await db.query("select count(*)::int c from pg_stat_activity where datname=current_database()")
  connLog.push(r.rows[0].c)
}, 2000)

const mulai = Date.now()
let berjalan = 0
async function pekerja(i) {
  while (i < siswa.length) {
    const s = siswa[i]
    i += CONC
    const fd = new FormData()
    for (const [n, v] of aksi) fd.append(n, v)
    fd.append("nis", s.nis.trim())
    fd.append("password", s.pass)
    const t0 = performance.now()
    try {
      const r = await fetch(BASE + "/", { method: "POST", body: fd, redirect: "manual" })
      lat.push(performance.now() - t0)
      if (r.status >= 500) { gagal++; kodeGagal[r.status] = (kodeGagal[r.status] ?? 0) + 1 }
      else if (r.status === 200 || r.status === 303 || r.status === 307) {
        const teks = await r.text()
        // Login sukses: server action mengalihkan ke dashboard; gagal: pesan error di HTML.
        if (/\/siswa\/dashboard|NEXT_REDIRECT/.test(teks) || r.status >= 300) redirect++
        else { gagal++; kodeGagal["ditolak"] = (kodeGagal["ditolak"] ?? 0) + 1 }
        ok++
      } else { gagal++; kodeGagal[r.status] = (kodeGagal[r.status] ?? 0) + 1 }
    } catch (e) { gagal++; kodeGagal[e.name] = (kodeGagal[e.name] ?? 0) + 1 }
  }
}

await Promise.all(Array.from({ length: CONC }, (_, k) => pekerja(k)))
clearInterval(pemantau)
const detik = (Date.now() - mulai) / 1000
lat.sort((a, b) => a - b)
const q = (p) => lat[Math.floor(lat.length * p)] ?? 0

console.log(`login total=${siswa.length} konkurensi=${CONC}`)
console.log(`waktu=${detik.toFixed(1)}s rps=${(siswa.length / detik).toFixed(1)}`)
console.log(`sukses=${ok} gagal=${gagal} ${JSON.stringify(kodeGagal)}`)
console.log(`latensi p50=${q(0.5).toFixed(0)}ms p95=${q(0.95).toFixed(0)}ms p99=${q(0.99).toFixed(0)}ms maks=${lat.at(-1)?.toFixed(0)}ms`)
if (connLog.length) console.log(`koneksi DB selama uji: maks=${Math.max(...connLog)} rata=${(connLog.reduce((a, b) => a + b, 0) / connLog.length).toFixed(0)}`)
await db.end()
